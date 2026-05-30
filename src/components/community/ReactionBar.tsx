import { useMemo } from 'react';
import { Heart, Lightbulb, Zap, CheckCircle2, ArrowUp } from 'lucide-react';
import { ReactionType, REACTION_TYPES } from '@/lib/database';
import { cn } from '@/lib/utils';

interface ReactionRow { post_id: string; user_id: string; reaction_type: ReactionType }

const META: Record<ReactionType, { icon: typeof Heart; label: string; className: string }> = {
  helpful: { icon: Heart, label: 'Helpful', className: 'text-rose-400' },
  insightful: { icon: Lightbulb, label: 'Insightful', className: 'text-amber-400' },
  motivating: { icon: Zap, label: 'Motivating', className: 'text-sky-400' },
  solved: { icon: CheckCircle2, label: 'Solved', className: 'text-emerald-400' },
  upvote: { icon: ArrowUp, label: 'Upvote', className: 'text-primary' },
};

interface Props {
  postId: string;
  userId: string | null;
  reactions: ReactionRow[];
  onToggle: (reaction: ReactionType) => void;
}

export default function ReactionBar({ postId, userId, reactions, onToggle }: Props) {
  const counts = useMemo(() => {
    const out: Record<ReactionType, { count: number; mine: boolean }> = {
      helpful: { count: 0, mine: false },
      insightful: { count: 0, mine: false },
      motivating: { count: 0, mine: false },
      solved: { count: 0, mine: false },
      upvote: { count: 0, mine: false },
    };
    for (const r of reactions) {
      if (r.post_id !== postId) continue;
      out[r.reaction_type].count += 1;
      if (userId && r.user_id === userId) out[r.reaction_type].mine = true;
    }
    return out;
  }, [reactions, postId, userId]);

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {REACTION_TYPES.map((type) => {
        const meta = META[type];
        const Icon = meta.icon;
        const { count, mine } = counts[type];
        return (
          <button
            key={type}
            type="button"
            onClick={(e) => { e.stopPropagation(); if (userId) onToggle(type); }}
            disabled={!userId}
            title={meta.label}
            className={cn(
              'group inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-medium transition-all',
              mine
                ? 'border-primary/40 bg-primary/10 text-foreground'
                : 'border-border bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted hover:text-foreground',
            )}
          >
            <Icon className={cn('h-3.5 w-3.5 transition-transform group-hover:scale-110', mine && meta.className)} />
            <span className="tabular-nums">{count}</span>
          </button>
        );
      })}
    </div>
  );
}
