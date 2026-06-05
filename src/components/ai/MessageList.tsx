import { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { AIMessage, useAIAssistant } from '@/contexts/AIAssistantContext';
import { Copy, RefreshCw, Check, Sparkles, User as UserIcon, Paperclip } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

function timestamp(t: number) {
  const d = new Date(t);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function CodeBlock({ children, className }: any) {
  const isBlock = className?.startsWith('language-');
  if (!isBlock) return <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[0.85em] text-foreground">{children}</code>;
  return (
    <pre className="my-2 overflow-x-auto rounded-lg border border-border/60 bg-[hsl(225_25%_4%)] p-3 text-xs">
      <code className={cn('font-mono text-foreground/90', className)}>{children}</code>
    </pre>
  );
}

function MessageBubble({ m, onRegenerate, canRegenerate }: { m: AIMessage; onRegenerate?: () => void; canRegenerate?: boolean }) {
  const [copied, setCopied] = useState(false);
  const isUser = m.role === 'user';

  const copy = () => {
    navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={cn('group flex w-full gap-3', isUser ? 'flex-row-reverse' : 'flex-row')}
    >
      <div className={cn(
        'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold',
        isUser ? 'bg-secondary text-secondary-foreground' : 'bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] text-white shadow-glow-primary'
      )}>
        {isUser ? <UserIcon className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}
      </div>

      <div className={cn('flex min-w-0 max-w-[88%] flex-col gap-1', isUser ? 'items-end' : 'items-start')}>
        <div className={cn(
          'rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'border border-border/60 bg-card/60 text-foreground backdrop-blur-xl'
        )}>
          {m.attachments?.length ? (
            <div className={cn('mb-2 flex flex-wrap gap-1', isUser && 'justify-end')}>
              {m.attachments.map(a => (
                <span key={a.id} className="inline-flex items-center gap-1 rounded-full bg-background/40 px-2 py-0.5 text-[11px]">
                  <Paperclip className="h-3 w-3" /> {a.name}
                </span>
              ))}
            </div>
          ) : null}
          {isUser ? (
            <div className="whitespace-pre-wrap break-words">{m.content}</div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-ul:my-1.5 prose-ol:my-1.5 prose-a:text-primary">
              <ReactMarkdown components={{ code: CodeBlock as any }}>{m.content}</ReactMarkdown>
            </div>
          )}
        </div>

        <div className={cn(
          'flex items-center gap-1 px-1 text-[10px] text-muted-foreground transition-opacity',
          'opacity-0 group-hover:opacity-100'
        )}>
          <span>{timestamp(m.createdAt)}</span>
          {!isUser && (
            <>
              <button onClick={copy} className="ml-1 inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground">
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                {copied ? 'Copied' : 'Copy'}
              </button>
              {canRegenerate && (
                <button onClick={onRegenerate} className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 hover:bg-accent hover:text-foreground">
                  <RefreshCw className="h-3 w-3" /> Regenerate
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex w-full gap-3">
      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[hsl(var(--level-purple))] text-white shadow-glow-primary">
        <Sparkles className="h-3.5 w-3.5" />
      </div>
      <div className="rounded-2xl border border-border/60 bg-card/60 px-4 py-3 backdrop-blur-xl">
        <div className="flex gap-1">
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}

export default function MessageList() {
  const { activeChat, isSending, regenerate } = useAIAssistant();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' });
  }, [activeChat?.messages.length, isSending]);

  if (!activeChat) return null;
  const lastIdx = activeChat.messages.length - 1;

  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-6">
        {activeChat.messages.map((m, i) => (
          <MessageBubble
            key={m.id}
            m={m}
            canRegenerate={!isSending && i === lastIdx && m.role === 'assistant'}
            onRegenerate={regenerate}
          />
        ))}
        {isSending && <TypingIndicator />}
      </div>
    </div>
  );
}
