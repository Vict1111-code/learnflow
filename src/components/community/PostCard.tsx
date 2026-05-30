import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, HelpCircle, Trophy, Link2, Code2, FolderGit2, BookOpen, ChevronDown, ChevronUp } from 'lucide-react';
import ReactionBar from './ReactionBar';
import CommentThread from './CommentThread';
import { ReactionType, toggleReaction, CommunityPost } from '@/lib/database';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNowStrict } from 'date-fns';
import { toast } from 'sonner';

export const POST_TYPE_META: Record<string, { icon: any; label: string; className: string }> = {
  question: { icon: HelpCircle, label: 'Question', className: 'bg-primary/10 text-primary' },
  achievement: { icon: Trophy, label: 'Achievement', className: 'bg-streak/10 text-streak' },
  study_log: { icon: BookOpen, label: 'Study Log', className: 'bg-level/10 text-level' },
  resource: { icon: Link2, label: 'Resource', className: 'bg-xp/10 text-xp' },
  project: { icon: FolderGit2, label: 'Project', className: 'bg-emerald-500/10 text-emerald-400' },
  code_snippet: { icon: Code2, label: 'Code', className: 'bg-violet-500/10 text-violet-400' },
  explanation: { icon: BookOpen, label: 'Explanation', className: 'bg-xp/10 text-xp' },
};

interface Props {
  post: CommunityPost;
  reactions: { post_id: string; user_id: string; reaction_type: ReactionType }[];
  author?: { name: string; avatar_url: string | null };
  index: number;
}

export default function PostCard({ post, reactions, author, index }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const meta = POST_TYPE_META[post.post_type] || POST_TYPE_META.question;
  const Icon = meta.icon;
  const initial = (author?.name || 'U').charAt(0).toUpperCase();

  const handleReaction = async (reaction: ReactionType) => {
    if (!user) return;
    try {
      await toggleReaction(post.id, user.id, reaction);
      qc.invalidateQueries({ queryKey: ['post-reactions'] });
      if (reaction === 'upvote') qc.invalidateQueries({ queryKey: ['posts'] });
    } catch {
      toast.error('Failed to update reaction');
    }
  };

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.4) }}
      className="glass-card group rounded-xl p-5 transition-all hover:border-primary/30 hover:shadow-lg"
    >
      <div className="flex gap-3">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">{initial}</div>
        )}

        <div className="min-w-0 flex-1">
          <header className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{author?.name || 'User'}</span>
            <span>·</span>
            <span>{formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}</span>
            <span className={`ml-1 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${meta.className}`}>
              <Icon className="h-3 w-3" /> {meta.label}
            </span>
            {post.topic && (
              <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium">#{post.topic}</span>
            )}
          </header>

          <h3 className="mt-1.5 font-display text-base font-semibold text-foreground">{post.title}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">{post.content}</p>

          <div className="mt-3 flex items-center justify-between gap-3">
            <ReactionBar postId={post.id} userId={user?.id || null} reactions={reactions} onToggle={handleReaction} />
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted/30 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
            >
              <MessageSquare className="h-3.5 w-3.5" />
              Comments
              {open ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {open && <CommentThread postId={post.id} />}
        </div>
      </div>
    </motion.article>
  );
}
