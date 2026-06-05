import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export interface LearningContext {
  name: string;
  xp: number;
  streak: number;
  level: string;
  focusHours: number;
  activeGoals: Array<{ id: string; description: string; mastery_level: string; is_active: boolean }>;
  recentSessions: Array<{ id: string; topic: string; duration_seconds: number; started_at: string }>;
  recentReflections: Array<{ id: string; learned: string | null; challenged: string | null; created_at: string }>;
}

export function useLearningContext() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['learning-context', user?.id],
    enabled: !!user,
    queryFn: async (): Promise<LearningContext> => {
      const uid = user!.id;
      const [profile, goals, sessions, reflections] = await Promise.all([
        supabase.from('profiles').select('name,xp,streak,level').eq('user_id', uid).maybeSingle(),
        supabase.from('learning_goals').select('id,description,mastery_level,is_active').eq('user_id', uid).order('is_active', { ascending: false }).limit(5),
        supabase.from('study_sessions').select('id,topic,duration_seconds,started_at').eq('user_id', uid).order('started_at', { ascending: false }).limit(5),
        supabase.from('session_reflections').select('id,learned,challenged,created_at').eq('user_id', uid).order('created_at', { ascending: false }).limit(3),
      ]);

      const focusSeconds = (sessions.data || []).reduce((a, s: any) => a + (s.duration_seconds || 0), 0);

      return {
        name: profile.data?.name || 'Learner',
        xp: profile.data?.xp || 0,
        streak: profile.data?.streak || 0,
        level: profile.data?.level || 'Beginner',
        focusHours: Math.round((focusSeconds / 3600) * 10) / 10,
        activeGoals: (goals.data || []) as any,
        recentSessions: (sessions.data || []) as any,
        recentReflections: (reflections.data || []) as any,
      };
    },
  });
}

export function serializeContext(ctx: LearningContext | undefined): string {
  if (!ctx) return '';
  const goals = ctx.activeGoals.map(g => `- ${g.description} (${g.mastery_level}${g.is_active ? ', active' : ''})`).join('\n') || '  (none)';
  const sessions = ctx.recentSessions.map(s => `- ${s.topic} · ${Math.round(s.duration_seconds / 60)}min`).join('\n') || '  (none)';
  return [
    `Name: ${ctx.name}`,
    `Level: ${ctx.level} · XP: ${ctx.xp} · Streak: ${ctx.streak}d · Recent focus: ${ctx.focusHours}h`,
    `Goals:\n${goals}`,
    `Recent sessions:\n${sessions}`,
  ].join('\n');
}
