import { useQuery } from '@tanstack/react-query';
import { TrendingUp, Crown, Flame } from 'lucide-react';
import { getTopContributors, getTrendingTopics } from '@/lib/database';

interface Props {
  onTopicClick?: (topic: string) => void;
}

export default function TrendingSidebar({ onTopicClick }: Props) {
  const { data: topics = [] } = useQuery({ queryKey: ['trending-topics'], queryFn: () => getTrendingTopics(8) });
  const { data: contributors = [] } = useQuery({ queryKey: ['top-contributors'], queryFn: () => getTopContributors(5) });

  return (
    <aside className="space-y-4">
      <section className="glass-card rounded-xl p-4">
        <header className="mb-3 flex items-center gap-2">
          <Flame className="h-4 w-4 text-streak" />
          <h3 className="font-display text-sm font-semibold">Trending Topics</h3>
        </header>
        {topics.length === 0 ? (
          <p className="text-xs text-muted-foreground">No trending topics yet.</p>
        ) : (
          <ul className="flex flex-wrap gap-1.5">
            {topics.map((t: any) => (
              <li key={t.topic}>
                <button
                  onClick={() => onTopicClick?.(t.topic)}
                  className="rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                >
                  #{t.topic} <span className="ml-1 text-[10px] opacity-60">{t.post_count}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-xl p-4">
        <header className="mb-3 flex items-center gap-2">
          <Crown className="h-4 w-4 text-xp" />
          <h3 className="font-display text-sm font-semibold">Top Contributors</h3>
        </header>
        {contributors.length === 0 ? (
          <p className="text-xs text-muted-foreground">Be the first contributor this week.</p>
        ) : (
          <ul className="space-y-2">
            {contributors.map((c: any, idx: number) => (
              <li key={c.user_id} className="flex items-center gap-2">
                <span className="w-4 text-xs font-bold text-muted-foreground">{idx + 1}</span>
                {c.avatar_url ? (
                  <img src={c.avatar_url} className="h-7 w-7 rounded-full object-cover" alt="" />
                ) : (
                  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground">
                    {(c.name || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{c.name}</p>
                  <p className="text-[10px] text-muted-foreground">{c.post_count} posts · {c.reaction_count} reactions</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-xl p-4">
        <header className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <h3 className="font-display text-sm font-semibold">Community Tips</h3>
        </header>
        <ul className="space-y-2 text-xs text-muted-foreground">
          <li>• React with <span className="text-foreground">Helpful</span> to surface great answers.</li>
          <li>• Mark a thread <span className="text-foreground">Solved</span> when it works for you.</li>
          <li>• Join a study group to stay accountable.</li>
        </ul>
      </section>
    </aside>
  );
}
