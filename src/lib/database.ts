import { supabase } from '@/integrations/supabase/client';

export interface Profile {
  id: string;
  user_id: string;
  name: string;
  avatar_url: string | null;
  focus: string | null;
  level: string;
  xp: number;
  streak: number;
  last_active_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface LearningGoal {
  id: string;
  user_id: string;
  goal_type: string;
  description: string;
  mastery_level: string;
  time_availability: string;
  custom_hours: number | null;
  duration_value: number | null;
  duration_unit: string | null;
  is_active: boolean;
  concepts?: any;
  resources?: any;
  created_at: string;
  updated_at: string;
}

export interface StudySession {
  id: string;
  user_id: string;
  topic: string;
  block_type: string;
  duration_seconds: number;
  started_at: string;
  ended_at: string | null;
  xp_earned: number;
  goal_id: string | null;
  concept_id: string | null;
  notes: string | null;
  interruptions: number;
  target_duration_seconds: number | null;
  created_at: string;
}

export interface DailyReport {
  id: string;
  user_id: string;
  report_date: string;
  studied: string;
  understood: string;
  explanation: string;
  exercises: string | null;
  confusing_concepts: string | null;
  xp_earned: number;
  created_at: string;
}

export interface CommunityPost {
  id: string;
  user_id: string;
  post_type: string;
  title: string;
  content: string;
  topic: string;
  upvotes: number;
  created_at: string;
  updated_at: string;
}

export interface FocusIntegrityScore {
  score: number;
  consistency: number;
  completion: number;
  interruption: number;
  proofQuality: number;
}

// Profile functions
export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function updateProfile(userId: string, updates: Partial<Profile>) {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Learning goals functions
export async function getLearningGoals(userId: string): Promise<LearningGoal[]> {
  const { data, error } = await supabase
    .from('learning_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function createLearningGoal(goal: Omit<LearningGoal, 'id' | 'created_at' | 'updated_at' | 'concepts' | 'resources'>) {
  const { data, error } = await supabase
    .from('learning_goals')
    .insert(goal)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function deleteLearningGoal(goalId: string, userId: string) {
  const { error: plansError } = await supabase
    .from('study_plans')
    .delete()
    .eq('goal_id', goalId)
    .eq('user_id', userId);
  
  if (plansError) throw plansError;
  
  const { error: goalError } = await supabase
    .from('learning_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);
  
  if (goalError) throw goalError;
}

export async function toggleGoalActive(goalId: string, userId: string, isActive: boolean) {
  const { data, error } = await supabase
    .from('learning_goals')
    .update({ is_active: isActive })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function setActiveGoal(goalId: string, userId: string) {
  const { error: deactivateError } = await supabase
    .from('learning_goals')
    .update({ is_active: false })
    .eq('user_id', userId);
  
  if (deactivateError) throw deactivateError;
  
  const { data, error } = await supabase
    .from('learning_goals')
    .update({ is_active: true })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getGoalProgress(goalId: string, userId: string): Promise<{ completed: number; total: number }> {
  const { data: plans, error } = await supabase
    .from('study_plans')
    .select('blocks')
    .eq('goal_id', goalId)
    .eq('user_id', userId);
  
  if (error) throw error;
  
  let completed = 0;
  let total = 0;
  
  (plans || []).forEach((plan) => {
    const blocks = (plan.blocks as any[]) || [];
    total += blocks.length;
    completed += blocks.filter((b: any) => b.completed).length;
  });
  
  return { completed, total };
}

export async function getActiveGoal(userId: string): Promise<LearningGoal | null> {
  const { data, error } = await supabase
    .from('learning_goals')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

export async function getStudyPlansWithGoals(userId: string) {
  const { data: plans, error: plansError } = await supabase
    .from('study_plans')
    .select('*, learning_goals(*)')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  
  if (plansError) throw plansError;
  return plans || [];
}

// Study sessions functions
export async function startStudySession(
  userId: string,
  topic: string,
  blockType: string,
  options?: { goalId?: string; conceptId?: string; notes?: string; targetDuration?: number }
) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      topic,
      block_type: blockType,
      goal_id: options?.goalId || null,
      concept_id: options?.conceptId || null,
      notes: options?.notes || null,
      target_duration_seconds: options?.targetDuration || null,
    } as any)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function heartbeatStudySession(sessionId: string, durationSeconds: number, interruptions?: number) {
  const updateData: any = { duration_seconds: durationSeconds };
  if (interruptions !== undefined) updateData.interruptions = interruptions;
  const { error } = await supabase
    .from('study_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .is('ended_at', null);
  if (error) throw error;
}


export async function endStudySession(sessionId: string, durationSeconds: number, interruptions?: number) {
  const updateData: any = {
    ended_at: new Date().toISOString(),
    duration_seconds: durationSeconds,
  };
  if (interruptions !== undefined) {
    updateData.interruptions = interruptions;
  }

  const { data, error } = await supabase
    .from('study_sessions')
    .update(updateData)
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTodaySessions(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

export async function getSessionHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data || [];
}

// Focus Integrity Score
export async function getFocusIntegrityScore(userId: string): Promise<FocusIntegrityScore> {
  const { data, error } = await supabase.rpc('calculate_focus_integrity', { p_user_id: userId });
  if (error) throw error;
  return data as unknown as FocusIntegrityScore;
}

// Daily reports functions
export async function submitDailyReport(report: Omit<DailyReport, 'id' | 'created_at' | 'xp_earned'>) {
  const { data, error } = await supabase
    .from('daily_reports')
    .insert(report)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getTodayReport(userId: string): Promise<DailyReport | null> {
  const today = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .eq('report_date', today)
    .maybeSingle();
  
  if (error) throw error;
  return data;
}

// Community posts functions
export async function createPost(post: Omit<CommunityPost, 'id' | 'created_at' | 'updated_at' | 'upvotes'>) {
  const { data, error } = await supabase
    .from('community_posts')
    .insert(post)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function getPosts(filter?: string) {
  let query = supabase
    .from('community_posts')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (filter && filter !== 'All') {
    const postType = filter.toLowerCase().slice(0, -1);
    query = query.eq('post_type', postType);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export const REACTION_TYPES = ['helpful', 'insightful', 'motivating', 'solved', 'upvote'] as const;
export type ReactionType = typeof REACTION_TYPES[number];

export async function toggleUpvote(postId: string, userId: string) {
  return toggleReaction(postId, userId, 'upvote');
}

export async function toggleReaction(postId: string, userId: string, reaction: ReactionType) {
  const { data: existing } = await (supabase as any)
    .from('post_reactions')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .eq('reaction_type', reaction)
    .maybeSingle();

  if (existing) {
    await (supabase as any).from('post_reactions').delete().eq('id', existing.id);
    return false;
  }
  await (supabase as any).from('post_reactions').insert({ post_id: postId, user_id: userId, reaction_type: reaction });
  return true;
}

export async function getReactionsForPosts(postIds: string[]) {
  if (postIds.length === 0) return [];
  const { data } = await (supabase as any)
    .from('post_reactions')
    .select('post_id, user_id, reaction_type')
    .in('post_id', postIds);
  return data || [];
}

// Comments (with nesting)
export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  parent_id: string | null;
  created_at: string;
}

export async function getComments(postId: string): Promise<PostComment[]> {
  const { data } = await (supabase as any)
    .from('post_comments')
    .select('*')
    .eq('post_id', postId)
    .order('created_at', { ascending: true });
  return (data as PostComment[]) || [];
}

export async function addComment(postId: string, userId: string, content: string, parentId?: string | null) {
  const { error } = await (supabase as any)
    .from('post_comments')
    .insert({ post_id: postId, user_id: userId, content, parent_id: parentId ?? null });
  if (error) throw error;
}

export async function deleteComment(commentId: string) {
  const { error } = await supabase.from('post_comments').delete().eq('id', commentId);
  if (error) throw error;
}

// Trending + contributors
export async function getTopContributors(limit = 5) {
  const { data, error } = await (supabase as any).rpc('get_top_contributors', { _limit: limit });
  if (error) throw error;
  return data || [];
}

export async function getTrendingTopics(limit = 8) {
  const { data, error } = await (supabase as any).rpc('get_trending_topics', { _limit: limit });
  if (error) throw error;
  return data || [];
}

// ---------- Study Groups ----------
export interface StudyGroup {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  invite_code: string;
  topic: string | null;
  created_at: string;
}

export interface StudyGroupMember {
  id: string;
  group_id: string;
  user_id: string;
  role: 'owner' | 'member';
  status: 'pending' | 'approved';
  joined_at: string;
}

export async function listStudyGroups() {
  const { data } = await (supabase as any)
    .from('study_groups')
    .select('*')
    .order('created_at', { ascending: false });
  return (data as StudyGroup[]) || [];
}

export async function getGroupMembers(groupId: string) {
  const { data } = await (supabase as any)
    .from('study_group_members')
    .select('*')
    .eq('group_id', groupId);
  return (data as StudyGroupMember[]) || [];
}

export async function createStudyGroup(input: { name: string; description?: string; topic?: string; ownerId: string }) {
  const { data, error } = await (supabase as any)
    .from('study_groups')
    .insert({ name: input.name, description: input.description ?? null, topic: input.topic ?? null, owner_id: input.ownerId })
    .select()
    .single();
  if (error) throw error;
  return data as StudyGroup;
}

export async function requestJoinGroup(groupId: string, userId: string) {
  const { error } = await (supabase as any)
    .from('study_group_members')
    .insert({ group_id: groupId, user_id: userId, role: 'member', status: 'pending' });
  if (error) throw error;
}

export async function joinByInviteCode(code: string, userId: string) {
  const { data: group, error } = await (supabase as any)
    .from('study_groups')
    .select('id')
    .eq('invite_code', code.trim())
    .maybeSingle();
  if (error) throw error;
  if (!group) throw new Error('Invalid invite code');
  // Invite codes auto-approve
  const { error: insErr } = await (supabase as any)
    .from('study_group_members')
    .insert({ group_id: group.id, user_id: userId, role: 'member', status: 'approved' });
  if (insErr && !String(insErr.message).includes('duplicate')) throw insErr;
  return group.id as string;
}

export async function approveGroupMember(memberId: string) {
  const { error } = await (supabase as any)
    .from('study_group_members')
    .update({ status: 'approved' })
    .eq('id', memberId);
  if (error) throw error;
}

export async function removeGroupMember(memberId: string) {
  const { error } = await (supabase as any).from('study_group_members').delete().eq('id', memberId);
  if (error) throw error;
}

export async function leaveGroup(groupId: string, userId: string) {
  const { error } = await (supabase as any)
    .from('study_group_members')
    .delete()
    .eq('group_id', groupId)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function listGroupChallenges(groupId: string) {
  const { data } = await (supabase as any)
    .from('group_challenges')
    .select('*')
    .eq('group_id', groupId)
    .order('created_at', { ascending: false });
  return data || [];
}

export async function createGroupChallenge(input: { groupId: string; title: string; description?: string; endDate?: string; createdBy: string }) {
  const { error } = await (supabase as any).from('group_challenges').insert({
    group_id: input.groupId,
    title: input.title,
    description: input.description ?? null,
    end_date: input.endDate ?? null,
    created_by: input.createdBy,
  });
  if (error) throw error;
}

// Helper: fetch lightweight author profiles for a set of user ids
export async function getAuthorProfiles(userIds: string[]) {
  if (userIds.length === 0) return {} as Record<string, { name: string; avatar_url: string | null }>;
  const { data } = await supabase
    .from('profiles')
    .select('user_id, name, avatar_url')
    .in('user_id', userIds);
  const map: Record<string, { name: string; avatar_url: string | null }> = {};
  (data || []).forEach((p: any) => { map[p.user_id] = { name: p.name, avatar_url: p.avatar_url }; });
  return map;
}


// Leaderboard functions
export async function getLeaderboard() {
  const { data, error } = await supabase.rpc('get_leaderboard');
  if (error) throw error;
  return data || [];
}

// Study plans
export async function saveStudyPlans(userId: string, goalId: string, plans: any[]) {
  await supabase.from('study_plans').delete().eq('user_id', userId);
  
  const planRows = plans.map((plan, index) => ({
    user_id: userId,
    goal_id: goalId,
    day_of_week: index,
    blocks: plan.blocks,
  }));
  
  const { error } = await supabase.from('study_plans').insert(planRows);
  if (error) throw error;
}

export async function getStudyPlans(userId: string) {
  const { data, error } = await supabase
    .from('study_plans')
    .select('*')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  
  if (error) throw error;
  return data || [];
}

// Recent activity feed
export async function getRecentActivity(userId: string, limit = 5) {
  const [sessions, reports] = await Promise.all([
    supabase
      .from('study_sessions')
      .select('id, topic, xp_earned, created_at, duration_seconds, block_type')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit),
    supabase
      .from('daily_reports')
      .select('id, studied, xp_earned, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit),
  ]);

  const activities: Array<{
    id: string;
    type: 'session' | 'report';
    title: string;
    xp: number;
    created_at: string;
    meta?: string;
  }> = [];

  (sessions.data || []).forEach(s => {
    activities.push({
      id: s.id,
      type: 'session',
      title: s.topic,
      xp: s.xp_earned,
      created_at: s.created_at,
      meta: `${Math.round(s.duration_seconds / 60)}min • ${s.block_type}`,
    });
  });

  (reports.data || []).forEach(r => {
    activities.push({
      id: r.id,
      type: 'report',
      title: r.studied,
      xp: r.xp_earned,
      created_at: r.created_at,
    });
  });

  return activities
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, limit);
}

// =================== Session Reflections & Learning Memory ===================

export interface SessionReflection {
  id: string;
  session_id: string;
  user_id: string;
  learned: string | null;
  challenged: string | null;
  revise: string | null;
  focus_rating: number | null;
  distractions: string | null;
  mood: string | null;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export async function upsertSessionReflection(
  reflection: Omit<SessionReflection, 'id' | 'created_at' | 'updated_at'>
) {
  const { data, error } = await supabase
    .from('session_reflections')
    .upsert(reflection as any, { onConflict: 'session_id' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function getReflectionForSession(sessionId: string) {
  const { data, error } = await supabase
    .from('session_reflections')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();
  if (error) throw error;
  return data as SessionReflection | null;
}

export async function updateSessionTags(sessionId: string, tags: string[]) {
  const { error } = await supabase
    .from('study_sessions')
    .update({ tags } as any)
    .eq('id', sessionId);
  if (error) throw error;
}

export interface MemoryEntry {
  session: any;
  reflection: SessionReflection | null;
}

export async function searchLearningMemory(
  userId: string,
  opts: { query?: string; tag?: string; limit?: number } = {}
): Promise<MemoryEntry[]> {
  const { query, tag, limit = 100 } = opts;
  let sessionQuery = supabase
    .from('study_sessions')
    .select('*')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .order('started_at', { ascending: false })
    .limit(limit);

  if (tag) sessionQuery = sessionQuery.contains('tags', [tag] as any);
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    sessionQuery = sessionQuery.or(`topic.ilike.${q},notes.ilike.${q}`);
  }

  const { data: sessions, error: sErr } = await sessionQuery;
  if (sErr) throw sErr;

  const sessionIds = (sessions || []).map((s: any) => s.id);
  let reflections: SessionReflection[] = [];
  if (sessionIds.length > 0) {
    const { data: refs, error: rErr } = await supabase
      .from('session_reflections')
      .select('*')
      .in('session_id', sessionIds);
    if (rErr) throw rErr;
    reflections = (refs || []) as SessionReflection[];
  }

  // If a free-text query is set, also include sessions whose reflections match it.
  if (query && query.trim()) {
    const q = `%${query.trim()}%`;
    const { data: refMatches } = await supabase
      .from('session_reflections')
      .select('*')
      .eq('user_id', userId)
      .or(`learned.ilike.${q},challenged.ilike.${q},revise.ilike.${q}`)
      .limit(limit);

    const extraIds = (refMatches || [])
      .map(r => r.session_id)
      .filter(id => !sessionIds.includes(id));
    if (extraIds.length > 0) {
      const { data: extraSessions } = await supabase
        .from('study_sessions')
        .select('*')
        .in('id', extraIds);
      (extraSessions || []).forEach(s => (sessions as any[]).push(s));
      reflections = reflections.concat((refMatches || []) as SessionReflection[]);
    }
  }

  const refBySession = new Map(reflections.map(r => [r.session_id, r]));
  return ((sessions as any[]) || [])
    .sort((a, b) => new Date(b.started_at).getTime() - new Date(a.started_at).getTime())
    .map(s => ({ session: s, reflection: refBySession.get(s.id) ?? null }));
}

export async function getAllUserTags(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('study_sessions')
    .select('tags')
    .eq('user_id', userId)
    .not('ended_at', 'is', null);
  if (error) throw error;
  const set = new Set<string>();
  (data || []).forEach((r: any) => (r.tags || []).forEach((t: string) => t && set.add(t)));
  return Array.from(set).sort();
}

export async function getActivityHeatmap(userId: string, days = 365) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', since.toISOString());
  if (error) throw error;
  const map = new Map<string, number>();
  (data || []).forEach((s: any) => {
    const day = s.started_at.slice(0, 10);
    map.set(day, (map.get(day) || 0) + (s.duration_seconds || 0));
  });
  return map; // dateString -> total seconds
}

// =================== Daily Reports & Analytics ===================

export interface DailyAggregate {
  date: string; // YYYY-MM-DD
  sessions: number;
  focusSeconds: number;
  xp: number;
  interruptions: number;
  reportSubmitted: boolean;
}

export async function getReportsHistory(userId: string, limit = 30): Promise<DailyReport[]> {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*')
    .eq('user_id', userId)
    .order('report_date', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as DailyReport[];
}

export async function getDailyStats(userId: string, days = 14): Promise<DailyAggregate[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  const sinceISO = since.toISOString().slice(0, 10);

  const [sessionsRes, reportsRes] = await Promise.all([
    supabase
      .from('study_sessions')
      .select('started_at, duration_seconds, xp_earned, interruptions, ended_at')
      .eq('user_id', userId)
      .not('ended_at', 'is', null)
      .gte('started_at', `${sinceISO}T00:00:00`),
    supabase
      .from('daily_reports')
      .select('report_date, xp_earned')
      .eq('user_id', userId)
      .gte('report_date', sinceISO),
  ]);
  if (sessionsRes.error) throw sessionsRes.error;
  if (reportsRes.error) throw reportsRes.error;

  const byDay = new Map<string, DailyAggregate>();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (days - 1 - i));
    const key = d.toISOString().slice(0, 10);
    byDay.set(key, { date: key, sessions: 0, focusSeconds: 0, xp: 0, interruptions: 0, reportSubmitted: false });
  }
  (sessionsRes.data || []).forEach((s: any) => {
    const key = s.started_at.slice(0, 10);
    const row = byDay.get(key);
    if (!row) return;
    row.sessions += 1;
    row.focusSeconds += s.duration_seconds || 0;
    row.xp += s.xp_earned || 0;
    row.interruptions += s.interruptions || 0;
  });
  (reportsRes.data || []).forEach((r: any) => {
    const row = byDay.get(r.report_date);
    if (!row) return;
    row.reportSubmitted = true;
    row.xp += r.xp_earned || 0;
  });
  return Array.from(byDay.values());
}

export async function getProductiveHours(userId: string, days = 30): Promise<{ hour: number; focusSeconds: number }[]> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data, error } = await supabase
    .from('study_sessions')
    .select('started_at, duration_seconds')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', since.toISOString());
  if (error) throw error;
  const buckets = Array.from({ length: 24 }, (_, h) => ({ hour: h, focusSeconds: 0 }));
  (data || []).forEach((s: any) => {
    const h = new Date(s.started_at).getHours();
    buckets[h].focusSeconds += s.duration_seconds || 0;
  });
  return buckets;
}

export interface WeeklySummary {
  totalHours: number;
  totalSessions: number;
  totalXp: number;
  reportsSubmitted: number;
  strongestTopic: string | null;
  weakestDay: string | null;
  streakGrowth: number;
  bestDay: { date: string; focusSeconds: number } | null;
}

export async function getWeeklySummary(userId: string): Promise<WeeklySummary> {
  const stats = await getDailyStats(userId, 7);
  const { data: sessions, error } = await supabase
    .from('study_sessions')
    .select('topic, duration_seconds, started_at')
    .eq('user_id', userId)
    .not('ended_at', 'is', null)
    .gte('started_at', new Date(Date.now() - 7 * 86400000).toISOString());
  if (error) throw error;

  const topicTotals = new Map<string, number>();
  (sessions || []).forEach((s: any) => {
    const t = (s.topic || 'General').trim() || 'General';
    topicTotals.set(t, (topicTotals.get(t) || 0) + (s.duration_seconds || 0));
  });
  const strongestTopic = [...topicTotals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weekdayTotals = new Map<string, number>();
  stats.forEach(s => {
    const dn = dayNames[new Date(s.date + 'T00:00:00').getDay()];
    weekdayTotals.set(dn, (weekdayTotals.get(dn) || 0) + s.focusSeconds);
  });
  const weakestDay = [...weekdayTotals.entries()].sort((a, b) => a[1] - b[1])[0]?.[0] ?? null;
  const bestDay = stats.reduce<{ date: string; focusSeconds: number } | null>(
    (best, s) => (!best || s.focusSeconds > best.focusSeconds ? { date: s.date, focusSeconds: s.focusSeconds } : best),
    null
  );

  return {
    totalHours: stats.reduce((a, s) => a + s.focusSeconds, 0) / 3600,
    totalSessions: stats.reduce((a, s) => a + s.sessions, 0),
    totalXp: stats.reduce((a, s) => a + s.xp, 0),
    reportsSubmitted: stats.filter(s => s.reportSubmitted).length,
    strongestTopic,
    weakestDay,
    streakGrowth: stats.filter(s => s.focusSeconds > 0).length,
    bestDay,
  };
}

