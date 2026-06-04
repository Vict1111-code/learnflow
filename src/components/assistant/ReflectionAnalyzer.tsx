import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { callAI, getRecentReflections } from '@/lib/ai-assistant';
import { Button } from '@/components/ui/button';
import { Brain, Loader2, Sparkles, Target, AlertTriangle, ArrowRight, Heart } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ReflectionAnalyzer() {
  const { user } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const { data: reflections = [], isLoading } = useQuery({
    queryKey: ['ai-recent-reflections', user?.id],
    queryFn: () => user ? getRecentReflections(user.id, 8) : [],
    enabled: !!user,
  });

  const analyze = async (r: any) => {
    setSelectedId(r.id);
    setLoading(true);
    setAnalysis(null);
    try {
      const out = await callAI('reflection', {
        topic: r.study_sessions?.topic || 'general',
        minutes: Math.round((r.study_sessions?.duration_seconds || 0) / 60),
        focus_rating: r.focus_rating,
        mood: r.mood,
        learned: r.learned,
        challenged: r.challenged,
        revise: r.revise,
        distractions: r.distractions,
      });
      setAnalysis(out);
    } catch (e: any) {
      toast.error(e.message || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading) return <div className="glass-card rounded-xl p-8 text-center text-muted-foreground"><Loader2 className="mx-auto h-5 w-5 animate-spin" /></div>;

  if (reflections.length === 0) {
    return (
      <div className="glass-card rounded-xl p-8 text-center">
        <Brain className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
        <p className="font-medium text-foreground">No reflections yet</p>
        <p className="mt-1 text-sm text-muted-foreground">Complete a study session and write a reflection — then come back here for AI coaching.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
      <div className="space-y-2">
        <p className="px-1 text-xs uppercase tracking-wide text-muted-foreground">Recent reflections</p>
        {reflections.map((r: any) => (
          <button
            key={r.id}
            onClick={() => analyze(r)}
            className={`w-full rounded-xl border p-3 text-left transition-all ${selectedId === r.id ? 'border-primary/60 bg-primary/5' : 'border-border bg-muted/20 hover:border-primary/30'}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-foreground">{r.study_sessions?.topic || 'Session'}</span>
              <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
            </div>
            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.learned || r.challenged || 'No notes'}</p>
          </button>
        ))}
      </div>

      <div className="glass-card rounded-xl p-5">
        {loading && (
          <div className="flex h-48 flex-col items-center justify-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Analyzing your reflection…</p>
          </div>
        )}
        {!loading && !analysis && (
          <div className="flex h-48 flex-col items-center justify-center text-center text-muted-foreground">
            <Sparkles className="mb-2 h-6 w-6 text-primary" />
            <p className="text-sm">Pick a reflection to get personalized coaching.</p>
          </div>
        )}
        {!loading && analysis && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {analysis.summary && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
                {analysis.summary}
              </div>
            )}
            <Section icon={<Sparkles className="h-4 w-4 text-xp" />} title="Strengths" items={analysis.strengths} color="text-xp" />
            <Section icon={<AlertTriangle className="h-4 w-4 text-streak" />} title="Weak areas" items={analysis.weak_areas} color="text-streak" />
            <Section icon={<Target className="h-4 w-4 text-primary" />} title="Revise these" items={analysis.revision_topics} color="text-primary" />
            <Section icon={<ArrowRight className="h-4 w-4 text-level" />} title="Next steps" items={analysis.next_steps} color="text-level" />
            {analysis.encouragement && (
              <div className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 p-3 text-sm italic text-muted-foreground">
                <Heart className="mt-0.5 h-4 w-4 shrink-0 text-streak" />
                {analysis.encouragement}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function Section({ icon, title, items, color }: { icon: React.ReactNode; title: string; items?: string[]; color: string }) {
  if (!items?.length) return null;
  return (
    <div>
      <div className={`mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide ${color}`}>
        {icon} {title}
      </div>
      <ul className="space-y-1">
        {items.map((it, i) => (
          <li key={i} className="rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-foreground">{it}</li>
        ))}
      </ul>
    </div>
  );
}
