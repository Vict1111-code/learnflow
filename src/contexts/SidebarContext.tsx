import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  setCollapsed: (v: boolean) => void;
}

const SidebarContext = createContext<SidebarContextValue | null>(null);
const KEY = 'learnflow:sidebar:collapsed';

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(KEY) === '1';
  });

  useEffect(() => {
    localStorage.setItem(KEY, collapsed ? '1' : '0');
  }, [collapsed]);

  return (
    <SidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed(v => !v), setCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebarState() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error('useSidebarState must be used within SidebarProvider');
  return ctx;
}
