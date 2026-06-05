import { AI_MODES, AIModeId } from '@/lib/ai-modes';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function ModeSelector({ compact }: { compact?: boolean }) {
  const { mode, setMode } = useAIAssistant();
  return (
    <ScrollArea className="w-full">
      <div className={cn('flex gap-1.5 pb-2', compact ? 'px-3' : 'px-1')}>
        {AI_MODES.map(m => {
          const active = mode === m.id;
          const Icon = m.icon;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id as AIModeId)}
              title={m.description}
              className={cn(
                'group flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all',
                active
                  ? 'border-primary/60 bg-primary/10 text-primary shadow-glow-primary'
                  : 'border-border/60 bg-card/40 text-muted-foreground hover:border-border hover:bg-card hover:text-foreground'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {m.label}
            </button>
          );
        })}
      </div>
    </ScrollArea>
  );
}
