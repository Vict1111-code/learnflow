
-- ============================================================
-- COMMUNITY SYSTEM UPGRADE
-- ============================================================

-- 1. Reactions table (multi-reaction per user per post)
CREATE TABLE public.post_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL,
  user_id uuid NOT NULL,
  reaction_type text NOT NULL CHECK (reaction_type IN ('helpful','insightful','motivating','solved','upvote')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, user_id, reaction_type)
);

GRANT SELECT, INSERT, DELETE ON public.post_reactions TO authenticated;
GRANT SELECT ON public.post_reactions TO anon;
GRANT ALL ON public.post_reactions TO service_role;

ALTER TABLE public.post_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reactions viewable by everyone" ON public.post_reactions
  FOR SELECT USING (true);
CREATE POLICY "Authenticated users can react" ON public.post_reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can remove their reactions" ON public.post_reactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_post_reactions_post ON public.post_reactions(post_id);
CREATE INDEX idx_post_reactions_user ON public.post_reactions(user_id);

-- Keep community_posts.upvotes synced with 'upvote' reactions
CREATE OR REPLACE FUNCTION public.sync_upvote_from_reaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.reaction_type = 'upvote' THEN
    UPDATE public.community_posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' AND OLD.reaction_type = 'upvote' THEN
    UPDATE public.community_posts SET upvotes = GREATEST(0, upvotes - 1) WHERE id = OLD.post_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER trg_post_reactions_sync_upvote
AFTER INSERT OR DELETE ON public.post_reactions
FOR EACH ROW EXECUTE FUNCTION public.sync_upvote_from_reaction();

-- 2. Nested comments
ALTER TABLE public.post_comments ADD COLUMN parent_id uuid REFERENCES public.post_comments(id) ON DELETE CASCADE;
CREATE INDEX idx_post_comments_parent ON public.post_comments(parent_id);
CREATE INDEX idx_post_comments_post ON public.post_comments(post_id);

-- ============================================================
-- STUDY GROUPS
-- ============================================================

CREATE TABLE public.study_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  owner_id uuid NOT NULL,
  invite_code text NOT NULL UNIQUE DEFAULT substring(replace(gen_random_uuid()::text, '-', ''), 1, 8),
  topic text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.study_group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner','member')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved')),
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE TABLE public.group_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.study_groups(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  start_date date NOT NULL DEFAULT CURRENT_DATE,
  end_date date,
  target_metric text,
  target_value integer,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_groups TO authenticated;
GRANT SELECT ON public.study_groups TO anon;
GRANT ALL ON public.study_groups TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_group_members TO authenticated;
GRANT ALL ON public.study_group_members TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.group_challenges TO authenticated;
GRANT ALL ON public.group_challenges TO service_role;

ALTER TABLE public.study_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_challenges ENABLE ROW LEVEL SECURITY;

-- Security definer helpers to avoid RLS recursion
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_group_members
    WHERE group_id = _group_id AND user_id = _user_id AND status = 'approved'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_group_owner(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.study_groups WHERE id = _group_id AND owner_id = _user_id
  );
$$;

-- Groups are discoverable by anyone authenticated; members and challenges are restricted.
CREATE POLICY "Groups viewable by everyone" ON public.study_groups
  FOR SELECT USING (true);
CREATE POLICY "Authenticated can create groups" ON public.study_groups
  FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY "Owner can update group" ON public.study_groups
  FOR UPDATE USING (auth.uid() = owner_id);
CREATE POLICY "Owner can delete group" ON public.study_groups
  FOR DELETE USING (auth.uid() = owner_id);

CREATE POLICY "Members viewable by everyone" ON public.study_group_members
  FOR SELECT USING (true);
CREATE POLICY "Users can request to join" ON public.study_group_members
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "User can leave; owner can manage" ON public.study_group_members
  FOR DELETE USING (auth.uid() = user_id OR public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "Owner can approve members" ON public.study_group_members
  FOR UPDATE USING (public.is_group_owner(group_id, auth.uid()));

CREATE POLICY "Challenges viewable by members" ON public.group_challenges
  FOR SELECT USING (public.is_group_member(group_id, auth.uid()) OR public.is_group_owner(group_id, auth.uid()));
CREATE POLICY "Members can create challenges" ON public.group_challenges
  FOR INSERT WITH CHECK (auth.uid() = created_by AND (public.is_group_member(group_id, auth.uid()) OR public.is_group_owner(group_id, auth.uid())));
CREATE POLICY "Creator or owner can delete challenge" ON public.group_challenges
  FOR DELETE USING (auth.uid() = created_by OR public.is_group_owner(group_id, auth.uid()));

-- Auto-add owner as approved member on group creation
CREATE OR REPLACE FUNCTION public.add_owner_as_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.study_group_members (group_id, user_id, role, status)
  VALUES (NEW.id, NEW.owner_id, 'owner', 'approved')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_study_groups_add_owner
AFTER INSERT ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.add_owner_as_member();

CREATE TRIGGER trg_study_groups_updated_at
BEFORE UPDATE ON public.study_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- FEED HELPERS: top contributors + trending topics
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_top_contributors(_limit int DEFAULT 5)
RETURNS TABLE(user_id uuid, name text, avatar_url text, post_count bigint, reaction_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url,
    COALESCE(pc.cnt, 0) AS post_count,
    COALESCE(rc.cnt, 0) AS reaction_count
  FROM public.profiles p
  LEFT JOIN (
    SELECT user_id, COUNT(*) cnt FROM public.community_posts
    WHERE created_at > now() - interval '14 days' GROUP BY user_id
  ) pc ON pc.user_id = p.user_id
  LEFT JOIN (
    SELECT cp.user_id, COUNT(*) cnt FROM public.post_reactions pr
    JOIN public.community_posts cp ON cp.id = pr.post_id
    WHERE pr.created_at > now() - interval '14 days'
    GROUP BY cp.user_id
  ) rc ON rc.user_id = p.user_id
  WHERE COALESCE(pc.cnt,0) + COALESCE(rc.cnt,0) > 0
  ORDER BY (COALESCE(pc.cnt,0)*2 + COALESCE(rc.cnt,0)) DESC
  LIMIT _limit;
$$;

CREATE OR REPLACE FUNCTION public.get_trending_topics(_limit int DEFAULT 8)
RETURNS TABLE(topic text, post_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT topic, COUNT(*)::bigint AS post_count
  FROM public.community_posts
  WHERE topic IS NOT NULL AND topic <> ''
    AND created_at > now() - interval '14 days'
  GROUP BY topic
  ORDER BY post_count DESC
  LIMIT _limit;
$$;
