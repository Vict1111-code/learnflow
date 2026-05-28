import { motion } from 'framer-motion';
import { Trophy, Flame, Sparkles, AlertCircle, TrendingUp } from 'lucide-react';
import AnimatedCounter from '@/components/AnimatedCounter';
import type { WeeklySummary } from '@/lib/database';

interface Props {
  data: WeeklySummary | undefined;
  loading?: boolean;
}

export default function WeeklySummaryCard({ data, loading }: Props) {
  if (loading || !data) {
    return (
      <div className="glass-card rounded-xl p-6">
        <div className="h-5 w-32 animate-pulse rounded bg-muted/50" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      </div>
    );
  }

  const items = [
    { label: 'Total Hours', value: data.totalHours.toFixed(1), icon: TrendingUp, color: 'text-primary' },
    { label: 'Sessions', value: data.totalSessions.toString(), icon: Sparkles, color: 'text-highlight' },
    { label: 'XP Earned', value: data.totalXp.toString(), icon: Trophy, color: 'text-xp' },
    { label: 'Active Days', value: `${data.streakGrowth}/7`, icon: Flame, color: 'text-streak' },
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-foreground">This Week</h2>
        <span className="text-xs text-muted-foreground">Last 7 days</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {items.map((it, i) => (
          <motion.div
            key={it.label}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            className="rounded-lg border border-border bg-muted/20 p-3"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">{it.label}</span>
              <it.icon className={`h-3.5 w-3.5 ${it.color}`} />
            </div>
            <p className={`mt-1 font-display text-xl font-bold ${it.color}`}>
              <AnimatedCounter value={parseFloat(it.value) || 0} decimals={it.value.includes('.') ? 1 : 0} />
              {it.label === 'Active Days' && <span className="text-sm font-normal text-muted-foreground">/7</span>}
            </p>
          </motion.div>
        ))}
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Strongest Topic</p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {data.strongestTopic ?? '—'}
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/10 p-3">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
            <AlertCircle className="mr-1 inline h-3 w-3 text-streak" />
            Weakest Day
          </p>
          <p className="mt-1 truncate text-sm font-medium text-foreground">
            {data.weakestDay ?? '—'}
          </p>
        </div>
      </div>
    </motion.div>
  );
}
