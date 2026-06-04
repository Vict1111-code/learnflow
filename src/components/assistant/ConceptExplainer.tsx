import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { callAI } from '@/lib/ai-assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { BookOpen, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const LEVELS = [
  { value: 'beginner', label: 'Beginner', desc: 'Plain English, no jargon' },
  { value: 'intermediate', label: 'Intermediate', desc: 'Some context assumed' },
  { value: 'advanced', label: 'Advanced', desc: 'Deep, technical, nuanced' },
];

export default function ConceptExplainer() {
  const [concept, setConcept] = useState('');
  const [level, setLevel] = useState('beginner');
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleExplain = async () => {
    if (!concept.trim()) return toast.error('Enter a concept to explain');
    setLoading(true);
    setOutput('');
    try {
      const out = await callAI('explain', { concept: concept.trim(), level, topic: concept.trim() });
      setOutput(out?.markdown || '');
    } catch (e: any) {
      toast.error(e.message || 'Failed to explain');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Concept Explainer</h3>
            <p className="text-xs text-muted-foreground">Get a clear, leveled breakdown of any topic.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Input
            value={concept}
            onChange={e => setConcept(e.target.value)}
            placeholder="e.g. Pointers in Go, Recursion, Bayes' theorem"
            onKeyDown={e => e.key === 'Enter' && handleExplain()}
          />
          <div className="grid grid-cols-3 gap-2">
            {LEVELS.map(l => (
              <button
                key={l.value}
                onClick={() => setLevel(l.value)}
                className={`rounded-lg border p-2.5 text-left transition-all ${level === l.value ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/20 hover:border-primary/30'}`}
              >
                <p className={`text-sm font-medium ${level === l.value ? 'text-primary' : 'text-foreground'}`}>{l.label}</p>
                <p className="text-[11px] text-muted-foreground">{l.desc}</p>
              </button>
            ))}
          </div>
          <Button onClick={handleExplain} disabled={loading} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Thinking…' : 'Explain'}
          </Button>
        </div>
      </div>

      {output && (
        <div className="glass-card rounded-xl p-6">
          <div className="prose prose-sm prose-invert max-w-none prose-headings:font-display prose-headings:text-foreground prose-p:text-foreground prose-li:text-foreground prose-strong:text-primary prose-code:rounded prose-code:bg-muted prose-code:px-1.5 prose-code:py-0.5 prose-code:text-primary prose-pre:bg-muted/40">
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}
