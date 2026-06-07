
-- 1. mentor_tasks UPDATE WITH CHECK to lock identifiers
DROP POLICY IF EXISTS "Mentor or mentee can update task" ON public.mentor_tasks;
CREATE POLICY "Mentor or mentee can update task"
ON public.mentor_tasks
FOR UPDATE
USING (auth.uid() = mentor_id OR auth.uid() = mentee_id)
WITH CHECK (
  (auth.uid() = mentor_id OR auth.uid() = mentee_id)
  AND mentor_id = (SELECT mentor_id FROM public.mentor_tasks t WHERE t.id = mentor_tasks.id)
  AND mentee_id = (SELECT mentee_id FROM public.mentor_tasks t WHERE t.id = mentor_tasks.id)
);

-- 2. study_groups: restrict SELECT to authenticated users
DROP POLICY IF EXISTS "Groups viewable by everyone" ON public.study_groups;
CREATE POLICY "Groups viewable by authenticated"
ON public.study_groups
FOR SELECT
TO authenticated
USING (true);

REVOKE SELECT ON public.study_groups FROM anon;

-- 3. avatars bucket: remove anonymous listing; public URLs still work via storage CDN
DROP POLICY IF EXISTS "Avatar images are publicly accessible" ON storage.objects;
CREATE POLICY "Authenticated can read avatars"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'avatars');

-- 4. Revoke EXECUTE from anon on sensitive SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.can_view_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_post_upvotes_count() FROM anon;
REVOKE EXECUTE ON FUNCTION public.update_user_streak() FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_xp_to_user(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_mentor_task() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_milestone_approval() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_linked_profiles() FROM anon;
REVOKE EXECUTE ON FUNCTION public.evaluate_user_achievements(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_xp_on_report() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_mentee_weekly_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.unlock_achievement(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_visible_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_focus_integrity(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.trg_evaluate_achievements() FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_owner_as_member() FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_upvote_from_reaction() FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_member(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_group_owner(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_linked_with(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_mentor_of(uuid, uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.add_xp_on_session() FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_mentee_timeline(uuid, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_mentor_resource() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mark_mentor_activity_read() FROM anon;
REVOKE EXECUTE ON FUNCTION public.log_mentor_comment() FROM anon;
REVOKE EXECUTE ON FUNCTION public.search_mentor_candidates(text) FROM anon;

-- 5. Realtime: require authentication to receive change events
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can receive realtime changes" ON realtime.messages;
CREATE POLICY "Authenticated can receive realtime changes"
ON realtime.messages
FOR SELECT
TO authenticated
USING (true);
