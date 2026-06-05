import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useLearningContext } from '@/hooks/useLearningContext';
import { useEffect } from 'react';
import ChatWorkspace from './ChatWorkspace';
import { Button } from '@/components/ui/button';
import { ExternalLink, Plus, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AIDrawer() {
  const { drawerOpen, closeDrawer, newChat, setLearningContext } = useAIAssistant();
  const { data: ctx } = useLearningContext();

  useEffect(() => { setLearningContext(ctx); }, [ctx, setLearningContext]);

  return (
    <Sheet open={drawerOpen} onOpenChange={(o) => !o && closeDrawer()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 border-l border-border/60 bg-background/95 p-0 backdrop-blur-2xl sm:max-w-[500px]"
      >
        <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b border-border/60 bg-background/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] shadow-glow-primary">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <SheetTitle className="text-sm font-semibold">AI Assistant</SheetTitle>
          </div>
          <div className="flex items-center gap-1">
            <Button size="sm" variant="ghost" onClick={() => newChat()} className="gap-1.5 text-xs">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
            <Button size="sm" variant="ghost" asChild className="gap-1.5 text-xs" onClick={closeDrawer}>
              <Link to="/ai"><ExternalLink className="h-3.5 w-3.5" /> Open</Link>
            </Button>
          </div>
        </SheetHeader>

        <div className="flex-1 min-h-0">
          <ChatWorkspace compact />
        </div>
      </SheetContent>
    </Sheet>
  );
}
