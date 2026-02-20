import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Zap, Flame, Clock, FileText, TrendingUp, BookOpen, Target, ArrowRight, Timer } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getProfile, getStudyPlans, getTodaySessions, getFocusIntegrityScore, getRecentActivity } from '@/lib/database';
import FocusGauge from '@/components/FocusGauge';

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

const levels = [
  { name: 'Beginner', min: 0, max: 1000 },
  { name: 'Intermediate', min: 1000, max: 5000 },
  { name: 'Advanced', min: 5000, max: 15000 },
  { name: 'Master', min: 15000, max: 50000 },
];

export default function Dashboard() {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? getProfile(user.id) : null,
    enabled: !!user,
  });

  const { data: studyPlans } = useQuery({
    queryKey: ['study-plans', user?.id],
    queryFn: () => user ? getStudyPlans(user.id) : [],
    enabled: !!user,
  });

  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', user?.id],
    queryFn: () => user ? getTodaySessions(user.id) : [],
    enabled: !!user,
  });

  const { data: focusScore } = useQuery({
    queryKey: ['focus-integrity', user?.id],
    queryFn: () => user ? getFocusIntegrityScore(user.id) : null,
    enabled: !!user,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ['recent-activity', user?.id],
    queryFn: () => user ? getRecentActivity(user.id) : [],
    enabled: !!user,
  });

  const displayName = profile?.name || user?.email?.split('@')[0] || 'Learner';
  const xp = profile?.xp || 0;
  const streak = profile?.streak || 0;
  const hoursToday = (todaySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / 3600;

  const currentLevel = levels.find(l => xp >= l.min && xp < l.max) || levels[3];
  const progress = ((xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

  // Get today's plan
  const dayOfWeek = new Date().getDay();
  const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const todayPlan = studyPlans?.find(p => p.day_of_week === adjustedDay);
  const blocks = (todayPlan?.blocks as any[]) || [];
  const completedBlocks = blocks.filter((b: any) => b.completed).length;
  const totalBlocks = blocks.length || 1;

  const statCards = [
    { label: 'Total XP', value: xp.toLocaleString(), icon: Zap, color: 'text-xp', glow: 'shadow-glow-xp' },
    { label: 'Day Streak', value: streak.toString(), icon: Flame, color: 'text-streak', glow: 'shadow-glow-streak' },
    { label: 'Hours Today', value: hoursToday.toFixed(1), icon: Clock, color: 'text-highlight', glow: '' },
    { label: 'Sessions', value: (todaySessions?.length || 0).toString(), icon: FileText, color: 'text-level', glow: '' },
  ];

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back, <span className="text-gradient-primary">{displayName.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">
            {streak > 0 ? `Keep the momentum going — you're on a ${streak}-day streak!` : 'Start your learning journey today!'}
          </p>
        </motion.div>

        {/* Stat Cards */}
        <div className="grid grid-cols-4 gap-4">
          {statCards.map((stat, i) => (
            <motion.div
              key={stat.label}
              {...fadeUp}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`glass-card rounded-xl p-5 ${stat.glow}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <p className={`mt-2 font-display text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* Today's Progress */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.4 }} className="col-span-2 glass-card rounded-xl p-6">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">Today's Study Plan</h2>
              <Link to="/plan" className="flex items-center gap-1 text-sm text-primary hover:underline">
                View full plan <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            
            {blocks.length > 0 ? (
              <>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{completedBlocks} of {totalBlocks} blocks completed</span>
                    <span className="font-medium text-xp">{Math.round((completedBlocks / totalBlocks) * 100)}%</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      className="h-full rounded-full bg-gradient-xp"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedBlocks / totalBlocks) * 100}%` }}
                      transition={{ duration: 1, delay: 0.6 }}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  {blocks.slice(0, 5).map((block: any) => (
                    <div key={block.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${block.completed ? 'border-xp/20 bg-xp/5' : 'border-border bg-muted/30'}`}>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold uppercase ${block.completed ? 'bg-gradient-xp text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        {block.type?.charAt(0) || 'P'}
                      </div>
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${block.completed ? 'text-foreground line-through opacity-60' : 'text-foreground'}`}>{block.title}</p>
                        <p className="text-xs text-muted-foreground">{block.duration} min</p>
                      </div>
                      {block.completed && <Zap className="h-4 w-4 text-xp" />}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="py-8 text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <p className="mt-3 text-sm text-muted-foreground">No study plan yet.</p>
                <Link to="/onboarding" className="mt-2 inline-block text-sm text-primary hover:underline">
                  Create your learning plan →
                </Link>
              </div>
            )}
          </motion.div>

          {/* Right column: Focus Gauge + Quick Actions */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.5 }} className="space-y-4">
            {/* Focus Integrity Score */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Focus Score</h2>
              <FocusGauge
                score={focusScore?.score || 0}
                size={140}
                breakdown={focusScore ? {
                  consistency: focusScore.consistency,
                  completion: focusScore.completion,
                  interruption: focusScore.interruption,
                  proofQuality: focusScore.proofQuality,
                } : undefined}
              />
            </div>

            {/* Quick Actions */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Quick Actions</h2>
              <div className="space-y-3">
                <Link to="/study" className="flex items-center gap-3 rounded-lg bg-gradient-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-transform hover:scale-[1.02]">
                  <Clock className="h-4 w-4" /> Start Study Session
                </Link>
                <Link to="/report" className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  <FileText className="h-4 w-4" /> Submit Daily Report
                </Link>
                <Link to="/community" className="flex items-center gap-3 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent">
                  <BookOpen className="h-4 w-4" /> Browse Community
                </Link>
              </div>
            </div>

            {/* Level Progress */}
            <div className="glass-card rounded-xl p-6">
              <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Level Progress</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level/10">
                  <TrendingUp className="h-6 w-6 text-level" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{profile?.level || 'Beginner'}</p>
                  <p className="text-xs text-muted-foreground">{(currentLevel.max - xp).toLocaleString()} XP to next level</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-level"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
              </div>
            </div>
          </motion.div>
        </div>

        {/* Recent Activity Feed */}
        {recentActivity && recentActivity.length > 0 && (
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.6 }} className="glass-card rounded-xl p-6">
            <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Activity</h2>
            <div className="space-y-2">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-8 w-8 items-center justify-center rounded-md ${
                      activity.type === 'session' ? 'bg-primary/10' : 'bg-xp/10'
                    }`}>
                      {activity.type === 'session' ? (
                        <Timer className="h-4 w-4 text-primary" />
                      ) : (
                        <FileText className="h-4 w-4 text-xp" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {activity.meta || activity.type === 'report' ? 'Daily Report' : ''}
                        {' • '}
                        {new Date(activity.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-medium text-xp">+{activity.xp} XP</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
