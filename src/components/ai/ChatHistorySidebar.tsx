import { useMemo, useState } from 'react';
import { useAIAssistant, AIChat } from '@/contexts/AIAssistantContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Search, Pin, Star, Trash2, MessageSquare, Pencil, MoreHorizontal, Layers, ListChecks, NotebookPen } from 'lucide-react';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';

function group(chats: AIChat[]) {
  const now = Date.now();
  const day = 24 * 3600 * 1000;
  const today: AIChat[] = []; const yest: AIChat[] = []; const week: AIChat[] = []; const older: AIChat[] = [];
  for (const c of chats) {
    const age = now - c.updatedAt;
    if (age < day) today.push(c);
    else if (age < 2 * day) yest.push(c);
    else if (age < 7 * day) week.push(c);
    else older.push(c);
  }
  return { today, yest, week, older };
}

export default function ChatHistorySidebar() {
  const { chats, activeChatId, newChat, selectChat, deleteChat, renameChat, togglePin, toggleFavorite } = useAIAssistant();
  const [q, setQ] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const list = needle ? chats.filter(c => c.title.toLowerCase().includes(needle) || c.messages.some(m => m.content.toLowerCase().includes(needle))) : chats;
    return [...list].sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt);
  }, [chats, q]);

  const pinned = filtered.filter(c => c.pinned);
  const rest = filtered.filter(c => !c.pinned);
  const grouped = group(rest);

  const renderItem = (c: AIChat) => {
    const isActive = c.id === activeChatId;
    const isEditing = editingId === c.id;
    return (
      <div
        key={c.id}
        className={cn(
          'group flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm transition-colors',
          isActive ? 'bg-primary/10 text-primary' : 'text-sidebar-foreground hover:bg-accent hover:text-foreground'
        )}
      >
        <button onClick={() => selectChat(c.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
          <MessageSquare className="h-3.5 w-3.5 shrink-0" />
          {isEditing ? (
            <input
              autoFocus
              value={editValue}
              onChange={e => setEditValue(e.target.value)}
              onBlur={() => { renameChat(c.id, editValue); setEditingId(null); }}
              onKeyDown={e => { if (e.key === 'Enter') { renameChat(c.id, editValue); setEditingId(null); } if (e.key === 'Escape') setEditingId(null); }}
              className="min-w-0 flex-1 bg-transparent text-sm outline-none"
            />
          ) : (
            <span className="truncate">{c.title}</span>
          )}
          {c.favorite && <Star className="h-3 w-3 shrink-0 fill-current text-streak" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" className="h-6 w-6 opacity-0 transition-opacity group-hover:opacity-100">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={() => { setEditingId(c.id); setEditValue(c.title); }}>
              <Pencil className="mr-2 h-3.5 w-3.5" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => togglePin(c.id)}>
              <Pin className="mr-2 h-3.5 w-3.5" /> {c.pinned ? 'Unpin' : 'Pin'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => toggleFavorite(c.id)}>
              <Star className="mr-2 h-3.5 w-3.5" /> {c.favorite ? 'Unfavorite' : 'Favorite'}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => deleteChat(c.id)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  };

  const section = (label: string, items: AIChat[]) => items.length > 0 && (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="space-y-0.5">{items.map(renderItem)}</div>
    </div>
  );

  return (
    <aside className="flex h-full w-full flex-col gap-2 border-r border-border/60 bg-sidebar/60 p-3 backdrop-blur-xl">
      <Button onClick={() => newChat()} className="w-full justify-start gap-2 bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] text-white hover:opacity-90">
        <Plus className="h-4 w-4" /> New chat
      </Button>

      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input value={q} onChange={e => setQ(e.target.value)} placeholder="Search chats…" className="h-9 pl-8 text-sm" />
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto pr-1">
        {section('Pinned', pinned)}
        {section('Today', grouped.today)}
        {section('Yesterday', grouped.yest)}
        {section('Previous 7 days', grouped.week)}
        {section('Older', grouped.older)}
        {filtered.length === 0 && (
          <div className="px-2 py-6 text-center text-xs text-muted-foreground">No chats yet — start a new one.</div>
        )}
      </div>

      <div className="border-t border-border/60 pt-2">
        <div className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tools</div>
        <Link to="/assistant?tab=flashcards" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-accent hover:text-foreground"><Layers className="h-3.5 w-3.5" /> Flashcards</Link>
        <Link to="/assistant?tab=quiz" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-accent hover:text-foreground"><ListChecks className="h-3.5 w-3.5" /> Quizzes</Link>
        <Link to="/assistant?tab=reflection" className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-accent hover:text-foreground"><NotebookPen className="h-3.5 w-3.5" /> Session Reviews</Link>
      </div>
    </aside>
  );
}
