import { ReactNode } from 'react';
import AppSidebar from './AppSidebar';
import MobileTopBar from './MobileTopBar';
import MobileBottomNav from './MobileBottomNav';

interface LayoutProps {
  children: ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      <AppSidebar />
      <MobileTopBar />
      <main className="lg:ml-64 pb-20 lg:pb-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
        </div>
      </main>
      <MobileBottomNav />
    </div>
  );
}
