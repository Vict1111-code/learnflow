import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bookmark, Loader2, ExternalLink, Search, Trash2, Tag, Plus, X,
  FileText, Video, BookOpen, Book, GraduationCap, Wrench,
  Headphones, Rss, Users, Github,
} from 'lucide-react';
import Layout from '@/components/Layout';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

const ICON: Record<string, any> = {
  article: FileText, video: Video, documentation: BookOpen, book: Book,
  course: GraduationCap, tool: Wrench, podcast: Headphones, blog: Rss,
  community: Users, github: Github,
};

interface SavedRow {
  id: string;
  goal_id: string | null;
  title: string;
  url: string;
  type: string;
  source: string | null;
  description: string | null;
  tags: string[];
  concept_names: string[];
  rationale: string | null;
  is_free: boolean;
  created_at: string;
}

export default function Library() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [query, setQuery] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [newTag, setNewTag] = useState<Record<string, string>>({});

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['saved-resources', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('saved_resources')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data || []) as SavedRow[];
    },
  });

  const allTags = useMemo(() => {
    const set = new Set<string>();
    items.forEach(r => r.tags.forEach(t => set.add(t)));
    return Array.from(set).sort();
  }, [items]);

  const allTypes = useMemo(() => Array.from(new Set(items.map(r => r.type))).sort(), [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter(r => {
      if (activeTag && !r.tags.includes(activeTag)) return false;
      if (activeType && r.type !== activeType) return false;
      if (!q) return true;
      return [r.title, r.description, r.source, ...r.tags, ...r.concept_names]
        .filter(Boolean).some(s => String(s).toLowerCase().includes(q));
    });
  }, [items, query, activeTag, activeType]);

  const remove = async (id: string) => {
    const { error } = await supabase.from('saved_resources').delete().eq('id', id);
    if (error) return toast.error('Failed to remove');
    toast.success('Removed');
    qc.invalidateQueries({ queryKey: ['saved-resources', user?.id] });
    qc.invalidateQueries({ queryKey: ['saved-resources-urls', user?.id] });
  };

  const addTag = async (row: SavedRow) => {
    const raw = (newTag[row.id] || '').trim().toLowerCase();
    if (!raw) return;
    if (row.tags.includes(raw)) {
      setNewTag(s => ({ ...s, [row.id]: '' }));
      return;
    }
    const tags = [...row.tags, raw];
    const { error } = await supabase.from('saved_resources').update({ tags }).eq('id', row.id);
    if (error) return toast.error('Failed to add tag');
    setNewTag(s => ({ ...s, [row.id]: '' }));
    qc.invalidateQueries({ queryKey: ['saved-resources', user?.id] });
  };

  const removeTag = async (row: SavedRow, tag: string) => {
    const tags = row.tags.filter(t => t !== tag);
    const { error } = await supabase.from('saved_resources').update({ tags }).eq('id', row.id);
    if (error) return toast.error('Failed to remove tag');
    qc.invalidateQueries({ queryKey: ['saved-resources', user?.id] });
  };

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
            <Bookmark className="h-7 w-7 text-primary" /> Resource Library
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your saved free learning resources. Add tags to organise them and jump back in any time.
          </p>
        </motion.div>

        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input value={query} onChange={e => setQuery(e.target.value)}
              placeholder="Search your library by title, tag, source, or concept…"
              className="pl-9" />
          </div>

          {(allTags.length > 0 || allTypes.length > 0) && (
            <div className="space-y-2">
              {allTypes.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Type</span>
                  <button onClick={() => setActiveType(null)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${!activeType ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>All</button>
                  {allTypes.map(t => (
                    <button key={t} onClick={() => setActiveType(t === activeType ? null : t)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] capitalize ${activeType === t ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>{t}</button>
                  ))}
                </div>
              )}
              {allTags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] uppercase tracking-wide text-muted-foreground mr-1">Tags</span>
                  <button onClick={() => setActiveTag(null)}
                    className={`rounded-full border px-2 py-0.5 text-[11px] ${!activeTag ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>All</button>
                  {allTags.map(t => (
                    <button key={t} onClick={() => setActiveTag(t === activeTag ? null : t)}
                      className={`rounded-full border px-2 py-0.5 text-[11px] ${activeTag === t ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>#{t}</button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card rounded-xl p-10 text-center">
            <Bookmark className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {items.length === 0
                ? 'No saved resources yet — head to a goal and save AI suggestions to your library.'
                : 'No resources match your filters.'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {filtered.map(r => {
              const Icon = ICON[r.type] || FileText;
              return (
                <div key={r.id} className="glass-card rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30">
                      <Icon className="h-4 w-4 text-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="flex items-start justify-between gap-2 group">
                        <p className="font-medium text-foreground group-hover:text-primary line-clamp-2">{r.title}</p>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      </a>
                      {r.description && <p className="mt-1 text-xs text-muted-foreground line-clamp-2">{r.description}</p>}

                      <div className="mt-2 flex flex-wrap items-center gap-1 text-[10px]">
                        <span className="capitalize rounded-full border border-border/60 px-1.5 py-0.5 text-muted-foreground">{r.type}</span>
                        {r.source && <span className="rounded-full bg-muted/40 px-1.5 py-0.5 text-muted-foreground">{r.source}</span>}
                        {r.is_free && <span className="rounded-full bg-xp/15 px-1.5 py-0.5 text-xp">Free</span>}
                      </div>

                      {r.concept_names.length > 0 && (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          For: <span className="text-foreground">{r.concept_names.join(', ')}</span>
                        </p>
                      )}

                      <div className="mt-2 flex flex-wrap items-center gap-1">
                        {r.tags.map(t => (
                          <span key={t} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] text-primary">
                            #{t}
                            <button onClick={() => removeTag(r, t)} className="opacity-60 hover:opacity-100">
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </span>
                        ))}
                        <div className="inline-flex items-center gap-1">
                          <Tag className="h-3 w-3 text-muted-foreground" />
                          <input
                            value={newTag[r.id] || ''}
                            onChange={e => setNewTag(s => ({ ...s, [r.id]: e.target.value }))}
                            onKeyDown={e => e.key === 'Enter' && addTag(r)}
                            placeholder="add tag"
                            className="h-5 w-20 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none"
                          />
                          <button onClick={() => addTag(r)} className="rounded-full bg-muted/40 p-0.5 hover:bg-muted">
                            <Plus className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <div className="mt-2 flex justify-end">
                        <Button variant="ghost" size="sm" onClick={() => remove(r.id)}
                          className="h-7 gap-1 text-xs text-destructive hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="h-3 w-3" /> Remove
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
