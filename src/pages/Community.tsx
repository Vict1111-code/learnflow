import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { ArrowUp, MessageSquare, HelpCircle, Lightbulb, Trophy, Link2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getPosts, createPost, toggleUpvote, getProfile } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

const typeIcons: Record<string, typeof HelpCircle> = {
  question: HelpCircle,
  explanation: Lightbulb,
  achievement: Trophy,
  resource: Link2,
};

const typeColors: Record<string, string> = {
  question: 'bg-primary/10 text-primary',
  explanation: 'bg-xp/10 text-xp',
  achievement: 'bg-streak/10 text-streak',
  resource: 'bg-level/10 text-level',
};

const filters = ['All', 'Questions', 'Explanations', 'Achievements', 'Resources'];

export default function Community() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState('All');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPost, setNewPost] = useState({ type: 'question', title: '', content: '', topic: '' });
  const [creating, setCreating] = useState(false);

  const { data: posts, isLoading } = useQuery({
    queryKey: ['posts', activeFilter],
    queryFn: () => getPosts(activeFilter),
  });

  const handleUpvote = async (postId: string) => {
    if (!user) return;
    try {
      await toggleUpvote(postId, user.id);
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error) {
      toast.error('Failed to update vote');
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setCreating(true);
    try {
      await createPost({
        user_id: user.id,
        post_type: newPost.type,
        title: newPost.title,
        content: newPost.content,
        topic: newPost.topic,
      });
      toast.success('Post created!');
      setShowCreateModal(false);
      setNewPost({ type: 'question', title: '', content: '', topic: '' });
      queryClient.invalidateQueries({ queryKey: ['posts'] });
    } catch (error) {
      toast.error('Failed to create post');
    } finally {
      setCreating(false);
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Community</h1>
            <p className="mt-1 text-muted-foreground">Learn together. Help others. Earn XP.</p>
          </div>
          <Button onClick={() => setShowCreateModal(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New Post
          </Button>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeFilter === f ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Posts */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : posts && posts.length > 0 ? (
          <div className="space-y-4">
            {posts.map((post, i) => {
              const Icon = typeIcons[post.post_type] || HelpCircle;
              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="glass-card rounded-xl p-5"
                >
                  <div className="flex gap-4">
                    {/* Votes */}
                    <div className="flex flex-col items-center gap-1">
                      <button
                        onClick={() => handleUpvote(post.id)}
                        className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>
                      <span className="text-sm font-bold text-foreground">{post.upvotes}</span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="mb-2 flex items-center gap-2">
                        <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[post.post_type]}`}>
                          <Icon className="h-3 w-3" /> {post.post_type}
                        </span>
                        <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{post.topic}</span>
                      </div>
                      <h3 className="text-base font-semibold text-foreground">{post.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                      <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{new Date(post.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="py-12 text-center">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </div>
        )}

        {/* Create Post Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="w-full max-w-lg glass-card rounded-2xl p-6"
            >
              <h2 className="font-display text-xl font-bold text-foreground">Create Post</h2>
              <form onSubmit={handleCreatePost} className="mt-4 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Type</label>
                  <div className="flex gap-2">
                    {['question', 'explanation', 'achievement', 'resource'].map((type) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setNewPost(p => ({ ...p, type }))}
                        className={`rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors ${newPost.type === type ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Title</label>
                  <input
                    type="text"
                    value={newPost.title}
                    onChange={(e) => setNewPost(p => ({ ...p, title: e.target.value }))}
                    required
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Topic</label>
                  <input
                    type="text"
                    value={newPost.topic}
                    onChange={(e) => setNewPost(p => ({ ...p, topic: e.target.value }))}
                    placeholder="e.g., React, TypeScript, General"
                    required
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm text-muted-foreground">Content</label>
                  <textarea
                    value={newPost.content}
                    onChange={(e) => setNewPost(p => ({ ...p, content: e.target.value }))}
                    rows={4}
                    required
                    className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                </div>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={() => setShowCreateModal(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={creating} className="flex-1 bg-gradient-primary text-primary-foreground">
                    {creating ? 'Posting...' : 'Post'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </div>
    </Layout>
  );
}
