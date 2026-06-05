import { Sparkles } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAIAssistant } from '@/contexts/AIAssistantContext';
import { useAuth } from '@/contexts/AuthContext';

export default function FloatingAIButton() {
  const { user } = useAuth();
  const { openDrawer, drawerOpen } = useAIAssistant();
  const location = useLocation();

  if (!user) return null;
  if (location.pathname.startsWith('/ai')) return null;
  if (drawerOpen) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        onClick={openDrawer}
        aria-label="Open AI Assistant"
        className="fixed bottom-24 right-5 z-50 lg:bottom-6 group"
      >
        {/* Halo */}
        <span className="pointer-events-none absolute inset-0 -m-3 rounded-full bg-primary/30 blur-2xl animate-pulse" />
        <span className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-primary via-primary to-[hsl(var(--level-purple))] opacity-90" />
        <span className="relative flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.8)] backdrop-blur-xl">
          <Sparkles className="h-6 w-6 text-white drop-shadow" />
        </span>
        <span className="pointer-events-none absolute -top-9 right-0 whitespace-nowrap rounded-md border border-border/60 bg-popover/90 px-2.5 py-1 text-xs font-medium text-popover-foreground opacity-0 shadow-md backdrop-blur-xl transition-opacity group-hover:opacity-100">
          Ask LearnFlow AI
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
