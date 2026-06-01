import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';
import NotificationInbox from './NotificationInbox';
import { useAchievementNotifications } from '@/hooks/useAchievementNotifications';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  useAchievementNotifications();
  const { user } = useAuth();
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
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
