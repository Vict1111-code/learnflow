
-- Add is_public to profiles for portfolio sharing
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

-- Create mentor_links table
CREATE TABLE public.mentor_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(mentor_id, mentee_id)
);

ALTER TABLE public.mentor_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own mentor links"
  ON public.mentor_links FOR SELECT
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

CREATE POLICY "Users can create mentor links"
  ON public.mentor_links FOR INSERT
  WITH CHECK (auth.uid() = mentee_id);

CREATE POLICY "Mentors can update link status"
  ON public.mentor_links FOR UPDATE
  USING (auth.uid() = mentor_id);

CREATE POLICY "Users can delete their own links"
  ON public.mentor_links FOR DELETE
  USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);

-- Create portfolio_entries table
CREATE TABLE public.portfolio_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  entry_type text NOT NULL,
  title text NOT NULL,
  content text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.portfolio_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own portfolio entries"
  ON public.portfolio_entries FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public portfolios are viewable"
  ON public.portfolio_entries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = portfolio_entries.user_id
      AND profiles.is_public = true
    )
  );
