
DROP FUNCTION IF EXISTS public.get_leaderboard();

CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE(id uuid, user_id uuid, name text, xp integer, level text, streak integer)
LANGUAGE sql
STABLE
SET search_path = public
AS $function$
  SELECT p.id, p.user_id, p.name, p.xp, p.level, p.streak
  FROM public.profiles p
  ORDER BY p.xp DESC
  LIMIT 100
$function$;
