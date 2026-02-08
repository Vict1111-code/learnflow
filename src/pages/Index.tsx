import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Zap, Flame, Clock, FileText, TrendingUp, BookOpen, Target, ArrowRight } from 'lucide-react';
import { mockUser, mockStudyPlan } from '@/lib/mock-data';
import { Link } from 'react-router-dom';

const statCards = [
  { label: 'Total XP', value: mockUser.xp.toLocaleString(), icon: Zap, color: 'text-xp', glow: 'shadow-glow-xp', gradient: 'bg-gradient-xp' },
  { label: 'Day Streak', value: mockUser.streak.toString(), icon: Flame, color: 'text-streak', glow: 'shadow-glow-streak', gradient: 'bg-gradient-streak' },
  { label: 'Hours Today', value: mockUser.studyHoursToday.toString(), icon: Clock, color: 'text-highlight', glow: '', gradient: '' },
  { label: 'Reports', value: mockUser.reportsSubmitted.toString(), icon: FileText, color: 'text-level', glow: '', gradient: '' },
];

const fadeUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  const todayPlan = mockStudyPlan[0];
  const completedBlocks = todayPlan?.blocks.filter(b => b.completed).length ?? 0;
  const totalBlocks = todayPlan?.blocks.length ?? 0;

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div {...fadeUp} transition={{ duration: 0.5 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Welcome back, <span className="text-gradient-primary">{mockUser.name.split(' ')[0]}</span>
          </h1>
          <p className="mt-1 text-muted-foreground">Keep the momentum going — you're on a {mockUser.streak}-day streak!</p>
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
              {todayPlan?.blocks.map((block) => (
                <div key={block.id} className={`flex items-center gap-3 rounded-lg border px-4 py-3 transition-colors ${block.completed ? 'border-xp/20 bg-xp/5' : 'border-border bg-muted/30'}`}>
                  <div className={`flex h-8 w-8 items-center justify-center rounded-md text-xs font-bold uppercase ${block.completed ? 'bg-gradient-xp text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                    {block.type.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${block.completed ? 'text-foreground line-through opacity-60' : 'text-foreground'}`}>{block.title}</p>
                    <p className="text-xs text-muted-foreground">{block.duration} min</p>
                  </div>
                  {block.completed && <Zap className="h-4 w-4 text-xp" />}
                </div>
              ))}
            </div>
          </motion.div>

          {/* Quick Actions */}
          <motion.div {...fadeUp} transition={{ duration: 0.5, delay: 0.5 }} className="space-y-4">
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

            <div className="glass-card rounded-xl p-6">
              <h2 className="mb-3 font-display text-lg font-semibold text-foreground">Level Progress</h2>
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-level/10">
                  <TrendingUp className="h-6 w-6 text-level" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{mockUser.level}</p>
                  <p className="text-xs text-muted-foreground">5,000 XP to next level</p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                <motion.div
                  className="h-full rounded-full bg-level"
                  initial={{ width: 0 }}
                  animate={{ width: '68%' }}
                  transition={{ duration: 1, delay: 0.8 }}
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </Layout>
  );
}
