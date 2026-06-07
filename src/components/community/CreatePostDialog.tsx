import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { createPost } from '@/lib/database';
import { toast } from 'sonner';
import { POST_TYPE_META } from './PostCard';

// Trimmed to the four post types LearnFlow supports.
const TYPES = ['question', 'study_log', 'project'] as const;

export default function CreatePostDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [type, setType] = useState<string>('question');
  const [title, setTitle] = useState('');
  const [topic, setTopic] = useState('');
  const [content, setContent] = useState('');
  const [busy, setBusy] = useState(false);

  const reset = () => { setType('question'); setTitle(''); setTopic(''); setContent(''); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (title.trim().length < 3) { toast.error('Title too short'); return; }
    if (title.length > 200) { toast.error('Title too long'); return; }
    setBusy(true);
    try {
      await createPost({ user_id: user.id, post_type: type, title: title.trim(), content: content.trim(), topic: topic.trim() });
      toast.success('Post created');
      reset();
      onOpenChange(false);
      qc.invalidateQueries({ queryKey: ['posts'] });
    } catch {
      toast.error('Failed to create post');
    } finally { setBusy(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create Post</DialogTitle>
          <DialogDescription>Ask a question, share a study log, or showcase a project.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Type</label>
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => {
                const meta = POST_TYPE_META[t];
                const Icon = meta.icon;
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {meta.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Title</label>
            <input
              value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={200}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Topic</label>
            <input
              value={topic} onChange={(e) => setTopic(e.target.value)} required maxLength={50}
              placeholder="React, Python, Productivity..."
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm text-muted-foreground">Content</label>
            <textarea
              value={content} onChange={(e) => setContent(e.target.value)} required rows={5} maxLength={5000}
              className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div className="flex gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">Cancel</Button>
            <Button type="submit" disabled={busy} className="flex-1 bg-gradient-primary text-primary-foreground">{busy ? 'Posting...' : 'Post'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
