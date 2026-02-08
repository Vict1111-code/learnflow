import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Zap, Flame } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getLeaderboard } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';

export default function Leaderboard() {
  const { user } = useAuth();
  const [tab, setTab] = useState<'weekly' | 'daily'>('weekly');

  const { data: leaderboard, isLoading } = useQuery({
    queryKey: ['leaderboard'],
    queryFn: getLeaderboard,
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  const entries = leaderboard || [];

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Leaderboard</h1>
          <p className="mt-1 text-muted-foreground">Top learners ranked by output, not just time</p>
        </motion.div>

        <div className="flex gap-2">
          {(['weekly', 'daily'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`rounded-lg px-5 py-2 text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {t}
            </button>
          ))}
        </div>

        {entries.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No learners yet. Be the first!</p>
          </div>
        ) : (
          <>
            {/* Top 3 podium */}
            {entries.length >= 3 && (
              <div className="grid grid-cols-3 gap-4">
                {[1, 0, 2].map((podiumIndex, visualIndex) => {
                  const entry = entries[podiumIndex];
                  if (!entry) return null;
                  const colors = ['bg-gradient-streak shadow-glow-streak', 'bg-muted', 'bg-muted'];
                  const sizes = ['h-28', 'h-24', 'h-20'];
                  const isCurrentUser = entry.user_id === user?.id;
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: visualIndex * 0.15 }}
                      className="flex flex-col items-center"
                    >
                      <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${visualIndex === 1 ? 'bg-gradient-streak ring-2 ring-streak/30' : 'bg-muted'}`}>
                        <span className="font-display text-lg font-bold text-foreground">{entry.name?.charAt(0)?.toUpperCase() || 'U'}</span>
                      </div>
                      <p className={`text-sm font-semibold ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {entry.name || 'Anonymous'} {isCurrentUser && '(You)'}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.level}</p>
                      <div className="mt-1 flex items-center gap-1 text-xp">
                        <Zap className="h-3.5 w-3.5" />
                        <span className="text-sm font-bold">{entry.xp.toLocaleString()}</span>
                      </div>
                      <div className={`mt-2 flex w-full items-end justify-center rounded-t-lg ${colors[visualIndex]} ${sizes[visualIndex]}`}>
                        <span className="mb-3 font-display text-2xl font-bold text-foreground">#{podiumIndex + 1}</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Full list */}
            <div className="glass-card rounded-xl overflow-hidden">
              {entries.map((entry, i) => {
                const isCurrentUser = entry.user_id === user?.id;
                return (
                  <motion.div
                    key={entry.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`flex items-center gap-4 border-b border-border/50 px-6 py-4 last:border-0 ${i < 3 ? 'bg-muted/30' : ''} ${isCurrentUser ? 'bg-primary/5' : ''}`}
                  >
                    <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${i < 3 ? 'bg-gradient-streak text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                      {i + 1}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-foreground">
                      {entry.name?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${isCurrentUser ? 'text-primary' : 'text-foreground'}`}>
                        {entry.name || 'Anonymous'} {isCurrentUser && '(You)'}
                      </p>
                      <p className="text-xs text-muted-foreground">{entry.level}</p>
                    </div>
                    <div className="flex items-center gap-1 text-streak">
                      <Flame className="h-3.5 w-3.5" />
                      <span className="text-sm font-medium">{entry.streak}d</span>
                    </div>
                    <div className="flex items-center gap-1 text-xp">
                      <Zap className="h-3.5 w-3.5" />
                      <span className="text-sm font-bold">{entry.xp.toLocaleString()} XP</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
