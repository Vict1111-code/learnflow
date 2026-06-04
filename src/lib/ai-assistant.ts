import { supabase } from '@/integrations/supabase/client';

export type AIKind = 'reflection' | 'explain' | 'quiz' | 'flashcards' | 'resources';

export async function callAI(kind: AIKind, payload: any): Promise<any> {
  const { data, error } = await supabase.functions.invoke('ai-assistant', {
    body: { kind, payload },
  });
  if (error) throw new Error(error.message || 'AI request failed');
  if ((data as any)?.error) throw new Error((data as any).error);
  return (data as any).output;
}

export async function getRecentReflections(userId: string, limit = 5) {
  const { data, error } = await supabase
    .from('session_reflections')
    .select('id, session_id, learned, challenged, revise, focus_rating, mood, distractions, tags, created_at, study_sessions(topic, duration_seconds)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

export async function saveFlashcards(userId: string, cards: Array<{ front: string; back: string; difficulty?: string }>, opts: { deck_name?: string; topic?: string; source?: string; source_id?: string }) {
  const rows = cards.map(c => ({
    user_id: userId,
    deck_name: opts.deck_name || 'My Flashcards',
    front: c.front,
    back: c.back,
    difficulty: c.difficulty || 'medium',
    topic: opts.topic || null,
    source: opts.source || 'manual',
    source_id: opts.source_id || null,
  }));
  const { data, error } = await supabase.from('ai_flashcards').insert(rows).select();
  if (error) throw error;
  return data;
}

export async function getFlashcards(userId: string) {
  const { data, error } = await supabase
    .from('ai_flashcards')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function deleteFlashcard(id: string) {
  const { error } = await supabase.from('ai_flashcards').delete().eq('id', id);
  if (error) throw error;
}

export async function saveQuiz(userId: string, quiz: {
  topic: string; difficulty: string; question_types: string[]; questions: any[];
  score?: number; total_questions: number; answers?: any; completed_at?: string;
}) {
  const { data, error } = await supabase.from('ai_quizzes').insert({
    user_id: userId,
    ...quiz,
  }).select().single();
  if (error) throw error;
  return data;
}

export async function getQuizHistory(userId: string) {
  const { data, error } = await supabase
    .from('ai_quizzes')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

export async function getAIHistory(userId: string, kind?: AIKind) {
  let q = supabase.from('ai_interactions').select('*').eq('user_id', userId).order('created_at', { ascending: false }).limit(50);
  if (kind) q = q.eq('kind', kind);
  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}
