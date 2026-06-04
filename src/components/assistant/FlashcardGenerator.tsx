import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callAI, saveFlashcards, getFlashcards, deleteFlashcard, getRecentReflections } from '@/lib/ai-assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layers, Loader2, Sparkles, Trash2, Save, RotateCw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function FlashcardGenerator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [mode, setMode] = useState<'notes' | 'reflection'>('notes');
  const [topic, setTopic] = useState('');
  const [deck, setDeck] = useState('My Flashcards');
  const [content, setContent] = useState('');
  const [count, setCount] = useState(8);
  const [generated, setGenerated] = useState<any[]>([]);
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(false);

  const { data: saved = [] } = useQuery({
    queryKey: ['ai-flashcards', user?.id],
    queryFn: () => user ? getFlashcards(user.id) : [],
    enabled: !!user,
  });

  const { data: reflections = [] } = useQuery({
    queryKey: ['ai-reflections-for-cards', user?.id],
    queryFn: () => user ? getRecentReflections(user.id, 6) : [],
    enabled: !!user && mode === 'reflection',
  });

  const generate = async (sourceText?: string) => {
    const text = sourceText || content;
    if (!text.trim()) return toast.error('Add some content first');
    setLoading(true);
    setGenerated([]);
    setFlipped({});
    try {
      const out = await callAI('flashcards', { source: mode, topic: topic || 'general', content: text, count });
      setGenerated(out?.flashcards || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  const generateFromReflection = (r: any) => {
    const txt = [r.learned, r.challenged, r.revise].filter(Boolean).join('\n');
    setTopic(r.study_sessions?.topic || 'reflection');
    generate(txt);
  };

  const saveAll = async () => {
    if (!user || generated.length === 0) return;
    try {
      await saveFlashcards(user.id, generated, { deck_name: deck, topic, source: mode });
      qc.invalidateQueries({ queryKey: ['ai-flashcards'] });
      toast.success(`Saved ${generated.length} flashcards`);
      setGenerated([]);
    } catch (e: any) {
      toast.error(e.message || 'Save failed');
    }
  };

  const remove = async (id: string) => {
    await deleteFlashcard(id);
    qc.invalidateQueries({ queryKey: ['ai-flashcards'] });
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Layers className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Flashcard Generator</h3>
            <p className="text-xs text-muted-foreground">From your notes or reflections — saved to your account.</p>
          </div>
        </div>

        <div className="mt-4 flex gap-2">
          <button onClick={() => setMode('notes')} className={`flex-1 rounded-lg border p-2 text-sm ${mode === 'notes' ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>From notes</button>
          <button onClick={() => setMode('reflection')} className={`flex-1 rounded-lg border p-2 text-sm ${mode === 'reflection' ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>From reflection</button>
        </div>

        <div className="mt-3 grid gap-2 md:grid-cols-2">
          <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic / subject" />
          <Input value={deck} onChange={e => setDeck(e.target.value)} placeholder="Deck name" />
        </div>

        {mode === 'notes' && (
          <>
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              rows={6}
              placeholder="Paste your notes here…"
              className="mt-3 w-full resize-none rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="mt-3 flex items-center gap-2">
              <select value={count} onChange={e => setCount(Number(e.target.value))} className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-xs text-foreground">
                {[5,8,12,15].map(n => <option key={n} value={n}>{n} cards</option>)}
              </select>
              <Button onClick={() => generate()} disabled={loading} className="flex-1 gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {loading ? 'Generating…' : 'Generate'}
              </Button>
            </div>
          </>
        )}

        {mode === 'reflection' && (
          <div className="mt-3 space-y-2">
            {reflections.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">No reflections yet.</p>}
            {reflections.map((r: any) => (
              <button key={r.id} onClick={() => generateFromReflection(r)} disabled={loading} className="block w-full rounded-lg border border-border bg-muted/20 p-3 text-left transition-all hover:border-primary/40">
                <p className="text-sm font-medium text-foreground">{r.study_sessions?.topic || 'Session'}</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{r.learned || r.challenged}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      {generated.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">{generated.length} cards generated</p>
            <Button size="sm" onClick={saveAll} className="gap-1.5 bg-gradient-primary text-primary-foreground hover:opacity-90"><Save className="h-3.5 w-3.5" /> Save all</Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {generated.map((c, i) => (
              <button
                key={i}
                onClick={() => setFlipped(f => ({ ...f, [i]: !f[i] }))}
                className="group min-h-[120px] rounded-xl border border-border bg-muted/20 p-4 text-left transition-all hover:border-primary/40"
              >
                <div className="mb-1 flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
                  <span>{flipped[i] ? 'Back' : 'Front'}</span>
                  <RotateCw className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                </div>
                <p className="text-sm text-foreground">{flipped[i] ? c.back : c.front}</p>
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {saved.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Saved flashcards ({saved.length})</h4>
          <div className="grid gap-2 sm:grid-cols-2">
            {saved.map((c: any) => (
              <div key={c.id} className="group rounded-lg border border-border bg-muted/20 p-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">{c.deck_name}</span>
                  <button onClick={() => remove(c.id)} className="opacity-0 transition-opacity group-hover:opacity-100"><Trash2 className="h-3.5 w-3.5 text-destructive" /></button>
                </div>
                <p className="text-sm font-medium text-foreground">{c.front}</p>
                <p className="mt-1 text-xs text-muted-foreground">{c.back}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
