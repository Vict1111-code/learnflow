import { NavLink, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, Timer, FileText, Users, Trophy, 
  User, BookOpen, Zap, Flame, LogOut, BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfile } from '@/lib/database';
import { cn } from '@/lib/utils';

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/study', icon: Timer, label: 'Study Timer' },
  { to: '/plan', icon: BookOpen, label: 'Study Plan' },
  { to: '/report', icon: FileText, label: 'Daily Report' },
  { to: '/analytics', icon: BarChart3, label: 'Analytics' },
  { to: '/community', icon: Users, label: 'Community' },
  { to: '/leaderboard', icon: Trophy, label: 'Leaderboard' },
  { to: '/profile', icon: User, label: 'Profile' },
];

export default function AppSidebar() {
  const location = useLocation();
  const { user, signOut } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? getProfile(user.id) : null,
    enabled: !!user,
  });

  const displayName = profile?.name || user?.email?.split('@')[0] || 'User';
  const level = profile?.level || 'Beginner';
  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;

  return (
    <aside className="fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border bg-sidebar">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-6 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap className="h-5 w-5 text-primary-foreground" />
        </div>
        <span className="font-display text-xl font-bold text-foreground">learnflow</span>
      </div>

      {/* User quick stats */}
      <div className="mx-4 mb-4 rounded-lg border border-border/50 bg-muted/50 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
            {displayName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{displayName}</p>
            <p className="text-xs text-muted-foreground">{level}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs">
          <span className="flex items-center gap-1 text-xp">
            <Zap className="h-3.5 w-3.5" /> {xp.toLocaleString()} XP
          </span>
          <span className="flex items-center gap-1 text-streak">
            <Flame className="h-3.5 w-3.5" /> {streak} days
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-0.5 px-3">
        {navItems.map((item) => {
          const isActive = location.pathname === item.to;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary shadow-glow-primary'
                  : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
              )}
            >
              <item.icon className="h-4.5 w-4.5 shrink-0" style={{ width: 18, height: 18 }} />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="border-t border-border p-4">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
        <p className="mt-2 text-[11px] text-muted-foreground">learnflow v1.0 • Learn to Earn</p>
      </div>
    </aside>
  );
}
