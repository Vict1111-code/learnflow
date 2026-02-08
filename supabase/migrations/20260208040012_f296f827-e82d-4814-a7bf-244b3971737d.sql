-- Fix profiles table exposure: restrict SELECT to own profile only
-- This addresses the PUBLIC_USER_DATA security issue

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;

-- Create a new policy that only allows users to view their own profile
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);

-- For the leaderboard feature, we need a separate approach
-- Create a view with only non-sensitive data for leaderboard purposes
CREATE OR REPLACE VIEW public.leaderboard_profiles AS
SELECT 
  id,
  name,
  xp,
  level,
  streak
FROM public.profiles
ORDER BY xp DESC;

-- Grant access to the view for authenticated users
GRANT SELECT ON public.leaderboard_profiles TO authenticated;