import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { motion } from 'framer-motion';
import { Trophy, Flame, Clock, Users, Book, Sparkles, Zap, TrendingUp, Play, Lock } from 'lucide-react';

const iconMap: Record<string, any> = {
  trophy: Trophy, flame: Flame, clock: Clock, users: Users,
  book: Book, sparkles: Sparkles, zap: Zap, 'trending-up': TrendingUp, play: Play,
};

interface Achievement {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  xp_reward: number;
}

interface AchievementBadgesProps {
  userId: string;
}

export default function AchievementBadges({ userId }: AchievementBadgesProps) {
  const { data: achievements } = useQuery({
    queryKey: ['achievements'],
    queryFn: async () => {
      const { data } = await (supabase as any).from('achievements').select('*').order('category');
      return (data || []) as Achievement[];
    },
  });

  const { data: unlocked } = useQuery({
    queryKey: ['user-achievements', userId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('user_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', userId);
      const map = new Map<string, string>();
      (data || []).forEach((r: any) => map.set(r.achievement_id, r.unlocked_at));
      return map;
    },
    enabled: !!userId,
  });

  if (!achievements) return null;

  const unlockedCount = unlocked?.size || 0;

  return (
    <div className="glass-card rounded-2xl p-6">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Achievements</h2>
          <p className="text-sm text-muted-foreground">
            {unlockedCount} of {achievements.length} unlocked
          </p>
        </div>
        <Trophy className="h-6 w-6 text-xp" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {achievements.map((a, i) => {
          const Icon = iconMap[a.icon] || Trophy;
          const isUnlocked = unlocked?.has(a.id);
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.04 }}
              className={`group relative flex flex-col items-center rounded-xl border p-4 text-center transition-all ${
                isUnlocked
                  ? 'border-primary/30 bg-primary/5 shadow-glow-primary/30 hover:scale-105'
                  : 'border-border bg-muted/30 opacity-60 grayscale'
              }`}
              title={a.description}
            >
              <div
                className={`mb-2 flex h-10 w-10 items-center justify-center rounded-full ${
                  isUnlocked ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                {isUnlocked ? <Icon className="h-5 w-5" /> : <Lock className="h-4 w-4" />}
              </div>
              <p className="text-xs font-semibold text-foreground">{a.name}</p>
              <p className="mt-1 text-[10px] text-muted-foreground line-clamp-2">{a.description}</p>
              {a.xp_reward > 0 && (
                <span className="mt-1.5 rounded-full bg-xp/10 px-1.5 py-0.5 text-[9px] font-bold text-xp">
                  +{a.xp_reward} XP
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
