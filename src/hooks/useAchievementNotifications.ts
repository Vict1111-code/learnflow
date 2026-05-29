import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { useQueryClient } from '@tanstack/react-query';

/**
 * Polls user_achievements for newly unlocked (seen=false) records,
 * fires a celebratory toast for each, then marks them seen.
 */
export function useAchievementNotifications() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!user) return;

    let cancelled = false;

    // Backfill: re-evaluate so achievements unlock for pre-existing activity
    (supabase as any).rpc('evaluate_user_achievements', { p_user_id: user.id });

    const check = async () => {
      const { data, error } = await (supabase as any)
        .from('user_achievements')
        .select('id, achievement_id, achievements:achievement_id(name, description, icon, xp_reward)')
        .eq('user_id', user.id)
        .eq('seen', false);

      if (cancelled || error || !data?.length) return;

      for (const row of data) {
        const a = row.achievements;
        if (!a) continue;
        toast.success(`🏆 Achievement Unlocked: ${a.name}`, {
          description: `${a.description}${a.xp_reward ? ` · +${a.xp_reward} XP` : ''}`,
          duration: 6000,
        });
      }

      const ids = data.map((r: any) => r.id);
      await (supabase as any).from('user_achievements').update({ seen: true }).in('id', ids);

      queryClient.invalidateQueries({ queryKey: ['user-achievements', user.id] });
      queryClient.invalidateQueries({ queryKey: ['profile', user.id] });
    };

    check();
    const interval = setInterval(check, 30000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [user, queryClient]);
}
