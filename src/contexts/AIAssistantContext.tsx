import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AIModeId, getMode } from '@/lib/ai-modes';
import { serializeContext, LearningContext } from '@/hooks/useLearningContext';

export interface AIAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  preview?: string; // text content for text-y files
}

export interface AIMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: number;
  attachments?: AIAttachment[];
  mode?: AIModeId;
}

export interface AIChat {
  id: string;
  title: string;
  mode: AIModeId;
  pinned: boolean;
  favorite: boolean;
  messages: AIMessage[];
  createdAt: number;
  updatedAt: number;
}

interface AIAssistantContextValue {
  chats: AIChat[];
  activeChatId: string | null;
  activeChat: AIChat | null;
  mode: AIModeId;
  setMode: (m: AIModeId) => void;
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  toggleDrawer: () => void;
  isSending: boolean;
  newChat: (mode?: AIModeId) => string;
  selectChat: (id: string) => void;
  deleteChat: (id: string) => void;
  renameChat: (id: string, title: string) => void;
  togglePin: (id: string) => void;
  toggleFavorite: (id: string) => void;
  sendMessage: (text: string, attachments?: AIAttachment[]) => Promise<void>;
  regenerate: () => Promise<void>;
  setLearningContext: (ctx: LearningContext | undefined) => void;
}

const AIAssistantContext = createContext<AIAssistantContextValue | null>(null);
const STORAGE_KEY = 'learnflow:ai:chats';
const ACTIVE_KEY = 'learnflow:ai:active';
const MODE_KEY = 'learnflow:ai:mode';

const uid = () => Math.random().toString(36).slice(2, 11);

function loadChats(): AIChat[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch { return []; }
}

