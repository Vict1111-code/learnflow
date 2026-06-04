import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getAIHistory } from '@/lib/ai-assistant';
import { History, Brain, BookOpen, ListChecks, Layers, Link2 } from 'lucide-react';

const KIND_META: Record<string, { icon: any; label: string; color: string }> = {
  reflection: { icon: Brain, label: 'Reflection', color: 'text-primary' },
  explain: { icon: BookOpen, label: 'Explanation', color: 'text-level' },
  quiz: { icon: ListChecks, label: 'Quiz', color: 'text-xp' },
  flashcards: { icon: Layers, label: 'Flashcards', color: 'text-streak' },
  resources: { icon: Link2, label: 'Resources', color: 'text-highlight' },
};

export default function AIHistory() {
  const { user } = useAuth();
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ai-history', user?.id],
    queryFn: () => user ? getAIHistory(user.id) : [],
    enabled: !!user,
  });

  if (isLoading) return <div className="glass-card rounded-xl p-8 text-center text-muted-foreground">Loading…</div>;

  if (history.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <History className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">No AI interactions yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Your reflections, explanations, quizzes, and saved cards will show up here.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((h: any) => {
        const meta = KIND_META[h.kind] || KIND_META.reflection;
        const Icon = meta.icon;
        return (
          <div key={h.id} className="glass-card rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/30 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-foreground">
                    {meta.label}{h.topic ? ` — ${h.topic}` : ''}
                  </p>
                  <span className="text-[11px] text-muted-foreground">{new Date(h.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {renderPreview(h)}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function renderPreview(h: any): string {
  const out = h.output || {};
  if (h.kind === 'reflection') return out.summary || (out.strengths || []).join(', ');
  if (h.kind === 'explain') return (out.markdown || '').slice(0, 180);
  if (h.kind === 'quiz') return `${(out.questions || []).length} questions generated`;
  if (h.kind === 'flashcards') return `${(out.flashcards || []).length} flashcards generated`;
  if (h.kind === 'resources') return `${(out.resources || []).length} resources suggested`;
  return '';
}
