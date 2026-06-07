import { BookOpen, ListChecks, NotebookPen, LucideIcon } from 'lucide-react';

export type AIModeId = 'explain' | 'quiz' | 'review';

export interface AIMode {
  id: AIModeId;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  systemHint: string;
}

// Phase 1 modes — keep the assistant focused. Additional modes can be reintroduced later.
export const AI_MODES: AIMode[] = [
  {
    id: 'explain',
    label: 'Explain',
    description: 'Break down any concept',
    icon: BookOpen,
    placeholder: 'Explain recursion at beginner level…',
    systemHint: 'Explain the concept clearly with examples. Use markdown.',
  },
  {
    id: 'quiz',
    label: 'Quiz Generator',
    description: 'Create quizzes from any topic',
    icon: ListChecks,
    placeholder: 'Generate 5 quiz questions on Big-O notation…',
    systemHint: 'Generate a quiz with varied question types and short explanations.',
  },
  {
    id: 'review',
    label: 'Session Review',
    description: 'Analyze a study session',
    icon: NotebookPen,
    placeholder: 'Review my last session and highlight gaps…',
    systemHint: 'Identify strengths, weak areas, and revision topics.',
  },
];

export const getMode = (id: AIModeId) => AI_MODES.find((m) => m.id === id) ?? AI_MODES[0];
