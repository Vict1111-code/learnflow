
-- Phase 4: Study Sessions & Focus Tracking

-- Add new columns to study_sessions
ALTER TABLE public.study_sessions 
  ADD COLUMN goal_id uuid REFERENCES public.learning_goals(id) ON DELETE SET NULL,
  ADD COLUMN concept_id text,
  ADD COLUMN notes text,
  ADD COLUMN interruptions integer NOT NULL DEFAULT 0,
  ADD COLUMN target_duration_seconds integer;

-- Create focus_integrity_scores table
CREATE TABLE public.focus_integrity_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score numeric NOT NULL DEFAULT 0,
  consistency_score numeric NOT NULL DEFAULT 0,
  completion_rate numeric NOT NULL DEFAULT 0,
  interruption_score numeric NOT NULL DEFAULT 0,
  proof_quality_score numeric NOT NULL DEFAULT 0,
  calculated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.focus_integrity_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own focus scores"
  ON public.focus_integrity_scores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own focus scores"
  ON public.focus_integrity_scores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own focus scores"
  ON public.focus_integrity_scores FOR UPDATE
  USING (auth.uid() = user_id);

-- Function to calculate focus integrity score
CREATE OR REPLACE FUNCTION public.calculate_focus_integrity(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_consistency numeric := 0;
  v_completion numeric := 0;
  v_interruption numeric := 0;
  v_proof_quality numeric := 0;
  v_total numeric := 0;
  v_session_count integer;
  v_completed_sessions integer;
  v_avg_interruptions numeric;
  v_active_days integer;
  v_total_days integer := 7;
  v_avg_report_quality numeric;
BEGIN
  -- Consistency: how many of the last 7 days had study sessions
  SELECT COUNT(DISTINCT DATE(started_at))
  INTO v_active_days
  FROM study_sessions
  WHERE user_id = p_user_id
    AND started_at >= now() - interval '7 days';
  
  v_consistency := LEAST((v_active_days::numeric / v_total_days) * 100, 100);

  -- Completion rate: sessions that were completed (have ended_at) vs total
  SELECT COUNT(*), COUNT(CASE WHEN ended_at IS NOT NULL THEN 1 END)
  INTO v_session_count, v_completed_sessions
  FROM study_sessions
  WHERE user_id = p_user_id
    AND started_at >= now() - interval '30 days';
  
  IF v_session_count > 0 THEN
    v_completion := (v_completed_sessions::numeric / v_session_count) * 100;
  ELSE
    v_completion := 0;
  END IF;

  -- Interruption score: lower interruptions = higher score
  SELECT COALESCE(AVG(interruptions), 0)
  INTO v_avg_interruptions
  FROM study_sessions
  WHERE user_id = p_user_id
    AND started_at >= now() - interval '30 days'
    AND ended_at IS NOT NULL;
  
  v_interruption := GREATEST(100 - (v_avg_interruptions * 10), 0);

  -- Proof quality: average from daily reports (based on length of explanation as proxy)
  SELECT COALESCE(AVG(LENGTH(explanation)), 0)
  INTO v_avg_report_quality
  FROM daily_reports
  WHERE user_id = p_user_id
    AND created_at >= now() - interval '30 days';
  
  -- Normalize: 200+ chars = 100 score
  v_proof_quality := LEAST((v_avg_report_quality / 200) * 100, 100);

  -- Weighted total
  v_total := (v_consistency * 0.3) + (v_completion * 0.3) + (v_interruption * 0.2) + (v_proof_quality * 0.2);

  -- Upsert the score
  INSERT INTO focus_integrity_scores (user_id, score, consistency_score, completion_rate, interruption_score, proof_quality_score, calculated_at)
  VALUES (p_user_id, v_total, v_consistency, v_completion, v_interruption, v_proof_quality, now())
  ON CONFLICT (user_id) DO UPDATE SET
    score = EXCLUDED.score,
    consistency_score = EXCLUDED.consistency_score,
    completion_rate = EXCLUDED.completion_rate,
    interruption_score = EXCLUDED.interruption_score,
    proof_quality_score = EXCLUDED.proof_quality_score,
    calculated_at = EXCLUDED.calculated_at;

  RETURN jsonb_build_object(
    'score', ROUND(v_total, 1),
    'consistency', ROUND(v_consistency, 1),
    'completion', ROUND(v_completion, 1),
    'interruption', ROUND(v_interruption, 1),
    'proofQuality', ROUND(v_proof_quality, 1)
  );
END;
$$;

-- Add unique constraint on user_id for upsert
ALTER TABLE public.focus_integrity_scores ADD CONSTRAINT focus_integrity_scores_user_id_key UNIQUE (user_id);
