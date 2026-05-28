import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Search, Brain, Calendar, Hash, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import {
  searchLearningMemory,
  getAllUserTags,
  getActivityHeatmap,
  type MemoryEntry,
} from '@/lib/database';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Memory() {
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [tag, setTag] = useState<string>('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['learning-memory', user?.id, query, tag],
    queryFn: () => user ? searchLearningMemory(user.id, { query, tag }) : Promise.resolve([] as MemoryEntry[]),
    enabled: !!user,
  });

  const { data: tags = [] } = useQuery({
    queryKey: ['memory-tags', user?.id],
    queryFn: () => user ? getAllUserTags(user.id) : Promise.resolve([] as string[]),
    enabled: !!user,
  });

  const { data: heatmap } = useQuery({
    queryKey: ['memory-heatmap', user?.id],
    queryFn: () => user ? getActivityHeatmap(user.id, 182) : Promise.resolve(new Map<string, number>()),
    enabled: !!user,
  });

  const grouped = useMemo(() => groupByDay(entries), [entries]);
  const totals = useMemo(() => ({
    sessions: entries.length,
    minutes: Math.round(entries.reduce((a, e) => a + (e.session.duration_seconds || 0), 0) / 60),
    concepts: new Set(entries.map(e => e.session.topic).filter(Boolean)).size,
  }), [entries]);

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Learning Memory</h1>
          <p className="mt-1 text-muted-foreground">
            Everything you've studied, reflected on, and want to revisit — searchable in one place.
          </p>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 sm:gap-4">
          <Stat label="Sessions" value={totals.sessions} />
          <Stat label="Minutes focused" value={totals.minutes} />
          <Stat label="Unique topics" value={totals.concepts} />
        </div>

        {/* Heatmap */}
        <Heatmap heatmap={heatmap || new Map()} />

        {/* Search */}
        <motion.div
          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card flex flex-col gap-3 rounded-xl p-4 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search topics, notes, reflections... (e.g. pointers, shell)"
              className="border-border bg-muted/30 pl-9"
            />
          </div>
          {(query || tag) && (
            <Button variant="ghost" size="sm" onClick={() => { setQuery(''); setTag(''); }}>
              Clear
            </Button>
          )}
        </motion.div>

        {/* Tag filters */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map(t => (
              <button
                key={t}
                onClick={() => setTag(tag === t ? '' : t)}
                className={cn(
                  'flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium transition-all',
                  tag === t
                    ? 'border-primary/60 bg-primary/15 text-primary'
                    : 'border-border bg-muted/30 text-muted-foreground hover:text-foreground',
                )}
              >
                <Hash className="h-3 w-3" />{t}
              </button>
            ))}
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-6">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your memory...</p>
          ) : entries.length === 0 ? (
            <EmptyState />
          ) : (
            grouped.map(group => (
              <div key={group.day}>
                <div className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDayHeader(group.day)}
                </div>
                <div className="space-y-3 border-l border-border/60 pl-4">
                  {group.entries.map(entry => {
                    const isOpen = !!expanded[entry.session.id];
                    return (
                      <motion.div
                        key={entry.session.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="glass-card relative rounded-xl p-4"
                      >
                        <span className="absolute -left-[21px] top-5 h-2.5 w-2.5 rounded-full bg-primary shadow-glow-primary" />
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{entry.session.topic || 'Untitled session'}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {Math.round((entry.session.duration_seconds || 0) / 60)} min · {entry.session.block_type}
                              {entry.session.interruptions > 0 && ` · ${entry.session.interruptions} interruptions`}
                            </p>
                            {(entry.session.tags || []).length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {(entry.session.tags as string[]).map(t => (
                                  <span key={t} className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                                    #{t}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            {entry.reflection && (
                              <span className="flex items-center gap-1 rounded-full bg-xp/10 px-2 py-0.5 text-xp">
                                <Sparkles className="h-3 w-3" /> reflected
                              </span>
                            )}
                            <button
                              onClick={() => setExpanded(s => ({ ...s, [entry.session.id]: !s[entry.session.id] }))}
                              className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                              aria-label="Toggle details"
                            >
                              {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </button>
                          </div>
                        </div>
                        {isOpen && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-4 space-y-3 border-t border-border/60 pt-3 text-sm"
                          >
                            {entry.session.notes && (
                              <ReadField label="Notes" value={entry.session.notes} />
                            )}
                            {entry.reflection?.learned && (
                              <ReadField label="Learned" value={entry.reflection.learned} icon={<Brain className="h-3.5 w-3.5 text-primary" />} />
                            )}
                            {entry.reflection?.challenged && (
                              <ReadField label="Challenged" value={entry.reflection.challenged} />
                            )}
                            {entry.reflection?.revise && (
                              <ReadField label="To revise" value={entry.reflection.revise} />
                            )}
                            {entry.reflection?.distractions && (
                              <ReadField label="Distractions" value={entry.reflection.distractions} />
                            )}
                            {(entry.reflection?.focus_rating || entry.reflection?.mood) && (
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {entry.reflection?.focus_rating && (
                                  <span className="rounded-full bg-muted/40 px-2 py-0.5">Focus {entry.reflection.focus_rating}/5</span>
                                )}
                                {entry.reflection?.mood && (
                                  <span className="rounded-full bg-muted/40 px-2 py-0.5 capitalize">{entry.reflection.mood}</span>
                                )}
                              </div>
                            )}
                            {!entry.reflection && (
                              <p className="text-xs italic text-muted-foreground">No reflection captured for this session.</p>
                            )}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Layout>
  );
}

function ReadField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {icon} {label}
      </p>
      <p className="whitespace-pre-wrap text-foreground">{value}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="glass-card rounded-xl p-4 text-center">
      <p className="font-display text-2xl font-bold text-gradient-primary">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass-card rounded-xl p-10 text-center">
      <Brain className="mx-auto mb-3 h-8 w-8 text-primary" />
      <p className="font-medium text-foreground">Your learning memory is empty.</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Finish a study session and capture a reflection — it'll appear here, searchable forever.
      </p>
    </div>
  );
}

function groupByDay(entries: MemoryEntry[]) {
  const map = new Map<string, MemoryEntry[]>();
  entries.forEach(e => {
    const day = (e.session.started_at as string).slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(e);
  });
  return Array.from(map.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([day, entries]) => ({ day, entries }));
}

function formatDayHeader(day: string) {
  const d = new Date(day + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  if (diff < 7) return `${diff} days ago`;
  return d.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
}

function Heatmap({ heatmap }: { heatmap: Map<string, number> }) {
  // Last 26 weeks, columns are weeks, rows are days (Sun..Sat).
  const weeks = 26;
  const today = new Date();
  const start = new Date(today);
  start.setDate(today.getDate() - (weeks * 7 - 1));
  start.setHours(0, 0, 0, 0);

  const cells: Array<{ date: Date; key: string; minutes: number }> = [];
  for (let i = 0; i < weeks * 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    cells.push({ date: d, key, minutes: Math.round((heatmap.get(key) || 0) / 60) });
  }

  const intensity = (mins: number) => {
    if (mins <= 0) return 'bg-muted/40';
    if (mins < 15) return 'bg-primary/25';
    if (mins < 45) return 'bg-primary/50';
    if (mins < 90) return 'bg-primary/75';
    return 'bg-primary shadow-glow-primary';
  };

  // Lay out as weeks (columns).
  const cols: typeof cells[] = [];
  for (let w = 0; w < weeks; w++) cols.push(cells.slice(w * 7, w * 7 + 7));

  return (
    <div className="glass-card rounded-xl p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-foreground">Activity heatmap</h2>
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
          Less
          {['bg-muted/40', 'bg-primary/25', 'bg-primary/50', 'bg-primary/75', 'bg-primary'].map(c => (
            <span key={c} className={cn('h-2.5 w-2.5 rounded-sm', c)} />
          ))}
          More
        </div>
      </div>
      <div className="overflow-x-auto">
        <div className="inline-flex gap-[3px]">
          {cols.map((col, i) => (
            <div key={i} className="flex flex-col gap-[3px]">
              {col.map(cell => (
                <div
                  key={cell.key}
                  title={`${cell.key}: ${cell.minutes} min`}
                  className={cn('h-3 w-3 rounded-sm transition-transform hover:scale-110', intensity(cell.minutes))}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
