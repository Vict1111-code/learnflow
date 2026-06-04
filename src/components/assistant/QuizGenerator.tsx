import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { callAI, saveQuiz, getQuizHistory } from '@/lib/ai-assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ListChecks, Loader2, Sparkles, Check, X, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const DIFFICULTIES = ['easy', 'medium', 'hard'];
const TYPES = [
  { value: 'mcq', label: 'MCQ' },
  { value: 'true_false', label: 'True/False' },
  { value: 'short_answer', label: 'Short Answer' },
];

interface Question {
  type: 'mcq' | 'true_false' | 'short_answer';
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

export default function QuizGenerator() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [types, setTypes] = useState<string[]>(['mcq']);
  const [count, setCount] = useState(5);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: history = [] } = useQuery({
    queryKey: ['ai-quiz-history', user?.id],
    queryFn: () => user ? getQuizHistory(user.id) : [],
    enabled: !!user,
  });

  const toggleType = (t: string) => {
    setTypes(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const generate = async () => {
    if (!topic.trim()) return toast.error('Enter a topic');
    if (types.length === 0) return toast.error('Select at least one type');
    setLoading(true);
    setQuestions([]);
    setAnswers({});
    setSubmitted(false);
    try {
      const out = await callAI('quiz', { topic: topic.trim(), difficulty, types, count });
      setQuestions(out?.questions || []);
    } catch (e: any) {
      toast.error(e.message || 'Quiz failed');
    } finally {
      setLoading(false);
    }
  };

  const score = submitted
    ? questions.reduce((acc, q, i) => acc + (matches(answers[i], q.answer) ? 1 : 0), 0)
    : 0;

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitted(true);
    const sc = questions.reduce((acc, q, i) => acc + (matches(answers[i], q.answer) ? 1 : 0), 0);
    try {
      await saveQuiz(user.id, {
        topic, difficulty, question_types: types, questions,
        score: sc, total_questions: questions.length, answers,
        completed_at: new Date().toISOString(),
      });
      qc.invalidateQueries({ queryKey: ['ai-quiz-history'] });
      toast.success(`Scored ${sc}/${questions.length}`);
    } catch (e: any) {
      console.error(e);
    }
  };

  const reset = () => { setQuestions([]); setAnswers({}); setSubmitted(false); };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <ListChecks className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Quiz Generator</h3>
            <p className="text-xs text-muted-foreground">Test yourself on any topic. Tracked in your history.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Topic (e.g. JavaScript closures)" />
          <div className="flex flex-wrap gap-2">
            {DIFFICULTIES.map(d => (
              <button key={d} onClick={() => setDifficulty(d)} className={`rounded-full border px-3 py-1.5 text-xs font-medium capitalize transition-all ${difficulty === d ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}>{d}</button>
            ))}
            <span className="mx-2 text-muted-foreground">•</span>
            {TYPES.map(t => (
              <button key={t.value} onClick={() => toggleType(t.value)} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${types.includes(t.value) ? 'border-primary/60 bg-primary/15 text-primary' : 'border-border bg-muted/20 text-muted-foreground hover:text-foreground'}`}>{t.label}</button>
            ))}
            <span className="mx-2 text-muted-foreground">•</span>
            <select value={count} onChange={e => setCount(Number(e.target.value))} className="rounded-full border border-border bg-muted/20 px-3 py-1.5 text-xs text-foreground">
              {[3,5,8,10].map(n => <option key={n} value={n}>{n} questions</option>)}
            </select>
          </div>
          <Button onClick={generate} disabled={loading} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Generating…' : 'Generate quiz'}
          </Button>
        </div>
      </div>

      {questions.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-xl p-5 space-y-4">
          {submitted && (
            <div className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/10 p-3">
              <p className="font-medium text-foreground">Score: <span className="text-primary">{score}/{questions.length}</span></p>
              <Button size="sm" variant="ghost" onClick={reset} className="gap-1"><RotateCcw className="h-3.5 w-3.5" /> New quiz</Button>
            </div>
          )}
          {questions.map((q, i) => (
            <QuestionCard key={i} q={q} idx={i} answer={answers[i] || ''} setAnswer={(v) => setAnswers(a => ({ ...a, [i]: v }))} submitted={submitted} />
          ))}
          {!submitted && (
            <Button onClick={handleSubmit} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">Submit quiz</Button>
          )}
        </motion.div>
      )}

      {history.length > 0 && (
        <div className="glass-card rounded-xl p-5">
          <h4 className="mb-3 text-sm font-semibold text-foreground">Quiz history</h4>
          <div className="space-y-2">
            {history.slice(0, 8).map((h: any) => (
              <div key={h.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-foreground">{h.topic}</p>
                  <p className="text-[11px] text-muted-foreground">{h.difficulty} • {new Date(h.created_at).toLocaleDateString()}</p>
                </div>
                {h.score !== null && (
                  <span className="rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">{h.score}/{h.total_questions}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function matches(given: string, correct: string) {
  if (!given) return false;
  return given.trim().toLowerCase() === String(correct).trim().toLowerCase();
}

function QuestionCard({ q, idx, answer, setAnswer, submitted }: { q: Question; idx: number; answer: string; setAnswer: (v: string) => void; submitted: boolean }) {
  const correct = submitted && matches(answer, q.answer);
  return (
    <div className={`rounded-lg border p-4 ${submitted ? (correct ? 'border-xp/40 bg-xp/5' : 'border-destructive/40 bg-destructive/5') : 'border-border bg-muted/20'}`}>
      <p className="mb-3 font-medium text-foreground"><span className="mr-2 text-muted-foreground">{idx + 1}.</span>{q.question}</p>

      {q.type === 'mcq' && q.options && (
        <div className="space-y-1.5">
          {q.options.map((opt, oi) => {
            const selected = answer === opt;
            const isCorrect = submitted && matches(opt, q.answer);
            return (
              <button
                key={oi}
                disabled={submitted}
                onClick={() => setAnswer(opt)}
                className={`flex w-full items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-all ${
                  isCorrect ? 'border-xp/50 bg-xp/10 text-foreground'
                  : selected ? 'border-primary/60 bg-primary/10 text-foreground'
                  : 'border-border bg-muted/10 text-foreground hover:border-primary/30'
                }`}
              >
                <span>{opt}</span>
                {submitted && isCorrect && <Check className="h-4 w-4 text-xp" />}
                {submitted && selected && !isCorrect && <X className="h-4 w-4 text-destructive" />}
              </button>
            );
          })}
        </div>
      )}

      {q.type === 'true_false' && (
        <div className="flex gap-2">
          {['true', 'false'].map(v => (
            <button key={v} disabled={submitted} onClick={() => setAnswer(v)} className={`flex-1 rounded-md border px-3 py-2 text-sm capitalize ${answer === v ? 'border-primary/60 bg-primary/10' : 'border-border bg-muted/10'}`}>{v}</button>
          ))}
        </div>
      )}

      {q.type === 'short_answer' && (
        <Input value={answer} onChange={e => setAnswer(e.target.value)} disabled={submitted} placeholder="Your answer..." />
      )}

      {submitted && (
        <div className="mt-3 rounded-md border border-border/50 bg-muted/30 p-2.5 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">Answer:</span> {q.answer}
          {q.explanation && <div className="mt-1">{q.explanation}</div>}
        </div>
      )}
    </div>
  );
}
