import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, AlertTriangle, Brain, Calendar, Clock, Zap,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap, BarChart, Bar,
} from 'recharts';

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

export default function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);
  const startISO = startDate.toISOString();

  // Fetch study sessions for trend data
  const { data: sessions } = useQuery({
    queryKey: ['analytics-sessions', user?.id, range],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('study_sessions')
        .select('started_at, duration_seconds, xp_earned, interruptions, topic, concept_id')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .gte('started_at', startISO)
        .order('started_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch daily reports for confusion data
  const { data: reports } = useQuery({
    queryKey: ['analytics-reports', user?.id, range],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('report_date, confusing_concepts, xp_earned, studied')
        .eq('user_id', user.id)
        .gte('created_at', startISO)
        .order('report_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch goals for bottleneck identification
  const { data: goals } = useQuery({
    queryKey: ['analytics-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('learning_goals')
        .select('id, description, concepts')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Process XP trend data (group by day)
  const xpTrend = (() => {
    if (!sessions) return [];
    const byDay: Record<string, { xp: number; minutes: number; sessions: number }> = {};
    sessions.forEach(s => {
      const day = s.started_at.split('T')[0];
      if (!byDay[day]) byDay[day] = { xp: 0, minutes: 0, sessions: 0 };
      byDay[day].xp += s.xp_earned;
      byDay[day].minutes += Math.round(s.duration_seconds / 60);
      byDay[day].sessions += 1;
    });
    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        xp: d.xp,
        minutes: d.minutes,
        sessions: d.sessions,
      }));
  })();

  // Process confusion heatmap data
  const confusionData = (() => {
    if (!reports) return [];
    const freq: Record<string, number> = {};
    reports.forEach(r => {
      if (r.confusing_concepts) {
        const concepts = r.confusing_concepts.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean);
        concepts.forEach(c => {
          const key = c.toLowerCase().substring(0, 40);
          freq[key] = (freq[key] || 0) + 1;
        });
      }
    });
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 20)
      .map(([name, count]) => ({ name, size: count, count }));
  })();

  // Bottleneck identification: locked concepts with prerequisites
  const bottlenecks = (() => {
    if (!goals) return [];
    const items: Array<{ concept: string; goal: string; status: string; prereqs: string[] }> = [];
    goals.forEach(g => {
      const goalConcepts = Array.isArray(g.concepts) ? (g.concepts as any[]) : [];
      goalConcepts.forEach((c: any) => {
        if (c.status === 'locked') {
          const prereqNames = c.prerequisites
            ?.map((pid: string) => goalConcepts.find((x: any) => x.id === pid)?.name)
            .filter(Boolean) || [];
          items.push({
            concept: c.name,
            goal: g.description,
            status: c.status,
            prereqs: prereqNames,
          });
        }
      });
    });
    return items.slice(0, 10);
  })();

  // Study topic distribution
  const topicDistribution = (() => {
    if (!sessions) return [];
    const freq: Record<string, number> = {};
    sessions.forEach(s => {
      const topic = s.topic?.substring(0, 30) || 'Unknown';
      freq[topic] = (freq[topic] || 0) + Math.round(s.duration_seconds / 60);
    });
    return Object.entries(freq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, minutes]) => ({ name, minutes }));
  })();

  // Summary stats
  const totalXP = sessions?.reduce((sum, s) => sum + s.xp_earned, 0) || 0;
  const totalMinutes = sessions?.reduce((sum, s) => sum + Math.round(s.duration_seconds / 60), 0) || 0;
  const totalSessions = sessions?.length || 0;
  const avgInterruptions = sessions && sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.interruptions, 0) / sessions.length).toFixed(1)
    : '0';

  // Custom Treemap content
  const TreemapContent = (props: any) => {
    const { x, y, width, height, name, count } = props;
    if (width < 40 || height < 25) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={4}
          fill={`hsl(0 ${Math.min(80, count * 20)}% ${60 - count * 5}%)`}
          stroke="hsl(225 15% 15%)" strokeWidth={1} />
        {width > 60 && height > 35 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
              fill="hsl(0 0% 100%)" fontSize={11} fontWeight={600}>
              {name.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + '…' : name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
              fill="hsl(0 0% 80%)" fontSize={10}>
              ×{count}
            </text>
          </>
        )}
      </g>
    );
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
              <BarChart3 className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
              <p className="text-sm text-muted-foreground">Track your learning patterns and identify bottlenecks</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => setRange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === opt.value
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { icon: Zap, label: 'XP Earned', value: totalXP.toLocaleString(), gradient: 'bg-gradient-xp' },
            { icon: Clock, label: 'Study Time', value: `${totalMinutes}m`, gradient: 'bg-gradient-primary' },
            { icon: Calendar, label: 'Sessions', value: totalSessions.toString(), gradient: 'bg-gradient-streak' },
            { icon: AlertTriangle, label: 'Avg Interruptions', value: avgInterruptions, gradient: 'bg-gradient-card' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.gradient}`}>
                  <card.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="font-display text-xl font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* XP & Study Time Trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">XP & Study Time Trends</h2>
          </div>
          {xpTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={xpTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 15%)" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(220 12% 50%)', fontSize: 11 }} />
                <YAxis yAxisId="xp" tick={{ fill: 'hsl(220 12% 50%)', fontSize: 11 }} />
                <YAxis yAxisId="min" orientation="right" tick={{ fill: 'hsl(220 12% 50%)', fontSize: 11 }} />
                <Tooltip contentStyle={{ background: 'hsl(225 22% 9%)', border: '1px solid hsl(225 15% 15%)', borderRadius: 8, color: 'hsl(220 20% 93%)' }} />
                <Line yAxisId="xp" type="monotone" dataKey="xp" stroke="hsl(150 75% 48%)" strokeWidth={2} dot={false} name="XP" />
                <Line yAxisId="min" type="monotone" dataKey="minutes" stroke="hsl(230 80% 62%)" strokeWidth={2} dot={false} name="Minutes" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No session data yet for this period
            </div>
          )}
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Confusion Heatmap */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }} className="glass-card rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <Brain className="h-5 w-5 text-destructive" />
              <h2 className="font-display text-lg font-semibold text-foreground">Confusion Heatmap</h2>
            </div>
            {confusionData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <Treemap
                  data={confusionData}
                  dataKey="size"
                  aspectRatio={4 / 3}
                  content={<TreemapContent />}
                />
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No confusion data yet. Submit daily reports to track confusing topics.
              </div>
            )}
          </motion.div>

          {/* Topic Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }} className="glass-card rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <BarChart3 className="h-5 w-5 text-xp" />
              <h2 className="font-display text-lg font-semibold text-foreground">Time by Topic</h2>
            </div>
            {topicDistribution.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={topicDistribution} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(225 15% 15%)" />
                  <XAxis type="number" tick={{ fill: 'hsl(220 12% 50%)', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100}
                    tick={{ fill: 'hsl(220 12% 50%)', fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: 'hsl(225 22% 9%)', border: '1px solid hsl(225 15% 15%)', borderRadius: 8, color: 'hsl(220 20% 93%)' }}
                    formatter={(value: number) => [`${value} min`, 'Study Time']} />
                  <Bar dataKey="minutes" fill="hsl(150 75% 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                No topic data yet
              </div>
            )}
          </motion.div>
        </div>

        {/* Bottleneck Identification */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }} className="glass-card rounded-xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-streak" />
            <h2 className="font-display text-lg font-semibold text-foreground">Bottlenecks</h2>
            <span className="text-xs text-muted-foreground">Locked concepts blocking your progress</span>
          </div>
          {bottlenecks.length > 0 ? (
            <div className="space-y-2">
              {bottlenecks.map((b, i) => (
                <div key={i} className="flex items-start gap-3 rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-streak" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{b.concept}</p>
                    <p className="text-xs text-muted-foreground truncate">Goal: {b.goal}</p>
                    {b.prereqs.length > 0 && (
                      <p className="mt-1 text-xs text-streak">
                        Blocked by: {b.prereqs.join(', ')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex h-24 items-center justify-center text-sm text-muted-foreground">
              No bottlenecks detected — great progress!
            </div>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
