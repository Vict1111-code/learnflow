
-- Helper: is current user an active mentor of mentee?
CREATE OR REPLACE FUNCTION public.is_mentor_of(_mentor uuid, _mentee uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_links
    WHERE mentor_id = _mentor AND mentee_id = _mentee AND status = 'active'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_linked_with(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.mentor_links
    WHERE status = 'active'
      AND ((mentor_id = _a AND mentee_id = _b) OR (mentor_id = _b AND mentee_id = _a))
  );
$$;

-- Mentor comments
CREATE TABLE public.mentor_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  content text NOT NULL,
  context_type text,
  context_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_comments TO authenticated;
GRANT ALL ON public.mentor_comments TO service_role;
ALTER TABLE public.mentor_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked users can view comments" ON public.mentor_comments
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentors can create comments" ON public.mentor_comments
  FOR INSERT WITH CHECK (auth.uid() = mentor_id AND public.is_mentor_of(auth.uid(), mentee_id));
CREATE POLICY "Mentors can delete own comments" ON public.mentor_comments
  FOR DELETE USING (auth.uid() = mentor_id);

-- Mentor tasks
CREATE TABLE public.mentor_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'open',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_tasks TO authenticated;
GRANT ALL ON public.mentor_tasks TO service_role;
ALTER TABLE public.mentor_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked can view tasks" ON public.mentor_tasks
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentors create tasks" ON public.mentor_tasks
  FOR INSERT WITH CHECK (auth.uid() = mentor_id AND public.is_mentor_of(auth.uid(), mentee_id));
CREATE POLICY "Mentor or mentee can update task" ON public.mentor_tasks
  FOR UPDATE USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentors delete tasks" ON public.mentor_tasks
  FOR DELETE USING (auth.uid() = mentor_id);

-- Mentor recommended resources
CREATE TABLE public.mentor_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  title text NOT NULL,
  url text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mentor_resources TO authenticated;
GRANT ALL ON public.mentor_resources TO service_role;
ALTER TABLE public.mentor_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked can view resources" ON public.mentor_resources
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentors create resources" ON public.mentor_resources
  FOR INSERT WITH CHECK (auth.uid() = mentor_id AND public.is_mentor_of(auth.uid(), mentee_id));
CREATE POLICY "Mentors delete resources" ON public.mentor_resources
  FOR DELETE USING (auth.uid() = mentor_id);

-- Milestone approvals (auto-derived from concepts)
CREATE TABLE public.milestone_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id uuid NOT NULL,
  mentee_id uuid NOT NULL,
  goal_id uuid NOT NULL,
  concept_id text NOT NULL,
  concept_name text,
  note text,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (goal_id, concept_id, mentor_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.milestone_approvals TO authenticated;
GRANT ALL ON public.milestone_approvals TO service_role;
ALTER TABLE public.milestone_approvals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Linked can view approvals" ON public.milestone_approvals
  FOR SELECT USING (auth.uid() = mentor_id OR auth.uid() = mentee_id);
CREATE POLICY "Mentors create approvals" ON public.milestone_approvals
  FOR INSERT WITH CHECK (auth.uid() = mentor_id AND public.is_mentor_of(auth.uid(), mentee_id));
CREATE POLICY "Mentors delete approvals" ON public.milestone_approvals
  FOR DELETE USING (auth.uid() = mentor_id);

-- Weekly summary for mentee
CREATE OR REPLACE FUNCTION public.get_mentee_weekly_summary(_mentee uuid)
RETURNS TABLE(day date, sessions bigint, focus_minutes numeric, xp bigint, reflections bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  WITH days AS (
    SELECT generate_series(CURRENT_DATE - 6, CURRENT_DATE, '1 day'::interval)::date AS day
  )
  SELECT d.day,
    COALESCE(s.cnt, 0)::bigint AS sessions,
    COALESCE(s.mins, 0)::numeric AS focus_minutes,
    COALESCE(s.xp, 0)::bigint AS xp,
    COALESCE(r.cnt, 0)::bigint AS reflections
  FROM days d
  LEFT JOIN (
    SELECT DATE(started_at) AS day,
      COUNT(*) AS cnt,
      SUM(duration_seconds)/60.0 AS mins,
      SUM(xp_earned) AS xp
    FROM public.study_sessions
    WHERE user_id = _mentee AND ended_at IS NOT NULL
      AND started_at >= CURRENT_DATE - 6
    GROUP BY 1
  ) s ON s.day = d.day
  LEFT JOIN (
    SELECT DATE(created_at) AS day, COUNT(*) AS cnt
    FROM public.session_reflections
    WHERE user_id = _mentee AND created_at >= CURRENT_DATE - 6
    GROUP BY 1
  ) r ON r.day = d.day
  WHERE public.is_linked_with(auth.uid(), _mentee) OR auth.uid() = _mentee
  ORDER BY d.day;
$$;

-- Unified timeline
CREATE OR REPLACE FUNCTION public.get_mentee_timeline(_mentee uuid, _limit int DEFAULT 30)
RETURNS TABLE(event_type text, event_time timestamptz, title text, detail text, ref_id text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT * FROM (
    SELECT 'session'::text AS event_type, ended_at AS event_time,
      topic AS title,
      ('Studied ' || ROUND(duration_seconds/60.0) || ' min · +' || xp_earned || ' XP')::text AS detail,
      id::text AS ref_id
    FROM public.study_sessions
    WHERE user_id = _mentee AND ended_at IS NOT NULL
    UNION ALL
    SELECT 'reflection', created_at, COALESCE(LEFT(learned, 80), 'Reflection'),
      COALESCE('Focus: ' || focus_rating || '/5', 'Reflection logged'), id::text
    FROM public.session_reflections WHERE user_id = _mentee
    UNION ALL
    SELECT 'report', created_at, 'Daily Report',
      COALESCE(LEFT(understood, 80), 'Report'), id::text
    FROM public.daily_reports WHERE user_id = _mentee
    UNION ALL
    SELECT 'achievement', ua.unlocked_at, a.name, a.description, a.id::text
    FROM public.user_achievements ua
    JOIN public.achievements a ON a.id = ua.achievement_id
    WHERE ua.user_id = _mentee
    UNION ALL
    SELECT 'milestone', approved_at, COALESCE(concept_name, 'Milestone'),
      COALESCE(note, 'Approved by mentor'), id::text
    FROM public.milestone_approvals WHERE mentee_id = _mentee
  ) t
  WHERE public.is_linked_with(auth.uid(), _mentee) OR auth.uid() = _mentee
  ORDER BY event_time DESC
  LIMIT _limit;
$$;
