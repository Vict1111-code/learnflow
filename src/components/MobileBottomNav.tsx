import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Timer, Users, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
  { to: '/study', icon: Timer, label: 'Study' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function MobileBottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-center justify-around border-t border-border/60 bg-background/90 backdrop-blur-xl lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            cn(
              'flex flex-1 flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
              isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            )
          }
        >
          {({ isActive }) => (
            <>
              <tab.icon className={cn('h-5 w-5 transition-transform', isActive && 'scale-110')} />
              <span>{tab.label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
