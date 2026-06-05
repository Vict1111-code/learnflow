import { BookOpen, ListChecks, Layers, NotebookPen, Map, Link2, LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { AIModeId } from '@/lib/ai-modes';

interface Action { id: AIModeId; label: string; prompt: string; icon: LucideIcon; }
const ACTIONS: Action[] = [
  { id: 'explain',    label: 'Explain a concept',   prompt: 'Explain ',                                 icon: BookOpen },
  { id: 'quiz',       label: 'Generate a quiz',     prompt: 'Generate a 5-question quiz on ',           icon: ListChecks },
  { id: 'flashcards', label: 'Create flashcards',   prompt: 'Create 10 flashcards on ',                 icon: Layers },
  { id: 'review',     label: 'Analyze session',     prompt: 'Analyze my latest study session and ',     icon: NotebookPen },
  { id: 'roadmap',    label: 'Build a roadmap',     prompt: 'Build a learning roadmap for ',            icon: Map },
  { id: 'resources',  label: 'Find resources',      prompt: 'Find free learning resources for ',        icon: Link2 },
];

export default function QuickActions({ onPick }: { onPick: (text: string) => void }) {
  const { setMode } = useAIAssistant();
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {ACTIONS.map((a, i) => {
        const Icon = a.icon;
        return (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            whileHover={{ y: -2 }}
            onClick={() => { setMode(a.id); onPick(a.prompt); }}
            className="group relative overflow-hidden rounded-xl border border-border/60 bg-card/50 p-3 text-left backdrop-blur-xl transition-all hover:border-primary/40 hover:shadow-glow-primary"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-[hsl(var(--level-purple))]/5 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="relative flex items-start gap-2.5">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <div className="text-xs font-medium text-foreground">{a.label}</div>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}
