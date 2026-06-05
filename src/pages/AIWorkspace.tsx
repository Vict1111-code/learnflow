import { useEffect } from 'react';
import Layout from '@/components/Layout';
import ChatWorkspace from '@/components/ai/ChatWorkspace';
import ChatHistorySidebar from '@/components/ai/ChatHistorySidebar';
import LearningContextPanel from '@/components/ai/LearningContextPanel';
import { useAIAssistant } from '@/contexts/AIAssistantContext';

export default function AIWorkspace() {
  const { closeDrawer } = useAIAssistant();
  useEffect(() => { closeDrawer(); }, [closeDrawer]);

  return (
    <Layout fullBleed>
      <div className="grid h-[calc(100vh-4rem)] min-h-[600px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-card/30 backdrop-blur-xl lg:h-[calc(100vh-3rem)] lg:grid-cols-[260px_1fr] xl:grid-cols-[260px_1fr_300px]">
        <div className="hidden min-h-0 lg:block">
          <ChatHistorySidebar />
        </div>
        <div className="min-h-0">
          <ChatWorkspace />
        </div>
        <div className="hidden min-h-0 xl:block">
          <LearningContextPanel />
        </div>
      </div>
    </Layout>
  );
}
