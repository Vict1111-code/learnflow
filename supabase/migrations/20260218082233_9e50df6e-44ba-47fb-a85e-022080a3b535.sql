ALTER TABLE public.study_plans DROP CONSTRAINT study_plans_day_of_week_check;
ALTER TABLE public.study_plans ADD CONSTRAINT study_plans_day_of_week_check CHECK (day_of_week >= 0);