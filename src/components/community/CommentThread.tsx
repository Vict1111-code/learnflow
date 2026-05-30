import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, Trash2, CornerDownRight, Loader2 } from 'lucide-react';
import { getComments, addComment, deleteComment, getAuthorProfiles, PostComment } from '@/lib/database';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { formatDistanceToNowStrict } from 'date-fns';

interface Props { postId: string }

interface Node extends PostComment { children: Node[] }

function buildTree(comments: PostComment[]): Node[] {
  const map = new Map<string, Node>();
  comments.forEach((c) => map.set(c.id, { ...c, children: [] }));
  const roots: Node[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
}

function CommentRow({
  node, depth, authors, onReply, onDelete, currentUserId,
}: {
  node: Node;
  depth: number;
  authors: Record<string, { name: string; avatar_url: string | null }>;
  onReply: (parentId: string, content: string) => Promise<void>;
  onDelete: (id: string) => void;
  currentUserId: string | null;
}) {
  const [replying, setReplying] = useState(false);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const author = authors[node.user_id];
  const initial = (author?.name || 'U').charAt(0).toUpperCase();

  return (
    <div className={depth > 0 ? 'border-l border-border/40 pl-3' : ''}>
      <div className="flex gap-2.5 py-2">
        {author?.avatar_url ? (
          <img src={author.avatar_url} alt="" className="h-7 w-7 shrink-0 rounded-full object-cover" />
        ) : (
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-[11px] font-bold text-primary-foreground">{initial}</div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{author?.name || 'User'}</span>
            <span>·</span>
            <span>{formatDistanceToNowStrict(new Date(node.created_at), { addSuffix: true })}</span>
          </div>
          <p className="mt-0.5 whitespace-pre-wrap break-words text-sm text-foreground">{node.content}</p>
          <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
            <button onClick={() => setReplying((v) => !v)} className="inline-flex items-center gap-1 hover:text-foreground">
              <CornerDownRight className="h-3 w-3" /> Reply
            </button>
            {currentUserId === node.user_id && (
              <button onClick={() => onDelete(node.id)} className="inline-flex items-center gap-1 hover:text-destructive">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            )}
          </div>
          <AnimatePresence>
            {replying && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                <div className="mt-2 flex gap-2">
                  <input
                    autoFocus
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Reply..."
                    className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-1.5 text-sm focus:border-primary focus:outline-none"
                  />
                  <Button
                    size="sm"
                    disabled={busy || !text.trim()}
                    onClick={async () => {
                      setBusy(true);
                      try { await onReply(node.id, text.trim()); setText(''); setReplying(false); } finally { setBusy(false); }
                    }}
                  >
                    {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Send'}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
      {node.children.length > 0 && (
        <div className="ml-3 space-y-0">
          {node.children.map((child) => (
            <CommentRow key={child.id} node={child} depth={depth + 1} authors={authors} onReply={onReply} onDelete={onDelete} currentUserId={currentUserId} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentThread({ postId }: Props) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', postId],
    queryFn: () => getComments(postId),
  });

  const authorIds = useMemo(() => Array.from(new Set(comments.map((c) => c.user_id))), [comments]);
  const { data: authors = {} } = useQuery({
    queryKey: ['comment-authors', postId, authorIds.join(',')],
    queryFn: () => getAuthorProfiles(authorIds),
    enabled: authorIds.length > 0,
  });

  const tree = useMemo(() => buildTree(comments), [comments]);

  const reload = () => qc.invalidateQueries({ queryKey: ['comments', postId] });

  const handleSend = async (parentId: string | null, content: string) => {
    if (!user) return;
    try {
      await addComment(postId, user.id, content, parentId);
      reload();
    } catch {
      toast.error('Failed to add comment');
    }
  };

  return (
    <div className="mt-3 border-t border-border/50 pt-3">
      {isLoading ? (
        <div className="py-4 text-center"><Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" /></div>
      ) : tree.length === 0 ? (
        <p className="py-2 text-xs text-muted-foreground">No comments yet. Start the discussion.</p>
      ) : (
        <div className="space-y-0">
          {tree.map((node) => (
            <CommentRow
              key={node.id}
              node={node}
              depth={0}
              authors={authors}
              onReply={(parentId, content) => handleSend(parentId, content)}
              onDelete={async (id) => { await deleteComment(id); reload(); }}
              currentUserId={user?.id || null}
            />
          ))}
        </div>
      )}

      {user && (
        <div className="mt-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && text.trim()) { e.preventDefault(); setPosting(true); handleSend(null, text.trim()).finally(() => { setText(''); setPosting(false); }); } }}
            placeholder="Add a comment..."
            className="flex-1 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
          <Button
            size="sm"
            disabled={posting || !text.trim()}
            onClick={async () => { setPosting(true); try { await handleSend(null, text.trim()); setText(''); } finally { setPosting(false); } }}
          >
            {posting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Post'}
          </Button>
        </div>
      )}
    </div>
  );
}
