
-- =========================================
-- 1. AVATAR STORAGE BUCKET
-- =========================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'avatars'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- =========================================
-- 2. ACHIEVEMENTS CATALOG
-- =========================================
CREATE TABLE public.achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  icon text NOT NULL DEFAULT 'trophy',
  category text NOT NULL DEFAULT 'general',
  xp_reward integer NOT NULL DEFAULT 0,
  criteria_type text NOT NULL,
  criteria_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.achievements TO anon, authenticated;
GRANT ALL ON public.achievements TO service_role;

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Achievements are viewable by everyone"
ON public.achievements FOR SELECT USING (true);

-- =========================================
-- 3. USER ACHIEVEMENTS
-- =========================================
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  seen boolean NOT NULL DEFAULT false,
  UNIQUE (user_id, achievement_id)
);

CREATE INDEX idx_user_achievements_user ON public.user_achievements(user_id);

GRANT SELECT, INSERT, UPDATE ON public.user_achievements TO authenticated;
GRANT ALL ON public.user_achievements TO service_role;

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own achievements"
ON public.user_achievements FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users update own achievements"
ON public.user_achievements FOR UPDATE
USING (auth.uid() = user_id);

-- service_role inserts via triggers; no INSERT policy needed for users.

-- =========================================
-- 4. SEED ACHIEVEMENTS
-- =========================================
INSERT INTO public.achievements (code, name, description, icon, category, xp_reward, criteria_type, criteria_value) VALUES
  ('first_session',     'First Session',     'Complete your very first study session',      'play',    'sessions',   25,  'sessions_count',   1),
  ('streak_7',          '7-Day Streak',      'Maintain a 7-day study streak',                'flame',   'streak',     100, 'streak_days',      7),
  ('streak_30',         '30-Day Streak',     'A full month of consistent study',             'flame',   'streak',     500, 'streak_days',      30),
  ('focus_50h',         '50 Focus Hours',    'Accumulate 50 hours of focused study',         'clock',   'focus',      300, 'focus_hours',      50),
  ('community_helper',  'Community Helper',  'Receive 10 upvotes across your posts',         'users',   'community',  150, 'upvotes_received', 10),
  ('reflection_master', 'Reflection Master', 'Write 20 session reflections',                 'book',    'reflection', 200, 'reflections_count',20),
  ('first_reflection',  'First Reflection',  'Write your first session reflection',          'sparkles','reflection', 25,  'reflections_count',1),
  ('xp_100',            'Centurion',         'Earn your first 100 XP',                       'zap',     'xp',         0,   'xp_total',         100),
  ('level_intermediate','Level Up',          'Reach Intermediate level',                     'trending-up','level',   0,   'xp_total',         1000)
ON CONFLICT (code) DO NOTHING;

-- =========================================
-- 5. UNLOCK HELPER
-- =========================================
CREATE OR REPLACE FUNCTION public.unlock_achievement(p_user_id uuid, p_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ach_id uuid;
  v_reward integer;
  v_inserted boolean := false;
BEGIN
  SELECT id, xp_reward INTO v_ach_id, v_reward
  FROM public.achievements WHERE code = p_code;

  IF v_ach_id IS NULL THEN RETURN; END IF;

  INSERT INTO public.user_achievements (user_id, achievement_id)
  VALUES (p_user_id, v_ach_id)
  ON CONFLICT (user_id, achievement_id) DO NOTHING
  RETURNING true INTO v_inserted;

  IF v_inserted AND v_reward > 0 THEN
    PERFORM public.add_xp_to_user(p_user_id, v_reward);
  END IF;
END;
$$;

-- =========================================
-- 6. EVALUATION FUNCTION + TRIGGERS
-- =========================================
CREATE OR REPLACE FUNCTION public.evaluate_user_achievements(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions int;
  v_reflections int;
  v_focus_hours numeric;
  v_streak int;
  v_xp int;
  v_upvotes int;
BEGIN
  SELECT COUNT(*) INTO v_sessions FROM public.study_sessions
    WHERE user_id = p_user_id AND ended_at IS NOT NULL;

  SELECT COUNT(*) INTO v_reflections FROM public.session_reflections
    WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(duration_seconds),0)/3600.0 INTO v_focus_hours
    FROM public.study_sessions WHERE user_id = p_user_id;

  SELECT COALESCE(streak,0), COALESCE(xp,0) INTO v_streak, v_xp
    FROM public.profiles WHERE user_id = p_user_id;

  SELECT COALESCE(SUM(upvotes),0) INTO v_upvotes
    FROM public.community_posts WHERE user_id = p_user_id;

  IF v_sessions >= 1 THEN PERFORM public.unlock_achievement(p_user_id, 'first_session'); END IF;
  IF v_reflections >= 1 THEN PERFORM public.unlock_achievement(p_user_id, 'first_reflection'); END IF;
  IF v_reflections >= 20 THEN PERFORM public.unlock_achievement(p_user_id, 'reflection_master'); END IF;
  IF v_focus_hours >= 50 THEN PERFORM public.unlock_achievement(p_user_id, 'focus_50h'); END IF;
  IF v_streak >= 7 THEN PERFORM public.unlock_achievement(p_user_id, 'streak_7'); END IF;
  IF v_streak >= 30 THEN PERFORM public.unlock_achievement(p_user_id, 'streak_30'); END IF;
  IF v_xp >= 100 THEN PERFORM public.unlock_achievement(p_user_id, 'xp_100'); END IF;
  IF v_xp >= 1000 THEN PERFORM public.unlock_achievement(p_user_id, 'level_intermediate'); END IF;
  IF v_upvotes >= 10 THEN PERFORM public.unlock_achievement(p_user_id, 'community_helper'); END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.evaluate_user_achievements(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.trg_evaluate_achievements()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.evaluate_user_achievements(NEW.user_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER session_achievements_trg
AFTER INSERT OR UPDATE OF ended_at ON public.study_sessions
FOR EACH ROW EXECUTE FUNCTION public.trg_evaluate_achievements();

CREATE TRIGGER reflection_achievements_trg
AFTER INSERT ON public.session_reflections
FOR EACH ROW EXECUTE FUNCTION public.trg_evaluate_achievements();

CREATE TRIGGER report_achievements_trg
AFTER INSERT ON public.daily_reports
FOR EACH ROW EXECUTE FUNCTION public.trg_evaluate_achievements();

CREATE TRIGGER post_upvote_achievements_trg
AFTER INSERT OR DELETE ON public.post_upvotes
FOR EACH ROW EXECUTE FUNCTION public.trg_evaluate_achievements();
