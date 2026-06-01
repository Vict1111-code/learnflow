ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mentor_resources;
ALTER PUBLICATION supabase_realtime ADD TABLE public.milestone_approvals;
ALTER TABLE public.mentor_comments REPLICA IDENTITY FULL;
ALTER TABLE public.mentor_tasks REPLICA IDENTITY FULL;
ALTER TABLE public.mentor_resources REPLICA IDENTITY FULL;
ALTER TABLE public.milestone_approvals REPLICA IDENTITY FULL;