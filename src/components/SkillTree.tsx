import { motion } from 'framer-motion';
import { Lock, CheckCircle2, Circle, Sparkles, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

export interface ConceptNode {
  id: string;
  name: string;
  description: string;
  prerequisites: string[];
  status: 'locked' | 'available' | 'completed';
  tier: number;
  dayRange?: string;
}

interface SkillTreeProps {
  concepts: ConceptNode[];
  onConceptClick?: (concept: ConceptNode) => void;
}

const tierColors = [
  { bg: 'bg-xp/20', border: 'border-xp/40', glow: 'shadow-glow-xp', text: 'text-xp', label: 'Foundation' },
  { bg: 'bg-primary/20', border: 'border-primary/40', glow: 'shadow-glow-primary', text: 'text-primary', label: 'Core' },
  { bg: 'bg-level/20', border: 'border-level/40', glow: '', text: 'text-level', label: 'Advanced' },
  { bg: 'bg-streak/20', border: 'border-streak/40', glow: 'shadow-glow-streak', text: 'text-streak', label: 'Expert' },
  { bg: 'bg-highlight/20', border: 'border-highlight/40', glow: '', text: 'text-highlight', label: 'Mastery' },
];

function getNodeStyle(concept: ConceptNode) {
  const tier = tierColors[Math.min(concept.tier, tierColors.length - 1)];

  if (concept.status === 'completed') {
    return {
      container: `${tier.bg} ${tier.border} ${tier.glow} opacity-90`,
      icon: <CheckCircle2 className={`h-5 w-5 ${tier.text}`} />,
      ring: `ring-2 ring-xp/50`,
    };
  }
  if (concept.status === 'locked') {
    return {
      container: 'bg-muted/30 border-border/30 opacity-50',
      icon: <Lock className="h-5 w-5 text-muted-foreground" />,
      ring: '',
    };
  }
  // available
  return {
    container: `${tier.bg} ${tier.border} ${tier.glow} animate-pulse-glow`,
    icon: <Sparkles className={`h-5 w-5 ${tier.text}`} />,
    ring: `ring-2 ring-primary/30`,
  };
}

export default function SkillTree({ concepts, onConceptClick }: SkillTreeProps) {
  const [expanded, setExpanded] = useState(true);

  if (!concepts || concepts.length === 0) return null;

  // Group by tier
  const tiers = new Map<number, ConceptNode[]>();
  concepts.forEach(c => {
    const list = tiers.get(c.tier) || [];
    list.push(c);
    tiers.set(c.tier, list);
  });

  const sortedTiers = Array.from(tiers.entries()).sort((a, b) => a[0] - b[0]);
  const completedCount = concepts.filter(c => c.status === 'completed').length;
  const totalCount = concepts.length;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div className="text-left">
            <h2 className="font-display font-semibold text-foreground">Concept Skill Tree</h2>
            <p className="text-xs text-muted-foreground">{completedCount}/{totalCount} concepts mastered</p>
          </div>
        </div>
        {expanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-6 pt-0">
          {/* Progress bar */}
          <div className="mb-6 h-2 overflow-hidden rounded-full bg-muted">
            <motion.div
              className="h-full rounded-full bg-gradient-xp"
              initial={{ width: 0 }}
              animate={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
              transition={{ duration: 1 }}
            />
          </div>

          {/* Skill tree visualization */}
          <div className="relative space-y-8">
            {sortedTiers.map(([tierNum, nodes], tierIndex) => {
              const tierStyle = tierColors[Math.min(tierNum, tierColors.length - 1)];

              return (
                <div key={tierNum} className="relative">
                  {/* Tier label */}
                  <div className="mb-3 flex items-center gap-2">
                    <span className={`text-[10px] font-bold uppercase tracking-widest ${tierStyle.text}`}>
                      {tierStyle.label}
                    </span>
                    <div className="flex-1 h-px bg-border/30" />
                    <span className="text-[10px] text-muted-foreground">Tier {tierNum}</span>
                  </div>

                  {/* Connection lines to previous tier */}
                  {tierIndex > 0 && (
                    <div className="absolute -top-4 left-1/2 h-4 w-px bg-border/40" />
                  )}

                  {/* Nodes */}
                  <div className="flex flex-wrap justify-center gap-3">
                    {nodes.map((concept, nodeIndex) => {
                      const style = getNodeStyle(concept);

                      return (
                        <Tooltip key={concept.id}>
                          <TooltipTrigger asChild>
                            <motion.button
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              transition={{ delay: tierIndex * 0.15 + nodeIndex * 0.08, type: 'spring', stiffness: 200 }}
                              onClick={() => concept.status !== 'locked' && onConceptClick?.(concept)}
                              disabled={concept.status === 'locked'}
                              className={`relative flex flex-col items-center gap-1.5 rounded-xl border px-4 py-3 transition-all hover:scale-105 ${style.container} ${style.ring} ${
                                concept.status === 'locked' ? 'cursor-not-allowed' : 'cursor-pointer'
                              }`}
                              style={{ minWidth: '120px', maxWidth: '160px' }}
                            >
                              {/* Icon */}
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-background/50">
                                {style.icon}
                              </div>

                              {/* Name */}
                              <span className={`text-xs font-semibold text-center leading-tight ${
                                concept.status === 'locked' ? 'text-muted-foreground' : 'text-foreground'
                              }`}>
                                {concept.name}
                              </span>

                              {/* Day range badge */}
                              {concept.dayRange && (
                                <span className="text-[9px] text-muted-foreground">{concept.dayRange}</span>
                              )}

                              {/* Completion indicator */}
                              {concept.status === 'completed' && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-xp"
                                >
                                  <CheckCircle2 className="h-3 w-3 text-background" />
                                </motion.div>
                              )}
                            </motion.button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-xs">
                            <div className="space-y-1">
                              <p className="font-semibold">{concept.name}</p>
                              <p className="text-xs text-muted-foreground">{concept.description}</p>
                              {concept.prerequisites.length > 0 && (
                                <p className="text-xs text-muted-foreground">
                                  Requires: {concept.prerequisites.map(pid => {
                                    const prereq = concepts.find(c => c.id === pid);
                                    return prereq?.name || pid;
                                  }).join(', ')}
                                </p>
                              )}
                              {concept.status === 'locked' && (
                                <p className="text-xs text-streak font-medium">🔒 Complete prerequisites to unlock</p>
                              )}
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
