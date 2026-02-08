import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { mockUser } from '@/lib/mock-data';
import { Zap, Flame, Clock, FileText, Target, TrendingUp, Calendar } from 'lucide-react';

const stats = [
  { label: 'Total XP', value: mockUser.xp.toLocaleString(), icon: Zap, color: 'text-xp' },
  { label: 'Current Streak', value: `${mockUser.streak} days`, icon: Flame, color: 'text-streak' },
  { label: 'Study Hours', value: '127h', icon: Clock, color: 'text-highlight' },
  { label: 'Reports Submitted', value: mockUser.reportsSubmitted.toString(), icon: FileText, color: 'text-level' },
  { label: 'Goals Completed', value: '8', icon: Target, color: 'text-primary' },
  { label: 'Days Active', value: '62', icon: Calendar, color: 'text-xp' },
];

const levels = [
  { name: 'Beginner', min: 0, max: 1000 },
  { name: 'Intermediate', min: 1000, max: 5000 },
  { name: 'Advanced', min: 5000, max: 15000 },
  { name: 'Master', min: 15000, max: 50000 },
];

export default function Profile() {
  const currentLevel = levels.find(l => mockUser.xp >= l.min && mockUser.xp < l.max) || levels[3];
  const progress = ((mockUser.xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-6">
            <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-primary text-3xl font-bold text-primary-foreground shadow-glow-primary">
              {mockUser.name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">{mockUser.name}</h1>
              <p className="text-muted-foreground">{mockUser.focus}</p>
              <div className="mt-2 flex items-center gap-4">
                <span className="flex items-center gap-1 text-sm text-xp"><Zap className="h-4 w-4" /> {mockUser.xp.toLocaleString()} XP</span>
                <span className="flex items-center gap-1 text-sm text-streak"><Flame className="h-4 w-4" /> {mockUser.streak}-day streak</span>
              </div>
            </div>
          </div>

          {/* Level progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{currentLevel.name}</span>
              <span className="text-muted-foreground">{mockUser.xp.toLocaleString()} / {currentLevel.max.toLocaleString()} XP</span>
            </div>
            <div className="mt-2 h-3 overflow-hidden rounded-full bg-muted">
              <motion.div
                className="h-full rounded-full bg-gradient-primary"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
              />
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              {levels.map(l => (
                <span key={l.name} className={mockUser.level === l.name ? 'font-bold text-primary' : ''}>{l.name}</span>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="glass-card rounded-xl p-5"
            >
              <div className="flex items-center gap-3">
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
                <div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                  <p className={`font-display text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Recent Activity</h2>
          <div className="space-y-3">
            {[
              { action: 'Submitted daily report', xp: '+50', time: '2h ago', color: 'text-xp' },
              { action: 'Completed 2h focus session', xp: '+40', time: '4h ago', color: 'text-primary' },
              { action: 'Helped Marcus with Redux', xp: '+25', time: '6h ago', color: 'text-level' },
              { action: '12-day streak milestone!', xp: '+100', time: '1d ago', color: 'text-streak' },
            ].map((activity, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                <span className="text-sm text-foreground">{activity.action}</span>
                <div className="flex items-center gap-3">
                  <span className={`text-sm font-bold ${activity.color}`}>{activity.xp} XP</span>
                  <span className="text-xs text-muted-foreground">{activity.time}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </Layout>
  );
}
