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
  created_at: string;
  updated_at: string;
}

// Get all learning goals for a user
export async function getLearningGoals(userId: string): Promise<LearningGoal[]> {
  const { data, error } = await supabase
    .from('learning_goals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data || [];
}

// Get study plans with their associated goals
export async function getStudyPlansWithGoals(userId: string) {
  const { data: plans, error: plansError } = await supabase
    .from('study_plans')
    .select('*, learning_goals(*)')
    .eq('user_id', userId)
    .order('day_of_week', { ascending: true });
  
  if (plansError) throw plansError;
  return plans || [];
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
export async function createLearningGoal(goal: Omit<LearningGoal, 'id' | 'created_at' | 'updated_at'>) {
  const { data, error } = await supabase
    .from('learning_goals')
    .insert(goal)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// Delete a learning goal and its associated study plans
export async function deleteLearningGoal(goalId: string, userId: string) {
  // First delete associated study plans
  const { error: plansError } = await supabase
    .from('study_plans')
    .delete()
    .eq('goal_id', goalId)
    .eq('user_id', userId);
  
  if (plansError) throw plansError;
  
  // Then delete the goal
  const { error: goalError } = await supabase
    .from('learning_goals')
    .delete()
    .eq('id', goalId)
    .eq('user_id', userId);
  
  if (goalError) throw goalError;
}

// Toggle goal active status
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

// Set a specific goal as the active one (deactivates others)
export async function setActiveGoal(goalId: string, userId: string) {
  // First deactivate all goals for this user
  const { error: deactivateError } = await supabase
    .from('learning_goals')
    .update({ is_active: false })
    .eq('user_id', userId);
  
  if (deactivateError) throw deactivateError;
  
  // Then activate the selected goal
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

// Get goal progress (completed blocks / total blocks)
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

// Study sessions functions
export async function startStudySession(userId: string, topic: string, blockType: string) {
  const { data, error } = await supabase
    .from('study_sessions')
    .insert({
      user_id: userId,
      topic,
      block_type: blockType,
    })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

export async function endStudySession(sessionId: string, durationSeconds: number) {
  const { data, error } = await supabase
    .from('study_sessions')
    .update({
      ended_at: new Date().toISOString(),
      duration_seconds: durationSeconds,
    })
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
    const postType = filter.toLowerCase().slice(0, -1); // Remove 's' from end
    query = query.eq('post_type', postType);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function toggleUpvote(postId: string, userId: string) {
  // Check if already upvoted
  const { data: existing } = await supabase
    .from('post_upvotes')
    .select('id')
    .eq('post_id', postId)
    .eq('user_id', userId)
    .maybeSingle();
  
  if (existing) {
    // Remove upvote
    await supabase.from('post_upvotes').delete().eq('id', existing.id);
    // Decrement upvotes count
    const { data: post } = await supabase.from('community_posts').select('upvotes').eq('id', postId).single();
    if (post) {
      await supabase.from('community_posts').update({ upvotes: Math.max(0, post.upvotes - 1) }).eq('id', postId);
    }
  } else {
    // Add upvote
    await supabase.from('post_upvotes').insert({ post_id: postId, user_id: userId });
    // Increment upvotes count
    const { data: post } = await supabase.from('community_posts').select('upvotes').eq('id', postId).single();
    if (post) {
      await supabase.from('community_posts').update({ upvotes: post.upvotes + 1 }).eq('id', postId);
    }
  }
}

// Leaderboard functions
export async function getLeaderboard() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('xp', { ascending: false })
    .limit(10);
  
  if (error) throw error;
  return data || [];
}

// Study plans
export async function saveStudyPlans(userId: string, goalId: string, plans: any[]) {
  // Delete existing plans for this user
  await supabase.from('study_plans').delete().eq('user_id', userId);
  
  // Insert new plans
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
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
