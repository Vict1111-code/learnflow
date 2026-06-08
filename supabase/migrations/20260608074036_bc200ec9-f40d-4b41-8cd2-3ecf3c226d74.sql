CREATE TABLE public.saved_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  goal_id uuid REFERENCES public.learning_goals(id) ON DELETE SET NULL,
  title text NOT NULL,
  url text NOT NULL,
  type text NOT NULL DEFAULT 'article',
  source text,
  description text,
  tags text[] NOT NULL DEFAULT '{}',
  concept_ids text[] NOT NULL DEFAULT '{}',
  concept_names text[] NOT NULL DEFAULT '{}',
  rationale text,
  notes text,
  is_free boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, url)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_resources TO authenticated;
GRANT ALL ON public.saved_resources TO service_role;

ALTER TABLE public.saved_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their saved resources"
  ON public.saved_resources FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER saved_resources_updated_at
  BEFORE UPDATE ON public.saved_resources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX saved_resources_user_idx ON public.saved_resources(user_id, created_at DESC);
CREATE INDEX saved_resources_tags_idx ON public.saved_resources USING gin(tags);