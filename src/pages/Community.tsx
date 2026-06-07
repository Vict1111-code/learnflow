import { useMemo, useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getReactionsForPosts, getAuthorProfiles } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import PostCard, { POST_TYPE_META } from '@/components/community/PostCard';
import CreatePostDialog from '@/components/community/CreatePostDialog';
import TrendingSidebar from '@/components/community/TrendingSidebar';
import StudyGroupsTab from '@/components/community/StudyGroupsTab';

const FILTERS: Array<{ id: string; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'question', label: 'Questions' },
  { id: 'study_log', label: 'Study Logs' },
  { id: 'project', label: 'Projects' },
];

export default function Community() {
  useAuth();
  const [filter, setFilter] = useState<string>('all');
  const [topicFilter, setTopicFilter] = useState<string | null>(null);
  const [sort, setSort] = useState<'recent' | 'trending'>('recent');
  const [createOpen, setCreateOpen] = useState(false);

  const { data: rawPosts = [], isLoading } = useQuery({
    queryKey: ['posts', filter],
    queryFn: async () => {
      // Map our id to legacy filter format
      const f = filter === 'all' ? 'All' : filter;
      // Bypass legacy mapping: directly query
      const { supabase } = await import('@/integrations/supabase/client');
      let q = supabase.from('community_posts').select('*').order('created_at', { ascending: false });
      if (filter !== 'all') q = q.eq('post_type', filter);
      const { data } = await q;
      return data || [];
    },
  });

  const posts = useMemo(() => {
    let arr = [...rawPosts];
    if (topicFilter) arr = arr.filter((p: any) => p.topic === topicFilter);
    if (sort === 'trending') arr.sort((a: any, b: any) => b.upvotes - a.upvotes);
    return arr;
  }, [rawPosts, topicFilter, sort]);

  const postIds = useMemo(() => posts.map((p: any) => p.id), [posts]);
  const authorIds = useMemo(() => Array.from(new Set(posts.map((p: any) => p.user_id))), [posts]);

  const { data: reactions = [] } = useQuery({
    queryKey: ['post-reactions', postIds.join(',')],
    queryFn: () => getReactionsForPosts(postIds),
    enabled: postIds.length > 0,
  });

  const { data: authors = {} } = useQuery({
    queryKey: ['post-authors', authorIds.join(',')],
    queryFn: () => getAuthorProfiles(authorIds),
    enabled: authorIds.length > 0,
  });

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-3xl font-bold">Community</h1>
            <p className="mt-1 text-sm text-muted-foreground">Learn together. Help others. Earn XP.</p>
          </div>
          <Button onClick={() => setCreateOpen(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Button>
        </motion.div>

        <Tabs defaultValue="feed">
          <TabsList>
            <TabsTrigger value="feed">Feed</TabsTrigger>
            <TabsTrigger value="groups">Study Groups</TabsTrigger>
          </TabsList>

          <TabsContent value="feed" className="mt-4">
            <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
              <div className="min-w-0 space-y-4">
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-2">
                  {FILTERS.map((f) => {
                    const meta = f.id === 'all' ? null : POST_TYPE_META[f.id];
                    const Icon = meta?.icon;
                    const active = filter === f.id;
                    return (
                      <button
                        key={f.id}
                        onClick={() => setFilter(f.id)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                      >
                        {Icon && <Icon className="h-3.5 w-3.5" />} {f.label}
                      </button>
                    );
                  })}
                  <div className="ml-auto flex gap-1 rounded-lg bg-muted p-1">
                    {(['recent', 'trending'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => setSort(s)}
                        className={`rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors ${sort === s ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {topicFilter && (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-muted-foreground">Filtered by topic:</span>
                    <button
                      onClick={() => setTopicFilter(null)}
                      className="rounded-full bg-primary/10 px-2 py-1 font-medium text-primary hover:bg-primary/20"
                    >
                      #{topicFilter} ✕
                    </button>
                  </div>
                )}

                {isLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
                ) : posts.length === 0 ? (
                  <div className="glass-card rounded-xl p-12 text-center">
                    <p className="text-sm text-muted-foreground">No posts yet. Be the first to share.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {posts.map((p: any, i: number) => (
                      <PostCard
                        key={p.id}
                        post={p}
                        reactions={reactions as any}
                        author={(authors as any)[p.user_id]}
                        index={i}
                      />
                    ))}
                  </div>
                )}
              </div>

              <TrendingSidebar onTopicClick={(t) => { setTopicFilter(t); setFilter('all'); }} />
            </div>
          </TabsContent>

          <TabsContent value="groups" className="mt-4">
            <StudyGroupsTab />
          </TabsContent>
        </Tabs>

        <CreatePostDialog open={createOpen} onOpenChange={setCreateOpen} />
      </div>
    </Layout>
  );
}
