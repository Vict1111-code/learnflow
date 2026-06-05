import { Flame, Zap, Clock, Target, Sparkles } from 'lucide-react';
import { useLearningContext } from '@/hooks/useLearningContext';
import { Skeleton } from '@/components/ui/skeleton';
import QuickActions from './QuickActions';

export default function EmptyState() {
  const { data: ctx, isLoading } = useLearningContext();

  const stats = [
    { icon: Flame,  label: 'Streak',       value: `${ctx?.streak ?? 0}d`,         tint: 'text-streak' },
    { icon: Zap,    label: 'XP',           value: (ctx?.xp ?? 0).toLocaleString(), tint: 'text-xp' },
    { icon: Clock,  label: 'Focus',        value: `${ctx?.focusHours ?? 0}h`,     tint: 'text-highlight-cyan' },
    { icon: Target, label: 'Active goals', value: `${ctx?.activeGoals.filter(g=>g.is_active).length ?? 0}`, tint: 'text-primary' },
  ];

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] shadow-glow-primary">
          <Sparkles className="h-7 w-7 text-white" />
        </div>
        <h2 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          {isLoading ? <Skeleton className="mx-auto h-8 w-56" /> : <>Welcome back, <span className="bg-gradient-to-r from-primary to-[hsl(var(--level-purple))] bg-clip-text text-transparent">{ctx?.name}</span></>}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground">What should we explore today?</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {stats.map(s => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-xl border border-border/60 bg-card/50 p-3 backdrop-blur-xl">
              <Icon className={`mb-1.5 h-4 w-4 ${s.tint}`} />
              <div className="text-base font-bold text-foreground">{isLoading ? <Skeleton className="h-5 w-10"/> : s.value}</div>
              <div className="text-[11px] text-muted-foreground">{s.label}</div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</div>
        <QuickActions />
      </div>
    </div>
  );
}
