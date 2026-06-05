import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import NotificationInbox from './NotificationInbox';
import FloatingAIButton from './ai/FloatingAIButton';
import AIDrawer from './ai/AIDrawer';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { useAuth } from '@/contexts/AuthContext';
import { useSidebarState } from '@/contexts/SidebarContext';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: ReactNode;
  fullBleed?: boolean;
}

export default function Layout({ children, fullBleed }: LayoutProps) {
  useAchievementNotifications();
  const { user } = useAuth();
  const { collapsed } = useSidebarState();

  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileTopBar />
      {user && (
        <div className="fixed right-4 top-4 z-40 hidden lg:block">
          <div className="rounded-full border border-border/60 bg-background/80 backdrop-blur-xl">
            <NotificationInbox />
          </div>
        </div>
      )}
      <main className={cn('pb-20 transition-[margin] duration-300 lg:pb-0', collapsed ? 'lg:ml-[72px]' : 'lg:ml-64')}>
        <div className={cn(fullBleed ? 'px-3 py-4 sm:px-4 lg:px-6' : 'mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8')}>
          {children}
        </div>
      </main>
      <MobileBottomNav />
      <FloatingAIButton />
      <AIDrawer />
    </div>
  );
}
