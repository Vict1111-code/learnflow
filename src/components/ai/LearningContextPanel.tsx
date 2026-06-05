import { Flame, Zap, Clock, Target, Sparkles, ChevronRight } from 'lucide-react';
import { useLearningContext } from '@/hooks/useLearningContext';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export default function LearningContextPanel() {
  const { data: ctx, isLoading } = useLearningContext();
  const { setMode, newChat } = useAIAssistant();

  return (
    <aside className="flex h-full w-full flex-col gap-3 border-l border-border/60 bg-background/40 p-4 backdrop-blur-xl">
      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" /> Your context
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[
            { icon: Flame,  label: 'Streak', value: `${ctx?.streak ?? 0}d`,  tint: 'text-streak' },
            { icon: Zap,    label: 'XP',     value: (ctx?.xp ?? 0).toLocaleString(), tint: 'text-xp' },
            { icon: Clock,  label: 'Focus',  value: `${ctx?.focusHours ?? 0}h`, tint: 'text-highlight-cyan' },
            { icon: Target, label: 'Goals',  value: `${ctx?.activeGoals.filter(g=>g.is_active).length ?? 0}`, tint: 'text-primary' },
          ].map(s => {
            const Icon = s.icon;
            return (
              <div key={s.label} className="rounded-lg border border-border/40 bg-background/40 p-2">
                <Icon className={`mb-1 h-3.5 w-3.5 ${s.tint}`} />
                <div className="text-sm font-bold text-foreground">{isLoading ? <Skeleton className="h-4 w-10" /> : s.value}</div>
                <div className="text-[10px] text-muted-foreground">{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Active goals</div>
        <div className="space-y-1.5">
          {(ctx?.activeGoals ?? []).slice(0, 4).map(g => (
            <Link key={g.id} to={`/goal/${g.id}`} className="flex items-center justify-between gap-2 rounded-lg border border-border/40 bg-background/40 px-2.5 py-2 text-xs hover:border-primary/40">
              <span className="truncate">{g.description}</span>
              <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            </Link>
          ))}
          {!isLoading && (ctx?.activeGoals.length ?? 0) === 0 && (
            <div className="text-xs text-muted-foreground">No goals yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent sessions</div>
        <div className="space-y-1.5">
          {(ctx?.recentSessions ?? []).slice(0, 4).map(s => (
            <div key={s.id} className="flex items-center justify-between gap-2 text-xs">
              <span className="truncate text-foreground">{s.topic}</span>
              <span className="shrink-0 text-muted-foreground">{Math.round(s.duration_seconds / 60)}m</span>
            </div>
          ))}
          {!isLoading && (ctx?.recentSessions.length ?? 0) === 0 && (
            <div className="text-xs text-muted-foreground">No sessions yet.</div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-card/60 p-4 backdrop-blur-xl">
        <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick actions</div>
        <div className="grid grid-cols-2 gap-1.5">
          <button onClick={() => { setMode('coach'); newChat('coach'); }} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-xs hover:border-primary/40">Plan today</button>
          <button onClick={() => { setMode('review'); newChat('review'); }} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-xs hover:border-primary/40">Review session</button>
          <button onClick={() => { setMode('quiz'); newChat('quiz'); }} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-xs hover:border-primary/40">Quick quiz</button>
          <button onClick={() => { setMode('flashcards'); newChat('flashcards'); }} className="rounded-lg border border-border/40 bg-background/40 px-2 py-1.5 text-xs hover:border-primary/40">Flashcards</button>
        </div>
      </div>
    </aside>
  );
}
