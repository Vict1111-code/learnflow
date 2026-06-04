import { useState } from 'react';
import { callAI } from '@/lib/ai-assistant';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Link2, Loader2, Sparkles, ExternalLink, FileText, Video, Github, BookOpen, GraduationCap } from 'lucide-react';
import { toast } from 'sonner';

const TYPE_ICON: Record<string, any> = {
  documentation: BookOpen, video: Video, article: FileText, github: Github, course: GraduationCap,
};

const TYPE_COLOR: Record<string, string> = {
  documentation: 'text-primary border-primary/30 bg-primary/10',
  video: 'text-streak border-streak/30 bg-streak/10',
  article: 'text-xp border-xp/30 bg-xp/10',
  github: 'text-foreground border-border bg-muted/30',
  course: 'text-level border-level/30 bg-level/10',
};

export default function ResourceRecommender() {
  const [topic, setTopic] = useState('');
  const [level, setLevel] = useState('beginner');
  const [resources, setResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const recommend = async () => {
    if (!topic.trim()) return toast.error('Enter a topic');
    setLoading(true);
    setResources([]);
    try {
      const out = await callAI('resources', { topic: topic.trim(), level });
      setResources(out?.resources || []);
    } catch (e: any) {
      toast.error(e.message || 'Failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Link2 className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h3 className="font-display font-semibold text-foreground">Resource Recommender</h3>
            <p className="text-xs text-muted-foreground">Free docs, videos, articles, and GitHub repos — curated for you.</p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <Input value={topic} onChange={e => setTopic(e.target.value)} placeholder="What do you want to learn?" onKeyDown={e => e.key === 'Enter' && recommend()} />
          <div className="flex gap-2">
            {['beginner', 'intermediate', 'advanced'].map(l => (
              <button key={l} onClick={() => setLevel(l)} className={`flex-1 rounded-lg border p-2 text-xs capitalize ${level === l ? 'border-primary/60 bg-primary/10 text-primary' : 'border-border bg-muted/20 text-muted-foreground'}`}>{l}</button>
            ))}
          </div>
          <Button onClick={recommend} disabled={loading} className="w-full gap-2 bg-gradient-primary text-primary-foreground hover:opacity-90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
            {loading ? 'Curating…' : 'Recommend resources'}
          </Button>
        </div>
      </div>

      {resources.length > 0 && (
        <div className="grid gap-3 md:grid-cols-2">
          {resources.map((r, i) => {
            const Icon = TYPE_ICON[r.type] || FileText;
            return (
              <a key={i} href={r.url} target="_blank" rel="noopener noreferrer" className="group glass-card rounded-xl p-4 transition-all hover:border-primary/40">
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${TYPE_COLOR[r.type] || TYPE_COLOR.article}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground group-hover:text-primary">{r.title}</p>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>
                    <span className={`mt-2 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${TYPE_COLOR[r.type] || TYPE_COLOR.article}`}>{r.type}</span>
                  </div>
                </div>
              </a>
            );
          })}
        </div>
      )}
    </div>
  );
}
