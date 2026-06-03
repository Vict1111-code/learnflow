
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE FUNCTION public.get_leaderboard()
RETURNS TABLE(id uuid, user_id uuid, name text, xp integer, level text, streak integer, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.id, p.user_id, p.name, p.xp, p.level, p.streak, p.avatar_url
  FROM public.profiles p
  WHERE COALESCE(p.email_verified, false) = true
  ORDER BY p.xp DESC NULLS LAST
  LIMIT 100
$$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.get_linked_profiles()
RETURNS TABLE(user_id uuid, name text, avatar_url text, xp integer, level text, streak integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.xp, p.level, p.streak
  FROM public.profiles p
  WHERE p.user_id IN (
    SELECT CASE WHEN ml.mentor_id = auth.uid() THEN ml.mentee_id ELSE ml.mentor_id END
    FROM public.mentor_links ml
    WHERE ml.mentor_id = auth.uid() OR ml.mentee_id = auth.uid()
  )
$$;

GRANT EXECUTE ON FUNCTION public.get_linked_profiles() TO authenticated;
