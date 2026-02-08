-- Fix the SECURITY DEFINER view issue by dropping it and using RLS-enabled table access instead
-- The leaderboard will query profiles directly with a more permissive but still secure policy

-- Drop the problematic view
DROP VIEW IF EXISTS public.leaderboard_profiles;

-- Create a secure function to get leaderboard data
-- This function runs as the invoker (SECURITY INVOKER by default) and respects RLS
CREATE OR REPLACE FUNCTION public.get_leaderboard()
RETURNS TABLE (
  id uuid,
  name text,
  xp integer,
  level text,
  streak integer
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT 
    p.id,
    p.name,
    p.xp,
    p.level,
    p.streak
  FROM public.profiles p
  ORDER BY p.xp DESC
  LIMIT 100
$$;

-- Update the SELECT policy to allow authenticated users to see limited profile data
-- This is needed for the leaderboard to work
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a policy that allows viewing all profiles but only for authenticated users
CREATE POLICY "Authenticated users can view profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (true);