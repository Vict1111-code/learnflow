
-- 1) Profiles: stop exposing email/email_verified via public/linked profiles.
-- Replace the broad SELECT policy with an owner-only policy.
DROP POLICY IF EXISTS "Users view own, public, or linked profiles" ON public.profiles;

CREATE POLICY "Users view own profile"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Harden can_view_profile (still used elsewhere): require authentication.
CREATE OR REPLACE FUNCTION public.can_view_profile(_profile_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      auth.uid() = _profile_user_id
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.user_id = _profile_user_id AND p.is_public = true)
      OR EXISTS (
        SELECT 1 FROM public.mentor_links ml
        WHERE (ml.mentor_id = auth.uid() AND ml.mentee_id = _profile_user_id)
           OR (ml.mentee_id = auth.uid() AND ml.mentor_id = _profile_user_id)
      )
    );
$$;

-- Provide a safe public/linked-profile read path that excludes sensitive columns.
-- Used by app code that needs to display other users' names/avatars (e.g. mentor lists).
CREATE OR REPLACE FUNCTION public.get_visible_profile(_profile_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  name text,
  username text,
  avatar_url text,
  focus text,
  level text,
  xp integer,
  streak integer,
  is_public boolean
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.username, p.avatar_url, p.focus, p.level, p.xp, p.streak, p.is_public
  FROM public.profiles p
  WHERE p.user_id = _profile_user_id
    AND public.can_view_profile(_profile_user_id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_visible_profile(uuid) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_visible_profile(uuid) TO authenticated;

-- 2) mentor_links: prevent mentor from reassigning mentor_id or mentee_id.
DROP POLICY IF EXISTS "Mentors can update link status" ON public.mentor_links;

CREATE POLICY "Mentors can update link status"
  ON public.mentor_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = mentor_id)
  WITH CHECK (
    auth.uid() = mentor_id
    AND mentor_id = (SELECT ml.mentor_id FROM public.mentor_links ml WHERE ml.id = mentor_links.id)
    AND mentee_id = (SELECT ml.mentee_id FROM public.mentor_links ml WHERE ml.id = mentor_links.id)
  );

-- 3) Lock down SECURITY DEFINER functions that should only be invoked internally.
-- Trigger-only functions: revoke all execute privileges.
REVOKE EXECUTE ON FUNCTION public.update_post_upvotes_count() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_user_streak()         FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_xp_on_report()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_xp_on_session()          FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user()            FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column()   FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Helper/RPC functions: signed-in users only (no anon).
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid)             FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.can_view_profile(uuid)             TO authenticated;

REVOKE EXECUTE ON FUNCTION public.search_mentor_candidates(text)     FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.search_mentor_candidates(text)     TO authenticated;

REVOKE EXECUTE ON FUNCTION public.calculate_focus_integrity(uuid)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.calculate_focus_integrity(uuid)    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_leaderboard()                  FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_leaderboard()                  TO authenticated;
