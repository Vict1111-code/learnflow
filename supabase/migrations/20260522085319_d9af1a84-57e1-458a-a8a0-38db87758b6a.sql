
-- 1. Restrict profile visibility
DROP POLICY IF EXISTS "Authenticated users can view profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() = _profile_user_id
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _profile_user_id AND p.is_public = true)
    OR EXISTS (
      SELECT 1 FROM public.mentor_links ml
      WHERE (ml.mentor_id = auth.uid() AND ml.mentee_id = _profile_user_id)
         OR (ml.mentee_id = auth.uid() AND ml.mentor_id = _profile_user_id)
    );
$$;

CREATE POLICY "Users view own, public, or linked profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (public.can_view_profile(user_id));

-- Safe search function for mentor lookup (returns minimal fields)
CREATE OR REPLACE FUNCTION public.search_mentor_candidates(query text)
RETURNS TABLE (user_id uuid, name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name
  FROM public.profiles p
  WHERE p.name ILIKE '%' || query || '%'
    AND p.user_id <> auth.uid()
  ORDER BY p.name
  LIMIT 10;
$$;

-- 2. Allow users to edit their own comments
CREATE POLICY "Users can update their own comments"
ON public.post_comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. Allow users to delete their own study sessions
CREATE POLICY "Users can delete their own sessions"
ON public.study_sessions
FOR DELETE
USING (auth.uid() = user_id);

-- 4. Atomic upvote counter via triggers
CREATE OR REPLACE FUNCTION public.update_post_upvotes_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.community_posts
      SET upvotes = upvotes + 1
      WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.community_posts
      SET upvotes = GREATEST(0, upvotes - 1)
      WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS post_upvotes_count_insert ON public.post_upvotes;
DROP TRIGGER IF EXISTS post_upvotes_count_delete ON public.post_upvotes;

CREATE TRIGGER post_upvotes_count_insert
AFTER INSERT ON public.post_upvotes
FOR EACH ROW EXECUTE FUNCTION public.update_post_upvotes_count();

CREATE TRIGGER post_upvotes_count_delete
AFTER DELETE ON public.post_upvotes
FOR EACH ROW EXECUTE FUNCTION public.update_post_upvotes_count();

-- 5. Harden add_xp_to_user — only allow modifying own XP, or when called from trigger context (no auth.uid())
CREATE OR REPLACE FUNCTION public.add_xp_to_user(p_user_id uuid, p_xp integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  current_xp INTEGER;
  new_xp INTEGER;
  new_level TEXT;
  caller uuid;
BEGIN
  caller := auth.uid();
  -- Allow when invoked from a trigger on behalf of the row owner, or by the user themselves
  IF caller IS NOT NULL AND caller <> p_user_id THEN
    RAISE EXCEPTION 'Access denied: cannot modify another user''s XP';
  END IF;

  SELECT xp INTO current_xp FROM public.profiles WHERE user_id = p_user_id;
  new_xp := COALESCE(current_xp, 0) + p_xp;

  new_level := CASE
    WHEN new_xp >= 15000 THEN 'Master'
    WHEN new_xp >= 5000 THEN 'Advanced'
    WHEN new_xp >= 1000 THEN 'Intermediate'
    ELSE 'Beginner'
  END;

  UPDATE public.profiles
  SET xp = new_xp, level = new_level
  WHERE user_id = p_user_id;
END;
$function$;
