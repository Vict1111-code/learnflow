import { useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, CheckCheck, MessageSquare, ListChecks, Link2, Award } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEvent {
  id: string;
  mentor_id: string;
  mentee_id: string;
  actor_id: string;
  entity_type: 'comment' | 'task' | 'resource' | 'milestone';
  action: string;
  title: string;
  detail: string | null;
  mentor_read_at: string | null;
  mentee_read_at: string | null;
  created_at: string;
}

const iconFor = (t: string) => {
  switch (t) {
    case 'comment': return MessageSquare;
    case 'task': return ListChecks;
    case 'resource': return Link2;
    case 'milestone': return Award;
    default: return Bell;
  }
};

export default function NotificationInbox() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: events } = useQuery({
    queryKey: ['mentor-activity-inbox', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await (supabase.from as any)('mentor_activity_events')
        .select('*')
        .or(`mentor_id.eq.${user.id},mentee_id.eq.${user.id}`)
        .neq('actor_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);
      return (data || []) as ActivityEvent[];
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`inbox-${user.id}`)
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'mentor_activity_events' },
        () => qc.invalidateQueries({ queryKey: ['mentor-activity-inbox', user.id] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, qc]);

  const isUnread = (e: ActivityEvent) =>
    e.mentor_id === user?.id ? !e.mentor_read_at : !e.mentee_read_at;

  const unreadCount = useMemo(
    () => (events || []).filter(isUnread).length,
    [events, user?.id],
  );

  const markAll = useMutation({
    mutationFn: async () => {
      await (supabase.rpc as any)('mark_mentor_activity_read');
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-activity-inbox', user?.id] }),
  });

  if (!user) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 p-0">
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Notifications</p>
            <p className="text-[11px] text-muted-foreground">{unreadCount} unread</p>
          </div>
          <Button
            variant="ghost" size="sm"
            disabled={unreadCount === 0 || markAll.isPending}
            onClick={() => markAll.mutate()}
            className="text-xs"
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" /> Mark all read
          </Button>
        </div>
        <ScrollArea className="max-h-96">
          {(!events || events.length === 0) ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-border/40">
              {events.map((e) => {
                const Icon = iconFor(e.entity_type);
                const unread = isUnread(e);
                return (
                  <li key={e.id} className={`flex gap-3 px-4 py-3 ${unread ? 'bg-primary/5' : ''}`}>
                    <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${unread ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground'}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{e.title}</p>
                        {unread && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                      </div>
                      {e.detail && <p className="line-clamp-2 text-xs text-muted-foreground">{e.detail}</p>}
                      <p className="mt-0.5 text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(e.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
