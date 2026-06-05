import { useRef, useState, KeyboardEvent, ChangeEvent } from 'react';
import { Plus, ArrowUp, Paperclip, X, FileText, Image as ImageIcon, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useAIAssistant, AIAttachment } from '@/contexts/AIAssistantContext';
import { getMode } from '@/lib/ai-modes';
import { cn } from '@/lib/utils';

const ACCEPT = '.pdf,.docx,.txt,.md,.markdown,image/*';
const TEXT_TYPES = ['text/plain', 'text/markdown', 'application/json', 'text/csv'];

async function readPreview(f: File): Promise<string | undefined> {
  if (TEXT_TYPES.includes(f.type) || /\.(md|markdown|txt|json|csv)$/i.test(f.name)) {
    try { return (await f.text()).slice(0, 8000); } catch { return undefined; }
  }
  return undefined;
}

const ACTION_PROMPTS: Array<{ label: string; build: (names: string) => string }> = [
  { label: 'Summarize',           build: n => `Summarize the attached file${n ? `s (${n})` : ''}.` },
  { label: 'Explain',             build: n => `Explain the key ideas in the attached file${n ? `s (${n})` : ''}.` },
  { label: 'Generate Quiz',       build: n => `Generate a 5-question quiz from the attached file${n ? `s (${n})` : ''}.` },
  { label: 'Generate Flashcards', build: n => `Create 10 flashcards from the attached file${n ? `s (${n})` : ''}.` },
  { label: 'Extract Key Concepts',build: n => `Extract and list the key concepts from the attached file${n ? `s (${n})` : ''}.` },
  { label: 'Create Study Plan',   build: n => `Build a study plan from the attached file${n ? `s (${n})` : ''}.` },
];

function fileIcon(f: AIAttachment) {
  if (f.type.startsWith('image/')) return ImageIcon;
  if (/\.(md|txt|markdown)$/i.test(f.name)) return FileText;
  return FileCode;
}

export default function ChatComposer({ compact }: { compact?: boolean }) {
  const { sendMessage, isSending, mode } = useAIAssistant();
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<AIAttachment[]>([]);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const modeMeta = getMode(mode);

  const autoGrow = () => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 240) + 'px';
  };

  const onPickFiles = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const next: AIAttachment[] = [];
    for (const f of files) {
      next.push({
        id: Math.random().toString(36).slice(2),
        name: f.name,
        type: f.type,
        size: f.size,
        preview: await readPreview(f),
      });
    }
    setAttachments(a => [...a, ...next]);
    if (fileRef.current) fileRef.current.value = '';
  };

  const removeAt = (id: string) => setAttachments(a => a.filter(x => x.id !== id));

  const send = async (override?: string) => {
    const value = (override ?? text).trim();
    if (!value && attachments.length === 0) return;
    const finalText = value || `Process the attached file${attachments.length > 1 ? 's' : ''}.`;
    setText('');
    const sent = attachments;
    setAttachments([]);
    if (taRef.current) taRef.current.style.height = 'auto';
    await sendMessage(finalText, sent);
  };

  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const runAction = (label: string) => {
    const names = attachments.map(a => a.name).join(', ');
    const action = ACTION_PROMPTS.find(a => a.label === label);
    if (action) send(action.build(names));
  };

  return (
    <div className={cn('border-t border-border/60 bg-background/60 backdrop-blur-2xl', compact ? 'px-3 py-3' : 'px-4 py-4')}>
      <div className="mx-auto w-full max-w-3xl">
        {attachments.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {attachments.map(a => {
              const Icon = fileIcon(a);
              return (
                <span key={a.id} className="group inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-card/60 py-1 pl-2 pr-1 text-xs backdrop-blur-xl">
                  <Icon className="h-3 w-3 text-primary" />
                  <span className="max-w-[160px] truncate">{a.name}</span>
                  <button onClick={() => removeAt(a.id)} className="rounded-full p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              );
            })}
          </div>
        )}

        <div className="group relative flex items-end gap-1.5 rounded-2xl border border-border/60 bg-card/60 p-2 backdrop-blur-2xl shadow-lg transition-all focus-within:border-primary/60 focus-within:shadow-glow-primary">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0 rounded-xl text-muted-foreground hover:text-foreground" aria-label="Attach">
                <Plus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Add to chat</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => fileRef.current?.click()}>
                <Paperclip className="mr-2 h-4 w-4" /> Upload file or image
              </DropdownMenuItem>
              {attachments.length > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Quick actions</DropdownMenuLabel>
                  {ACTION_PROMPTS.map(a => (
                    <DropdownMenuItem key={a.label} onClick={() => runAction(a.label)}>
                      {a.label}
                    </DropdownMenuItem>
                  ))}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <input ref={fileRef} type="file" multiple accept={ACCEPT} className="hidden" onChange={onPickFiles} />

          <Textarea
            ref={taRef}
            value={text}
            onChange={e => { setText(e.target.value); autoGrow(); }}
            onKeyDown={onKey}
            rows={1}
            placeholder={modeMeta.placeholder}
            className="min-h-[36px] flex-1 resize-none border-0 bg-transparent px-1 py-1.5 text-sm shadow-none focus-visible:ring-0"
          />

          <Button
            size="icon"
            disabled={isSending || (!text.trim() && attachments.length === 0)}
            onClick={() => send()}
            className="h-9 w-9 shrink-0 rounded-xl bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] text-white shadow-glow-primary hover:opacity-90"
            aria-label="Send"
          >
            <ArrowUp className="h-4 w-4" />
          </Button>
        </div>

        <div className="mt-1.5 px-2 text-[10px] text-muted-foreground">
          <kbd className="rounded border border-border/60 bg-muted/40 px-1">Enter</kbd> to send · <kbd className="rounded border border-border/60 bg-muted/40 px-1">Shift+Enter</kbd> for new line
        </div>
      </div>
    </div>
  );
}
