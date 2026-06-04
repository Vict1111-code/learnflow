-- AI Assistant tables
CREATE TABLE public.ai_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL, -- 'reflection' | 'explain' | 'quiz' | 'flashcards' | 'resources'
  input jsonb NOT NULL DEFAULT '{}'::jsonb,
  output jsonb NOT NULL DEFAULT '{}'::jsonb,
  topic text,
  goal_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_interactions TO authenticated;
GRANT ALL ON public.ai_interactions TO service_role;
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own ai interactions" ON public.ai_interactions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_interactions_user_created_idx ON public.ai_interactions(user_id, created_at DESC);

CREATE TABLE public.ai_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  deck_name text NOT NULL DEFAULT 'My Flashcards',
  front text NOT NULL,
  back text NOT NULL,
  topic text,
  source text, -- 'notes' | 'reflection' | 'manual'
  source_id uuid,
  difficulty text DEFAULT 'medium',
  review_count integer NOT NULL DEFAULT 0,
  last_reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_flashcards TO authenticated;
GRANT ALL ON public.ai_flashcards TO service_role;
ALTER TABLE public.ai_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own flashcards" ON public.ai_flashcards FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_flashcards_user_idx ON public.ai_flashcards(user_id, created_at DESC);

CREATE TABLE public.ai_quizzes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  topic text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium',
  question_types text[] NOT NULL DEFAULT ARRAY['mcq']::text[],
  questions jsonb NOT NULL DEFAULT '[]'::jsonb,
  score numeric,
  total_questions integer NOT NULL DEFAULT 0,
  answers jsonb,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_quizzes TO authenticated;
GRANT ALL ON public.ai_quizzes TO service_role;
ALTER TABLE public.ai_quizzes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own quizzes" ON public.ai_quizzes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX ai_quizzes_user_idx ON public.ai_quizzes(user_id, created_at DESC);