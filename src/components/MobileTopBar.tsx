import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, Zap } from 'lucide-react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { useAuth } from '@/contexts/AuthContext';
import AppSidebar from './AppSidebar';

export default function MobileTopBar() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const logoHref = user ? '/dashboard' : '/';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl lg:hidden">
      <Link to={logoHref} className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
          <Zap className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="font-display text-lg font-bold">learnflow</span>
      </Link>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          aria-label="Open menu"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/60 bg-muted/40 text-foreground transition-colors hover:bg-accent"
        >
          <Menu className="h-5 w-5" />
        </SheetTrigger>
        <SheetContent side="left" className="w-72 border-sidebar-border bg-sidebar p-0">
          <AppSidebar variant="inline" onNavigate={() => setOpen(false)} />
        </SheetContent>
      </Sheet>
    </header>
  );
}
