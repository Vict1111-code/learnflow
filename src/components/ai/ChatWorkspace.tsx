import { useEffect } from 'react';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import ModeSelector from './ModeSelector';
import MessageList from './MessageList';
import ChatComposer from './ChatComposer';
import EmptyState from './EmptyState';
import { useLearningContext } from '@/hooks/useLearningContext';

export default function ChatWorkspace({ compact }: { compact?: boolean }) {
  const { activeChat, setLearningContext } = useAIAssistant();
  const { data: ctx } = useLearningContext();

  useEffect(() => { setLearningContext(ctx); }, [ctx, setLearningContext]);

  const hasMessages = !!activeChat && activeChat.messages.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border/60 bg-background/40 px-2 pt-2 backdrop-blur-xl">
        <ModeSelector compact={compact} />
      </div>

      {hasMessages ? (
        <MessageList />
      ) : (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <EmptyState />
        </div>
      )}

      <ChatComposer compact={compact} />
    </div>
  );
}
