import { motion } from 'framer-motion';
import {
  ExternalLink, BookOpen, Video, FileText, GraduationCap, Wrench, Book,
  ChevronDown, ChevronUp, Headphones, Rss, Users, Github,
} from 'lucide-react';
import { useState } from 'react';

export type ResourceType =
  | 'article' | 'video' | 'documentation' | 'book' | 'course' | 'tool'
  | 'podcast' | 'blog' | 'community' | 'github';

export interface Resource {
  title: string;
  url: string;
  type: ResourceType;
  conceptId?: string;
  description: string;
  source?: string;
  free?: boolean;
}

interface ResourceListProps {
  resources: Resource[];
  conceptNames?: Record<string, string>;
}

const typeIcons: Record<string, React.ReactNode> = {
  article: <FileText className="h-4 w-4" />,
  video: <Video className="h-4 w-4" />,
  documentation: <BookOpen className="h-4 w-4" />,
  book: <Book className="h-4 w-4" />,
  course: <GraduationCap className="h-4 w-4" />,
  tool: <Wrench className="h-4 w-4" />,
  podcast: <Headphones className="h-4 w-4" />,
  blog: <Rss className="h-4 w-4" />,
  community: <Users className="h-4 w-4" />,
  github: <Github className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  article: 'bg-primary/10 text-primary border-primary/20',
  video: 'bg-streak/10 text-streak border-streak/20',
  documentation: 'bg-highlight/10 text-highlight border-highlight/20',
  book: 'bg-level/10 text-level border-level/20',
  course: 'bg-xp/10 text-xp border-xp/20',
  tool: 'bg-muted text-muted-foreground border-border',
  podcast: 'bg-streak/10 text-streak border-streak/20',
  blog: 'bg-primary/10 text-primary border-primary/20',
  community: 'bg-level/10 text-level border-level/20',
  github: 'bg-muted text-foreground border-border',
};

export default function ResourceList({ resources, conceptNames }: ResourceListProps) {
  const [expanded, setExpanded] = useState(false);

  if (!resources || resources.length === 0) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-xp">
            <BookOpen className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h2 className="font-display font-semibold text-foreground">Recommended Resources</h2>
            <p className="text-xs text-muted-foreground">{resources.length} curated learning resources</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="space-y-2 px-4 pb-4">
          {resources.map((resource, i) => (
            <motion.a
              key={i}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3 transition-all hover:bg-muted/40 hover:border-primary/30 group"
            >
              <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${typeColors[resource.type] || typeColors.tool}`}>
                {typeIcons[resource.type] || typeIcons.tool}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                  {resource.title}
                </p>
                <p className="text-xs text-muted-foreground truncate">{resource.description}</p>
                {resource.conceptId && conceptNames?.[resource.conceptId] && (
                  <span className="text-[10px] text-muted-foreground">
                    For: {conceptNames[resource.conceptId]}
                  </span>
                )}
              </div>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
            </motion.a>
          ))}
        </div>
      )}
    </div>
  );
}