export function AIAssistantProvider({ children }: { children: ReactNode }) {
  const [chats, setChats] = useState<AIChat[]>(() => loadChats());
  const [activeChatId, setActiveChatId] = useState<string | null>(() => localStorage.getItem(ACTIVE_KEY));
  const [mode, setModeState] = useState<AIModeId>(() => {
    const stored = localStorage.getItem(MODE_KEY) as AIModeId | null;
    const valid: AIModeId[] = ['explain', 'quiz', 'review'];
    return stored && valid.includes(stored) ? stored : 'explain';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const ctxRef = useRef<LearningContext | undefined>(undefined);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(chats)); }, [chats]);
  useEffect(() => { if (activeChatId) localStorage.setItem(ACTIVE_KEY, activeChatId); else localStorage.removeItem(ACTIVE_KEY); }, [activeChatId]);
  useEffect(() => { localStorage.setItem(MODE_KEY, mode); }, [mode]);

  const setMode = useCallback((m: AIModeId) => setModeState(m), []);
  const setLearningContext = useCallback((c: LearningContext | undefined) => { ctxRef.current = c; }, []);

  const activeChat = useMemo(() => chats.find(c => c.id === activeChatId) ?? null, [chats, activeChatId]);

  const newChat = useCallback((m?: AIModeId): string => {
    const id = uid();
    const chosen = m ?? mode;
    const chat: AIChat = {
      id, title: 'New chat', mode: chosen, pinned: false, favorite: false,
      messages: [], createdAt: Date.now(), updatedAt: Date.now(),
    };
    setChats(prev => [chat, ...prev]);
    setActiveChatId(id);
    if (m) setModeState(m);
    return id;
  }, [mode]);

  const selectChat = useCallback((id: string) => {
    setActiveChatId(id);
    const c = chats.find(x => x.id === id);
    if (c) setModeState(c.mode);
  }, [chats]);

  const deleteChat = useCallback((id: string) => {
    setChats(prev => prev.filter(c => c.id !== id));
    setActiveChatId(curr => (curr === id ? null : curr));
  }, []);

  const renameChat = useCallback((id: string, title: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: title.trim() || c.title, updatedAt: Date.now() } : c));
  }, []);

  const togglePin = useCallback((id: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, pinned: !c.pinned } : c));
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    setChats(prev => prev.map(c => c.id === id ? { ...c, favorite: !c.favorite } : c));
  }, []);

  const callBackend = useCallback(async (chat: AIChat) => {
    const modeMeta = getMode(chat.mode);
    const contextStr = serializeContext(ctxRef.current);
    const messages = chat.messages.map(m => {
      let content = m.content;
      if (m.attachments?.length) {
        const att = m.attachments.map(a =>
          `\n[attachment] ${a.name} (${a.type || 'file'}, ${Math.round(a.size / 1024)}KB)` +
          (a.preview ? `\n---\n${a.preview.slice(0, 4000)}\n---` : '')
        ).join('');
        content += att;
      }
      return { role: m.role, content };
    });
    const { data, error } = await supabase.functions.invoke('ai-assistant', {
      body: { kind: 'chat', payload: { messages, context: contextStr, mode_hint: `${modeMeta.label} — ${modeMeta.systemHint}` } },
    });
    if (error) throw new Error(error.message || 'AI request failed');
    if ((data as any)?.error) throw new Error((data as any).error);
    return (data as any).output?.message as string;
  }, []);

  const sendMessage = useCallback(async (text: string, attachments?: AIAttachment[]) => {
    let chatId = activeChatId;
    let baseChat: AIChat | undefined = chats.find(c => c.id === chatId);
    if (!chatId || !baseChat) {
      chatId = uid();
      baseChat = { id: chatId, title: 'New chat', mode, pinned: false, favorite: false, messages: [], createdAt: Date.now(), updatedAt: Date.now() };
      setChats(prev => [baseChat!, ...prev]);
      setActiveChatId(chatId);
    }
    const userMsg: AIMessage = { id: uid(), role: 'user', content: text, createdAt: Date.now(), attachments, mode };
    const nextMessages = [...baseChat.messages, userMsg];
    const updated: AIChat = {
      ...baseChat,
      mode,
      title: baseChat.messages.length === 0 ? text.slice(0, 48) : baseChat.title,
      messages: nextMessages,
      updatedAt: Date.now(),
    };

    setChats(prev => {
      const exists = prev.some(c => c.id === chatId);
      return exists ? prev.map(c => c.id === chatId ? updated : c) : [updated, ...prev];
    });

    setIsSending(true);
    try {
      const reply = await callBackend(updated);
      const aiMsg: AIMessage = { id: uid(), role: 'assistant', content: reply || '…', createdAt: Date.now(), mode };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, aiMsg], updatedAt: Date.now() } : c));
    } catch (e: any) {
      toast.error(e.message || 'AI request failed');
      const errMsg: AIMessage = { id: uid(), role: 'assistant', content: `⚠️ ${e.message || 'Something went wrong.'}`, createdAt: Date.now(), mode };
      setChats(prev => prev.map(c => c.id === chatId ? { ...c, messages: [...c.messages, errMsg], updatedAt: Date.now() } : c));
    } finally {
      setIsSending(false);
    }
  }, [activeChatId, chats, mode, callBackend]);

  const regenerate = useCallback(async () => {
    const chat = chats.find(c => c.id === activeChatId);
    if (!chat || chat.messages.length === 0) return;
    // strip last assistant message
    const lastAssistantIdx = [...chat.messages].reverse().findIndex(m => m.role === 'assistant');
    if (lastAssistantIdx === -1) return;
    const idxFromEnd = lastAssistantIdx;
    const newMsgs = chat.messages.slice(0, chat.messages.length - 1 - idxFromEnd);
    setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: newMsgs } : c));
    setIsSending(true);
    try {
      const working: AIChat = { ...chat, messages: newMsgs };
      const reply = await callBackend(working);
      const aiMsg: AIMessage = { id: uid(), role: 'assistant', content: reply || '…', createdAt: Date.now(), mode: chat.mode };
      setChats(prev => prev.map(c => c.id === chat.id ? { ...c, messages: [...newMsgs, aiMsg], updatedAt: Date.now() } : c));
    } catch (e: any) {
      toast.error(e.message || 'AI request failed');
    } finally {
      setIsSending(false);
    }
  }, [activeChatId, chats, callBackend]);

  const value: AIAssistantContextValue = {
    chats, activeChatId, activeChat, mode, setMode,
    drawerOpen,
    openDrawer: () => setDrawerOpen(true),
    closeDrawer: () => setDrawerOpen(false),
    toggleDrawer: () => setDrawerOpen(v => !v),
    isSending,
    newChat, selectChat, deleteChat, renameChat, togglePin, toggleFavorite,
    sendMessage, regenerate, setLearningContext,
  };

  return <AIAssistantContext.Provider value={value}>{children}</AIAssistantContext.Provider>;
}

export function useAIAssistant() {
  const ctx = useContext(AIAssistantContext);
  if (!ctx) throw new Error('useAIAssistant must be used within AIAssistantProvider');
  return ctx;
}
