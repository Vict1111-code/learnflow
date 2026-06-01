import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Zap, Flame, Target, MessageSquare, ListChecks, Link2, CheckCircle2,
  Trash2, Plus, Activity, Calendar, BookOpen, Award,
} from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

interface Props {
  menteeId: string;
  mentorId: string;
  isMentor: boolean; // true when current user is mentor side
}

export default function MenteeDetailPanel({ menteeId, mentorId, isMentor }: Props) {
  const qc = useQueryClient();
  const [tab, setTab] = useState('overview');

  // Realtime subscriptions: live updates + toast notifications for both sides
  useEffect(() => {
    const sideLabel = isMentor ? 'Mentee' : 'Mentor';
    const matchesPair = (row: any) =>
      row && row.mentor_id === mentorId && row.mentee_id === menteeId;

    const handle = (
      table: 'mentor_comments' | 'mentor_tasks' | 'mentor_resources' | 'milestone_approvals',
      queryKey: any[],
      messages: { insert: string; update?: string; delete?: string },
    ) => (payload: any) => {
      const row = payload.new ?? payload.old;
      if (!matchesPair(row)) return;
      // Skip self-originated INSERTs to avoid double-toasting the actor
      const actorIsMe = isMentor ? row.mentor_id === mentorId : row.mentee_id === menteeId;
      qc.invalidateQueries({ queryKey });
      if (payload.eventType === 'INSERT' && !(actorIsMe && isMentor && table !== 'mentor_tasks')) {
        // For mentor-only writes (comments/resources/approvals) the mentor already saw a toast
        if (isMentor && table !== 'mentor_tasks') return;
        toast(`${sideLabel}: ${messages.insert}`);
      } else if (payload.eventType === 'UPDATE' && messages.update) {
        toast(`${sideLabel}: ${messages.update}`);
      } else if (payload.eventType === 'DELETE' && messages.delete) {
        toast(`${sideLabel}: ${messages.delete}`);
      }
    };

    const channel = supabase
      .channel(`mentor-panel-${mentorId}-${menteeId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_comments' },
        handle('mentor_comments', ['mentor-comments', menteeId, mentorId], {
          insert: 'New comment posted', delete: 'Comment removed',
        }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_tasks' },
        handle('mentor_tasks', ['mentor-tasks', menteeId, mentorId], {
          insert: 'New task assigned', update: 'Task status updated', delete: 'Task removed',
        }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'mentor_resources' },
        handle('mentor_resources', ['mentor-resources', menteeId, mentorId], {
          insert: 'New resource recommended', delete: 'Resource removed',
        }))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'milestone_approvals' },
        handle('milestone_approvals', ['mentor-approvals', menteeId, mentorId], {
          insert: 'Milestone approved', delete: 'Milestone approval revoked',
        }))
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [menteeId, mentorId, isMentor, qc]);

  // Core mentee data
  const { data: menteeData } = useQuery({
    queryKey: ['mentee-data', menteeId],
    queryFn: async () => {
      const [sessions, reports, focusRes, goalsRes] = await Promise.all([
        supabase.from('study_sessions').select('duration_seconds, xp_earned, started_at, topic')
          .eq('user_id', menteeId).not('ended_at', 'is', null)
          .order('started_at', { ascending: false }).limit(10),
        supabase.from('daily_reports').select('report_date, studied, confusing_concepts, xp_earned')
          .eq('user_id', menteeId).order('report_date', { ascending: false }).limit(5),
        supabase.rpc('calculate_focus_integrity', { p_user_id: menteeId }),
        supabase.from('learning_goals').select('id, description, concepts, is_active')
          .eq('user_id', menteeId),
      ]);
      return {
        sessions: sessions.data || [],
        reports: reports.data || [],
        focus: focusRes.data as any,
        goals: goalsRes.data || [],
      };
    },
  });

  const { data: weekly } = useQuery({
    queryKey: ['mentee-weekly', menteeId],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_mentee_weekly_summary', { _mentee: menteeId });
      return (data || []) as any[];
    },
  });

  const { data: timeline } = useQuery({
    queryKey: ['mentee-timeline', menteeId],
    queryFn: async () => {
      const { data } = await (supabase.rpc as any)('get_mentee_timeline', { _mentee: menteeId, _limit: 40 });
      return (data || []) as any[];
    },
  });

  const { data: comments } = useQuery({
    queryKey: ['mentor-comments', menteeId, mentorId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('mentor_comments').select('*')
        .eq('mentor_id', mentorId).eq('mentee_id', menteeId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: tasks } = useQuery({
    queryKey: ['mentor-tasks', menteeId, mentorId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('mentor_tasks').select('*')
        .eq('mentor_id', mentorId).eq('mentee_id', menteeId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: resources } = useQuery({
    queryKey: ['mentor-resources', menteeId, mentorId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('mentor_resources').select('*')
        .eq('mentor_id', mentorId).eq('mentee_id', menteeId)
        .order('created_at', { ascending: false });
      return (data || []) as any[];
    },
  });

  const { data: approvals } = useQuery({
    queryKey: ['mentor-approvals', menteeId, mentorId],
    queryFn: async () => {
      const { data } = await (supabase.from as any)('milestone_approvals').select('*')
        .eq('mentor_id', mentorId).eq('mentee_id', menteeId);
      return (data || []) as any[];
    },
  });

  // Mutations
  const [commentText, setCommentText] = useState('');
  const addComment = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)('mentor_comments').insert({
        mentor_id: mentorId, mentee_id: menteeId, content: commentText,
      });
      if (error) throw error;
    },
    onSuccess: () => { setCommentText(''); qc.invalidateQueries({ queryKey: ['mentor-comments', menteeId, mentorId] }); toast.success('Comment added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delComment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('mentor_comments').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-comments', menteeId, mentorId] }),
  });

  const [taskTitle, setTaskTitle] = useState('');
  const [taskDue, setTaskDue] = useState('');
  const addTask = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)('mentor_tasks').insert({
        mentor_id: mentorId, mentee_id: menteeId, title: taskTitle,
        due_date: taskDue || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setTaskTitle(''); setTaskDue(''); qc.invalidateQueries({ queryKey: ['mentor-tasks', menteeId, mentorId] }); toast.success('Task assigned'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await (supabase.from as any)('mentor_tasks').update({
        status, completed_at: status === 'done' ? new Date().toISOString() : null,
      }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-tasks', menteeId, mentorId] }),
  });

  const delTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('mentor_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-tasks', menteeId, mentorId] }),
  });

  const [resTitle, setResTitle] = useState('');
  const [resUrl, setResUrl] = useState('');
  const addResource = useMutation({
    mutationFn: async () => {
      const { error } = await (supabase.from as any)('mentor_resources').insert({
        mentor_id: mentorId, mentee_id: menteeId, title: resTitle, url: resUrl || null,
      });
      if (error) throw error;
    },
    onSuccess: () => { setResTitle(''); setResUrl(''); qc.invalidateQueries({ queryKey: ['mentor-resources', menteeId, mentorId] }); toast.success('Resource recommended'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delResource = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('mentor_resources').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-resources', menteeId, mentorId] }),
  });

  const approveMilestone = useMutation({
    mutationFn: async ({ goalId, conceptId, conceptName }: { goalId: string; conceptId: string; conceptName: string }) => {
      const { error } = await (supabase.from as any)('milestone_approvals').insert({
        mentor_id: mentorId, mentee_id: menteeId, goal_id: goalId,
        concept_id: conceptId, concept_name: conceptName,
      });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['mentor-approvals', menteeId, mentorId] }); toast.success('Milestone approved'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const revokeMilestone = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from as any)('milestone_approvals').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['mentor-approvals', menteeId, mentorId] }),
  });

  const approvedSet = new Set((approvals || []).map((a: any) => `${a.goal_id}:${a.concept_id}`));
  const maxFocus = Math.max(1, ...(weekly || []).map((d: any) => Number(d.focus_minutes) || 0));

  const completedGoals = (menteeData?.goals || []).filter((g: any) => {
    const c = Array.isArray(g.concepts) ? g.concepts : [];
    return c.length > 0 && c.every((x: any) => x.status === 'completed');
  }).length;

  return (
    <div className="border-t border-border/50 px-4 py-4">
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview"><Activity className="mr-1 h-3.5 w-3.5" />Overview</TabsTrigger>
          <TabsTrigger value="timeline"><Calendar className="mr-1 h-3.5 w-3.5" />Timeline</TabsTrigger>
          <TabsTrigger value="feedback"><MessageSquare className="mr-1 h-3.5 w-3.5" />Comments</TabsTrigger>
          <TabsTrigger value="tasks"><ListChecks className="mr-1 h-3.5 w-3.5" />Tasks</TabsTrigger>
          <TabsTrigger value="milestones"><Award className="mr-1 h-3.5 w-3.5" />Milestones</TabsTrigger>
        </TabsList>

        {/* OVERVIEW */}
        <TabsContent value="overview" className="space-y-4 pt-4">
          {menteeData?.focus && (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Focus Score', value: Math.round(menteeData.focus.score || 0) },
                { label: 'Consistency', value: Math.round(menteeData.focus.consistency || 0) },
                { label: 'Completion', value: Math.round(menteeData.focus.completion || 0) },
                { label: 'Goals Done', value: completedGoals },
              ].map(s => (
                <div key={s.label} className="rounded-lg bg-muted/30 p-3 text-center">
                  <p className="font-display text-lg font-bold text-foreground">{s.value}</p>
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                </div>
              ))}
            </div>
          )}

          {/* Weekly consistency bars */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
              <Flame className="h-4 w-4 text-streak" /> 7-Day Consistency
            </h3>
            <div className="flex items-end gap-1.5 h-24">
              {(weekly || []).map((d: any) => {
                const h = Math.max(4, (Number(d.focus_minutes) / maxFocus) * 100);
                return (
                  <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                      initial={{ height: 0 }} animate={{ height: `${h}%` }}
                      className="w-full rounded-t bg-gradient-to-t from-primary to-primary-glow min-h-[4px]"
                      title={`${Math.round(d.focus_minutes)} min · ${d.sessions} sessions`}
                    />
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(d.day).toLocaleDateString('en', { weekday: 'narrow' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {menteeData && menteeData.sessions.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Recent Sessions</h3>
              <div className="space-y-1">
                {menteeData.sessions.slice(0, 5).map((s: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{s.topic}</span>
                    <span className="text-muted-foreground">{Math.round(s.duration_seconds / 60)}min · +{s.xp_earned}XP</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {menteeData?.reports.some((r: any) => r.confusing_concepts) && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">Recent Confusions</h3>
              <div className="flex flex-wrap gap-1">
                {menteeData.reports.filter((r: any) => r.confusing_concepts)
                  .flatMap((r: any) => r.confusing_concepts.split(/[,;\n]+/).map((c: string) => c.trim()))
                  .filter(Boolean).slice(0, 10)
                  .map((c: string, i: number) => (
                    <span key={i} className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">{c}</span>
                  ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* TIMELINE */}
        <TabsContent value="timeline" className="pt-4">
          <div className="space-y-2 max-h-96 overflow-y-auto pr-2">
            {(timeline || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No activity yet.</p>
            ) : (timeline || []).map((e: any, i: number) => (
              <div key={i} className="flex gap-3 rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                  e.event_type === 'session' ? 'bg-primary' :
                  e.event_type === 'reflection' ? 'bg-xp' :
                  e.event_type === 'achievement' ? 'bg-streak' :
                  e.event_type === 'milestone' ? 'bg-green-500' : 'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                    <span className="text-[10px] uppercase text-muted-foreground shrink-0">{e.event_type}</span>
                  </div>
                  <p className="text-xs text-muted-foreground">{e.detail}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {new Date(e.event_time).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </TabsContent>

        {/* COMMENTS */}
        <TabsContent value="feedback" className="space-y-3 pt-4">
          {isMentor && (
            <div className="space-y-2">
              <Textarea
                placeholder="Leave a comment for your mentee..."
                value={commentText} onChange={e => setCommentText(e.target.value)}
                rows={2}
              />
              <Button size="sm" onClick={() => addComment.mutate()}
                disabled={!commentText.trim() || addComment.isPending}>
                <Plus className="mr-1 h-3.5 w-3.5" /> Post Comment
              </Button>
            </div>
          )}
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {(comments || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No comments yet.</p>
            ) : (comments || []).map((c: any) => (
              <div key={c.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="text-sm text-foreground whitespace-pre-wrap">{c.content}</p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{new Date(c.created_at).toLocaleString()}</span>
                  {isMentor && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delComment.mutate(c.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Resources nested */}
          <div className="pt-4 border-t border-border/50">
            <h3 className="mb-2 text-sm font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> Recommended Resources
            </h3>
            {isMentor && (
              <div className="space-y-2 mb-3">
                <Input placeholder="Title" value={resTitle} onChange={e => setResTitle(e.target.value)} />
                <Input placeholder="URL (optional)" value={resUrl} onChange={e => setResUrl(e.target.value)} />
                <Button size="sm" onClick={() => addResource.mutate()}
                  disabled={!resTitle.trim() || addResource.isPending}>
                  <Link2 className="mr-1 h-3.5 w-3.5" /> Recommend
                </Button>
              </div>
            )}
            <div className="space-y-2">
              {(resources || []).map((r: any) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                  <div className="min-w-0">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noopener noreferrer"
                        className="text-sm font-medium text-primary hover:underline">{r.title}</a>
                    ) : (
                      <p className="text-sm font-medium text-foreground">{r.title}</p>
                    )}
                    {r.note && <p className="text-xs text-muted-foreground">{r.note}</p>}
                  </div>
                  {isMentor && (
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delResource.mutate(r.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </TabsContent>

        {/* TASKS */}
        <TabsContent value="tasks" className="space-y-3 pt-4">
          {isMentor && (
            <div className="flex gap-2">
              <Input placeholder="Task title..." value={taskTitle}
                onChange={e => setTaskTitle(e.target.value)} className="flex-1" />
              <Input type="date" value={taskDue} onChange={e => setTaskDue(e.target.value)} className="w-40" />
              <Button size="sm" onClick={() => addTask.mutate()}
                disabled={!taskTitle.trim() || addTask.isPending}>Assign</Button>
            </div>
          )}
          <div className="space-y-2">
            {(tasks || []).length === 0 ? (
              <p className="text-sm text-muted-foreground">No tasks yet.</p>
            ) : (tasks || []).map((t: any) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => toggleTask.mutate({ id: t.id, status: t.status === 'done' ? 'open' : 'done' })}>
                    <CheckCircle2 className={`h-5 w-5 ${t.status === 'done' ? 'text-xp fill-xp/20' : 'text-muted-foreground'}`} />
                  </button>
                  <div className="min-w-0">
                    <p className={`text-sm font-medium ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</p>
                    {t.due_date && <p className="text-[10px] text-muted-foreground">Due {new Date(t.due_date).toLocaleDateString()}</p>}
                  </div>
                </div>
                {isMentor && (
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => delTask.mutate(t.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        {/* MILESTONES */}
        <TabsContent value="milestones" className="space-y-4 pt-4">
          {(menteeData?.goals || []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Mentee has no goals yet.</p>
          ) : (menteeData?.goals || []).map((g: any) => {
            const concepts = Array.isArray(g.concepts) ? g.concepts : [];
            return (
              <div key={g.id} className="rounded-lg border border-border/50 bg-muted/20 p-3">
                <p className="mb-2 text-sm font-semibold text-foreground">
                  {g.is_active && <span className="text-primary mr-1">●</span>}
                  {g.description}
                </p>
                <div className="space-y-1">
                  {concepts.map((c: any) => {
                    const key = `${g.id}:${c.id}`;
                    const approved = approvedSet.has(key);
                    const approvalRow = (approvals || []).find((a: any) => a.goal_id === g.id && a.concept_id === c.id);
                    return (
                      <div key={c.id} className="flex items-center justify-between text-xs py-1">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            c.status === 'completed' ? 'bg-xp' :
                            c.status === 'in_progress' ? 'bg-streak' : 'bg-muted-foreground'
                          }`} />
                          <span className="text-foreground truncate">{c.name}</span>
                          {approved && <Award className="h-3 w-3 text-green-500" />}
                        </div>
                        {isMentor && (
                          approved && approvalRow ? (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                              onClick={() => revokeMilestone.mutate(approvalRow.id)}>Revoke</Button>
                          ) : (
                            <Button size="sm" variant="ghost" className="h-6 text-[10px]"
                              disabled={c.status !== 'completed'}
                              onClick={() => approveMilestone.mutate({ goalId: g.id, conceptId: c.id, conceptName: c.name })}>
                              Approve
                            </Button>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
