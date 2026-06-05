import {
  BookOpen, ListChecks, Layers, Compass, Link2, NotebookPen, Target, Map, LucideIcon,
} from 'lucide-react';

export type AIModeId =
  | 'explain' | 'quiz' | 'flashcards' | 'coach'
  | 'resources' | 'review' | 'goal' | 'roadmap';

export interface AIMode {
  id: AIModeId;
  label: string;
  description: string;
  icon: LucideIcon;
  placeholder: string;
  systemHint: string;
}

export const AI_MODES: AIMode[] = [
  { id: 'explain',    label: 'Explain',         description: 'Break down any concept',          icon: BookOpen,    placeholder: 'Explain recursion at beginner level…',           systemHint: 'Explain the concept clearly with examples. Use markdown.' },
  { id: 'quiz',       label: 'Quiz Generator',  description: 'Create quizzes from any topic',   icon: ListChecks,  placeholder: 'Generate 5 quiz questions on Big-O notation…',   systemHint: 'Generate a quiz with varied question types and short explanations.' },
  { id: 'flashcards', label: 'Flashcards',      description: 'Build spaced-repetition cards',   icon: Layers,      placeholder: 'Make flashcards from these notes…',              systemHint: 'Create atomic Q/A flashcards. Keep answers concise.' },
  { id: 'coach',      label: 'Study Coach',     description: 'Plan, pace, and stay accountable',icon: Compass,     placeholder: 'I have 90 min today, what should I focus on?',   systemHint: 'Coach with empathy. Reference learner context when available.' },
  { id: 'resources',  label: 'Resource Finder', description: 'Curated free learning resources', icon: Link2,       placeholder: 'Find free resources to learn TypeScript…',       systemHint: 'Suggest high-quality FREE resources. Verify nothing — just describe.' },
  { id: 'review',     label: 'Session Review',  description: 'Analyze a study session',         icon: NotebookPen, placeholder: 'Review my last session and highlight gaps…',     systemHint: 'Identify strengths, weak areas, and revision topics.' },
  { id: 'goal',       label: 'Goal Planner',    description: 'Turn ambitions into milestones',  icon: Target,      placeholder: 'I want to learn React in 6 weeks…',              systemHint: 'Decompose the goal into weekly milestones and daily actions.' },
  { id: 'roadmap',    label: 'Learning Roadmap',description: 'Step-by-step learning path',      icon: Map,         placeholder: 'Build a backend engineer roadmap…',              systemHint: 'Produce a structured roadmap with phases, topics, and checkpoints.' },
];

export const getMode = (id: AIModeId) => AI_MODES.find(m => m.id === id) ?? AI_MODES[0];
