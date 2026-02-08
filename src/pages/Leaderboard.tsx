import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { mockLeaderboard } from '@/lib/mock-data';
import { Trophy, Zap, Flame, Medal } from 'lucide-react';

export default function Leaderboard() {
  const [tab, setTab] = useState<'weekly' | 'daily'>('weekly');

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

        {/* Top 3 podium */}
        <div className="grid grid-cols-3 gap-4">
          {mockLeaderboard.slice(0, 3).map((entry, i) => {
            const podiumOrder = [1, 0, 2];
            const e = mockLeaderboard[podiumOrder[i]];
            const colors = ['bg-gradient-streak shadow-glow-streak', 'bg-muted', 'bg-muted'];
            const sizes = ['h-28', 'h-24', 'h-20'];
            return (
              <motion.div
                key={e.user.id}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.15 }}
                className="flex flex-col items-center"
              >
                <div className={`mb-3 flex h-14 w-14 items-center justify-center rounded-full ${i === 1 ? 'bg-gradient-streak ring-2 ring-streak/30' : 'bg-muted'}`}>
                  <span className="font-display text-lg font-bold text-foreground">{e.user.name.charAt(0)}</span>
                </div>
                <p className="text-sm font-semibold text-foreground">{e.user.name}</p>
                <p className="text-xs text-muted-foreground">{e.user.level}</p>
                <div className="mt-1 flex items-center gap-1 text-xp">
                  <Zap className="h-3.5 w-3.5" />
                  <span className="text-sm font-bold">{tab === 'weekly' ? e.weeklyXp : e.dailyXp}</span>
                </div>
                <div className={`mt-2 flex w-full items-end justify-center rounded-t-lg ${colors[i]} ${sizes[i]}`}>
                  <span className="mb-3 font-display text-2xl font-bold text-foreground">#{e.rank}</span>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Full list */}
        <div className="glass-card rounded-xl overflow-hidden">
          {mockLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.user.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`flex items-center gap-4 border-b border-border/50 px-6 py-4 last:border-0 ${entry.rank <= 3 ? 'bg-muted/30' : ''}`}
            >
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold ${entry.rank <= 3 ? 'bg-gradient-streak text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                {entry.rank}
              </span>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-sm font-bold text-foreground">
                {entry.user.name.charAt(0)}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">{entry.user.name}</p>
                <p className="text-xs text-muted-foreground">{entry.user.level}</p>
              </div>
              <div className="flex items-center gap-1 text-streak">
                <Flame className="h-3.5 w-3.5" />
                <span className="text-sm font-medium">{entry.user.streak}d</span>
              </div>
              <div className="flex items-center gap-1 text-xp">
                <Zap className="h-3.5 w-3.5" />
                <span className="text-sm font-bold">{tab === 'weekly' ? entry.weeklyXp : entry.dailyXp} XP</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
