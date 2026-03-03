import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Award, BookOpen, Brain, Calendar, Clock, Download, ExternalLink,
  Flame, Globe, Printer, Target, Zap,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Portfolio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile } = useQuery({
    queryKey: ['portfolio-profile', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const { data: goals } = useQuery({
    queryKey: ['portfolio-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('learning_goals').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: sessions } = useQuery({
    queryKey: ['portfolio-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('study_sessions').select('duration_seconds, xp_earned, started_at, topic')
        .eq('user_id', user.id).not('ended_at', 'is', null).order('started_at', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reports } = useQuery({
    queryKey: ['portfolio-reports', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('daily_reports').select('*').eq('user_id', user.id).order('report_date', { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });

  const { data: focusScore } = useQuery({
    queryKey: ['portfolio-focus', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase.rpc('calculate_focus_integrity', { p_user_id: user.id });
      return data as any;
    },
    enabled: !!user,
  });

  const { data: communityPosts } = useQuery({
    queryKey: ['portfolio-posts', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('community_posts').select('id').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const togglePublic = useMutation({
    mutationFn: async (isPublic: boolean) => {
      if (!user) return;
      const { error } = await supabase.from('profiles').update({ is_public: isPublic } as any).eq('user_id', user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-profile'] });
      toast.success('Portfolio visibility updated');
    },
  });

  // Computed stats
  const totalStudyHours = Math.round((sessions?.reduce((s, x) => s + x.duration_seconds, 0) || 0) / 3600);
  const totalSessions = sessions?.length || 0;
  const totalReports = reports?.length || 0;
  const totalPosts = communityPosts?.length || 0;
  const completedGoals = goals?.filter(g => {
    const concepts = Array.isArray(g.concepts) ? (g.concepts as any[]) : [];
    return concepts.length > 0 && concepts.every((c: any) => c.status === 'completed');
  }).length || 0;
  const topTopics = (() => {
    const freq: Record<string, number> = {};
    sessions?.forEach(s => { freq[s.topic] = (freq[s.topic] || 0) + 1; });
    return Object.entries(freq).sort(([, a], [, b]) => b - a).slice(0, 5).map(([t]) => t);
  })();

  // Timeline milestones
  const milestones = (() => {
    const items: Array<{ date: string; title: string; type: string; detail?: string }> = [];
    goals?.forEach(g => {
      items.push({ date: g.created_at, title: `Started: ${g.description.substring(0, 50)}`, type: 'goal' });
    });
    // First session
    if (sessions?.length) {
      const first = sessions[sessions.length - 1];
      items.push({ date: first.started_at, title: 'First study session', type: 'session', detail: first.topic });
    }
    // XP milestones
    const xp = profile?.xp || 0;
    [100, 500, 1000, 5000].forEach(threshold => {
      if (xp >= threshold) items.push({ date: profile?.created_at || '', title: `Reached ${threshold} XP`, type: 'xp' });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 15);
  })();

  const handlePrint = () => window.print();

  return (
    <Layout>
      <div className="space-y-6 print:space-y-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <Award className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Learning Portfolio</h1>
              <p className="text-sm text-muted-foreground">Your learning journey at a glance</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Public</span>
              <Switch
                checked={(profile as any)?.is_public || false}
                onCheckedChange={(v) => togglePublic.mutate(v)}
              />
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint} className="gap-2">
              <Printer className="h-4 w-4" /> Export PDF
            </Button>
          </div>
        </motion.div>

        {/* Print header */}
        <div className="hidden print:block">
          <h1 className="text-2xl font-bold">{profile?.name}'s Learning Portfolio</h1>
          <p className="text-sm text-muted-foreground">Generated on {new Date().toLocaleDateString()}</p>
        </div>

        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-xl p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground">
              {profile?.name?.charAt(0).toUpperCase() || '?'}
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-foreground">{profile?.name}</h2>
              <div className="mt-1 flex flex-wrap gap-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5 text-xp" /> {profile?.xp?.toLocaleString() || 0} XP</span>
                <span className="flex items-center gap-1"><Flame className="h-3.5 w-3.5 text-streak" /> {profile?.streak || 0} day streak</span>
                <span className="rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold text-primary">{profile?.level}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {[
            { icon: Clock, label: 'Study Hours', value: totalStudyHours },
            { icon: Calendar, label: 'Sessions', value: totalSessions },
            { icon: BookOpen, label: 'Reports', value: totalReports },
            { icon: Target, label: 'Goals', value: goals?.length || 0 },
            { icon: Award, label: 'Completed', value: completedGoals },
            { icon: Brain, label: 'Focus Score', value: focusScore?.score ? Math.round(focusScore.score) : '—' },
          ].map((s, i) => (
            <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.08 + i * 0.03 }} className="glass-card rounded-xl p-4 text-center">
              <s.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="font-display text-xl font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Top Topics */}
        {topTopics.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card rounded-xl p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Top Topics Studied</h2>
            <div className="flex flex-wrap gap-2">
              {topTopics.map(t => (
                <span key={t} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm font-medium text-primary">{t}</span>
              ))}
            </div>
          </motion.div>
        )}

        {/* Goals Overview */}
        {goals && goals.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="glass-card rounded-xl p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Learning Goals</h2>
            <div className="space-y-3">
              {goals.map(g => {
                const concepts = Array.isArray(g.concepts) ? (g.concepts as any[]) : [];
                const completed = concepts.filter((c: any) => c.status === 'completed').length;
                const pct = concepts.length > 0 ? Math.round((completed / concepts.length) * 100) : 0;
                return (
                  <div key={g.id} className="rounded-lg border border-border/50 bg-muted/20 p-4">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium text-foreground">{g.description}</p>
                      <span className="text-xs text-muted-foreground">{pct}%</span>
                    </div>
                    <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-xp transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="mt-2 flex gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{g.mastery_level}</span>
                      <span>•</span>
                      <span className="capitalize">{g.goal_type}</span>
                      {g.is_active && <span className="text-primary font-medium">Active</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Timeline */}
        {milestones.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            className="glass-card rounded-xl p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Milestones & Timeline</h2>
            <div className="relative space-y-4 pl-6 before:absolute before:left-2 before:top-2 before:h-[calc(100%-16px)] before:w-px before:bg-border">
              {milestones.map((m, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-6 top-1.5 h-3 w-3 rounded-full border-2 border-background ${
                    m.type === 'goal' ? 'bg-primary' : m.type === 'xp' ? 'bg-xp' : 'bg-streak'
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{m.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(m.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Community Contributions */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
          className="glass-card rounded-xl p-6">
          <h2 className="mb-2 font-display text-lg font-semibold text-foreground">Community Contributions</h2>
          <p className="text-sm text-muted-foreground">{totalPosts} posts shared with the community</p>
        </motion.div>
      </div>

      {/* Print styles */}
      <style>{`
        @media print {
          .glass-card { border: 1px solid #ddd !important; background: white !important; }
          body { background: white !important; color: black !important; }
          aside, nav, .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
        }
      `}</style>
    </Layout>
  );
}
