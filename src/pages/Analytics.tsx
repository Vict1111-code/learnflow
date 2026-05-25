import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import {
  BarChart3, TrendingUp, AlertTriangle, Brain, Calendar, Clock, Zap, Target, BookOpen,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Treemap, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell, ComposedChart,
} from 'recharts';

const RANGE_OPTIONS = [
  { label: '7 days', value: 7 },
  { label: '30 days', value: 30 },
  { label: '90 days', value: 90 },
];

const PIE_COLORS = [
  'hsl(230 80% 62%)', 'hsl(150 75% 48%)', 'hsl(38 95% 55%)',
  'hsl(270 70% 60%)', 'hsl(190 80% 55%)', 'hsl(0 72% 51%)',
];

export default function Analytics() {
  const { user } = useAuth();
  const [range, setRange] = useState(30);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - range);
  const startISO = startDate.toISOString();

  // Fetch study sessions
  const { data: sessions } = useQuery({
    queryKey: ['analytics-sessions', user?.id, range],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('study_sessions')
        .select('started_at, duration_seconds, xp_earned, interruptions, topic, concept_id, block_type, goal_id')
        .eq('user_id', user.id)
        .not('ended_at', 'is', null)
        .gte('started_at', startISO)
        .order('started_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch daily reports
  const { data: reports } = useQuery({
    queryKey: ['analytics-reports', user?.id, range],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('daily_reports')
        .select('report_date, confusing_concepts, xp_earned, studied, explanation')
        .eq('user_id', user.id)
        .gte('created_at', startISO)
        .order('report_date', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch goals
  const { data: goals } = useQuery({
    queryKey: ['analytics-goals', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('learning_goals')
        .select('id, description, concepts, mastery_level, is_active')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch focus integrity
  const { data: focusScore } = useQuery({
    queryKey: ['analytics-focus', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.rpc('calculate_focus_integrity', { p_user_id: user.id });
      if (error) return null;
      return data as any;
    },
    enabled: !!user,
  });

  // Combined XP trend (sessions + reports grouped by day)
  const xpTrend = (() => {
    const byDay: Record<string, { sessionXP: number; reportXP: number; minutes: number; sessions: number }> = {};

    sessions?.forEach(s => {
      const day = s.started_at.split('T')[0];
      if (!byDay[day]) byDay[day] = { sessionXP: 0, reportXP: 0, minutes: 0, sessions: 0 };
      byDay[day].sessionXP += s.xp_earned;
      byDay[day].minutes += Math.round(s.duration_seconds / 60);
      byDay[day].sessions += 1;
    });

    reports?.forEach(r => {
      const day = r.report_date;
      if (!byDay[day]) byDay[day] = { sessionXP: 0, reportXP: 0, minutes: 0, sessions: 0 };
      byDay[day].reportXP += r.xp_earned;
    });

    return Object.entries(byDay)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, d]) => ({
        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        totalXP: d.sessionXP + d.reportXP,
        sessionXP: d.sessionXP,
        reportXP: d.reportXP,
        minutes: d.minutes,
        sessions: d.sessions,
      }));
  })();

  // Cumulative XP over time
  const cumulativeXP = (() => {
    let cumulative = 0;
    return xpTrend.map(d => {
      cumulative += d.totalXP;
      return { ...d, cumulative };
    });
  })();

  // Confusion heatmap
  const confusionData = (() => {
    if (!reports) return [];
    const freq: Record<string, number> = {};
    reports.forEach(r => {
      if (r.confusing_concepts) {
        r.confusing_concepts.split(/[,;\n]+/).map(c => c.trim()).filter(Boolean).forEach(c => {
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

  // Bottlenecks
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
          items.push({ concept: c.name, goal: g.description, status: c.status, prereqs: prereqNames });
        }
      });
    });
    return items.slice(0, 10);
  })();

  // Topic distribution
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

  // Block type distribution (pie)
  const blockTypeData = (() => {
    if (!sessions) return [];
    const freq: Record<string, number> = {};
    sessions.forEach(s => {
      const t = s.block_type || 'other';
      freq[t] = (freq[t] || 0) + 1;
    });
    return Object.entries(freq).map(([name, value]) => ({ name, value }));
  })();

  // Goal progress overview
  const goalProgress = (() => {
    if (!goals) return [];
    return goals.map(g => {
      const concepts = Array.isArray(g.concepts) ? (g.concepts as any[]) : [];
      const total = concepts.length;
      const completed = concepts.filter((c: any) => c.status === 'completed').length;
      return {
        name: g.description.substring(0, 30),
        completed,
        remaining: total - completed,
        total,
        percent: total > 0 ? Math.round((completed / total) * 100) : 0,
        isActive: g.is_active,
      };
    });
  })();

  // Summary stats
  const totalXP = (sessions?.reduce((s, x) => s + x.xp_earned, 0) || 0) +
    (reports?.reduce((s, x) => s + x.xp_earned, 0) || 0);
  const totalMinutes = sessions?.reduce((s, x) => s + Math.round(x.duration_seconds / 60), 0) || 0;
  const totalSessions = sessions?.length || 0;
  const totalReports = reports?.length || 0;
  const avgInterruptions = sessions && sessions.length > 0
    ? (sessions.reduce((s, x) => s + x.interruptions, 0) / sessions.length).toFixed(1) : '0';
  const focusScoreVal = focusScore?.score ?? '—';

  const TreemapContent = (props: any) => {
    const { x, y, width, height, name, count } = props;
    if (width < 40 || height < 25) return null;
    return (
      <g>
        <rect x={x} y={y} width={width} height={height} rx={4}
          fill={`hsl(0 ${Math.min(80, count * 20)}% ${60 - count * 5}%)`}
          stroke="hsl(var(--border))" strokeWidth={1} />
        {width > 60 && height > 35 && (
          <>
            <text x={x + width / 2} y={y + height / 2 - 6} textAnchor="middle"
              fill="hsl(var(--foreground))" fontSize={11} fontWeight={600}>
              {name.length > Math.floor(width / 7) ? name.substring(0, Math.floor(width / 7)) + '…' : name}
            </text>
            <text x={x + width / 2} y={y + height / 2 + 10} textAnchor="middle"
              fill="hsl(var(--muted-foreground))" fontSize={10}>
              ×{count}
            </text>
          </>
        )}
      </g>
    );
  };

  const tooltipStyle = {
    background: 'hsl(var(--card))',
    border: '1px solid hsl(var(--border))',
    borderRadius: 8,
    color: 'hsl(var(--foreground))',
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
              <p className="text-sm text-muted-foreground">Track patterns, identify bottlenecks, measure growth</p>
            </div>
          </div>
          <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1">
            {RANGE_OPTIONS.map(opt => (
              <button key={opt.value} onClick={() => setRange(opt.value)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  range === opt.value ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}>
                {opt.label}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-6">
          {[
            { icon: Zap, label: 'Total XP', value: totalXP.toLocaleString(), gradient: 'bg-gradient-xp' },
            { icon: Clock, label: 'Study Time', value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`, gradient: 'bg-gradient-primary' },
            { icon: Calendar, label: 'Sessions', value: totalSessions.toString(), gradient: 'bg-gradient-streak' },
            { icon: BookOpen, label: 'Reports', value: totalReports.toString(), gradient: 'bg-gradient-card' },
            { icon: AlertTriangle, label: 'Avg Interrupts', value: avgInterruptions, gradient: 'bg-gradient-streak' },
            { icon: Target, label: 'Focus Score', value: String(focusScoreVal), gradient: 'bg-gradient-primary' },
          ].map((card, i) => (
            <motion.div key={card.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.04 }} className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.gradient}`}>
                  <card.icon className="h-5 w-5 text-primary-foreground" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">{card.label}</p>
                  <p className="font-display text-lg font-bold text-foreground">{card.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Cumulative XP Growth */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }} className="glass-card rounded-xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <TrendingUp className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">XP Growth</h2>
            <span className="text-xs text-muted-foreground">Cumulative + daily breakdown (sessions + reports)</span>
          </div>
          {cumulativeXP.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={cumulativeXP}>
                <defs>
                  <linearGradient id="gradXP" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(150 75% 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(150 75% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis yAxisId="cum" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis yAxisId="daily" orientation="right" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area yAxisId="cum" type="monotone" dataKey="cumulative" stroke="hsl(150 75% 48%)" fill="url(#gradXP)" strokeWidth={2} name="Cumulative XP" />
                <Line yAxisId="daily" type="monotone" dataKey="sessionXP" stroke="hsl(230 80% 62%)" strokeWidth={1.5} dot={false} name="Session XP" />
                <Line yAxisId="daily" type="monotone" dataKey="reportXP" stroke="hsl(38 95% 55%)" strokeWidth={1.5} dot={false} name="Report XP" />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
              No data yet for this period
            </div>
          )}
        </motion.div>

        {/* Study time trend */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }} className="glass-card rounded-xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <Clock className="h-5 w-5 text-primary" />
            <h2 className="font-display text-lg font-semibold text-foreground">Daily Study Time</h2>
          </div>
          {xpTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={xpTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} min`, 'Study Time']} />
                <Bar dataKey="minutes" fill="hsl(230 80% 62%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-36 items-center justify-center text-sm text-muted-foreground">No data yet</div>
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
                <Treemap data={confusionData} dataKey="size" aspectRatio={4 / 3} content={<TreemapContent />} />
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
                Submit daily reports with confusing concepts to see patterns
              </div>
            )}
          </motion.div>

          {/* Block Type Distribution */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.17 }} className="glass-card rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <Target className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Session Types</h2>
            </div>
            {blockTypeData.length > 0 ? (
              <div className="flex items-center gap-6">
                <ResponsiveContainer width="50%" height={220}>
                  <PieChart>
                    <Pie data={blockTypeData} dataKey="value" cx="50%" cy="50%" innerRadius={40} outerRadius={80}
                      paddingAngle={3} stroke="none">
                      {blockTypeData.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-col gap-2">
                  {blockTypeData.map((d, i) => (
                    <div key={d.name} className="flex items-center gap-2 text-sm">
                      <div className="h-3 w-3 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="capitalize text-foreground">{d.name}</span>
                      <span className="text-muted-foreground">({d.value})</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No session data</div>
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
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <YAxis dataKey="name" type="category" width={100}
                    tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v} min`, 'Study Time']} />
                  <Bar dataKey="minutes" fill="hsl(150 75% 48%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No topic data</div>
            )}
          </motion.div>

          {/* Goal Progress */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }} className="glass-card rounded-xl p-6">
            <div className="mb-4 flex items-center gap-3">
              <BookOpen className="h-5 w-5 text-primary" />
              <h2 className="font-display text-lg font-semibold text-foreground">Goal Progress</h2>
            </div>
            {goalProgress.length > 0 ? (
              <div className="space-y-3">
                {goalProgress.map((g, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-foreground truncate max-w-[70%]">
                        {g.isActive && <span className="mr-1 text-primary">●</span>}
                        {g.name}
                      </span>
                      <span className="text-muted-foreground">{g.completed}/{g.total} ({g.percent}%)</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-gradient-xp transition-all" style={{ width: `${g.percent}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No goals created</div>
            )}
          </motion.div>
        </div>

        {/* Bottlenecks */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }} className="glass-card rounded-xl p-6">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-streak" />
            <h2 className="font-display text-lg font-semibold text-foreground">Bottlenecks</h2>
            <span className="text-xs text-muted-foreground">Locked concepts blocking progress</span>
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
                      <p className="mt-1 text-xs text-streak">Blocked by: {b.prereqs.join(', ')}</p>
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
