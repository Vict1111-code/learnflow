
-- Add tags column to study_sessions for memory/search
ALTER TABLE public.study_sessions ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_started ON public.study_sessions(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_study_sessions_topic_trgm ON public.study_sessions USING gin (to_tsvector('simple', coalesce(topic,'') || ' ' || coalesce(notes,'')));

-- Reflections table
CREATE TABLE IF NOT EXISTS public.session_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  learned text,
  challenged text,
  revise text,
  focus_rating integer CHECK (focus_rating BETWEEN 1 AND 5),
  distractions text,
  mood text,
  tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.session_reflections TO authenticated;
GRANT ALL ON public.session_reflections TO service_role;

ALTER TABLE public.session_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own reflections" ON public.session_reflections
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users insert own reflections" ON public.session_reflections
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own reflections" ON public.session_reflections
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users delete own reflections" ON public.session_reflections
  FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_session_reflections_user_created ON public.session_reflections(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_session_reflections_search
  ON public.session_reflections
  USING gin (to_tsvector('simple', coalesce(learned,'') || ' ' || coalesce(challenged,'') || ' ' || coalesce(revise,'')));

CREATE TRIGGER trg_session_reflections_updated_at
  BEFORE UPDATE ON public.session_reflections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
