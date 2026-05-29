import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Zap, Flame, Clock, FileText, Target, Calendar, Edit2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getProfile, updateProfile, getTodaySessions } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import AvatarUpload from '@/components/AvatarUpload';
import AchievementBadges from '@/components/AchievementBadges';

const levels = [
  { name: 'Beginner', min: 0, max: 1000 },
  { name: 'Intermediate', min: 1000, max: 5000 },
  { name: 'Advanced', min: 5000, max: 15000 },
  { name: 'Master', min: 15000, max: 50000 },
];

export default function Profile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editFocus, setEditFocus] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: () => user ? getProfile(user.id) : null,
    enabled: !!user,
  });

  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', user?.id],
    queryFn: () => user ? getTodaySessions(user.id) : [],
    enabled: !!user,
  });

  const { data: allSessions } = useQuery({
    queryKey: ['all-sessions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from('study_sessions').select('duration_seconds').eq('user_id', user.id);
      return data || [];
    },
    enabled: !!user,
  });

  const { data: reportsCount } = useQuery({
    queryKey: ['reports-count', user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { count } = await supabase.from('daily_reports').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
      return count || 0;
    },
    enabled: !!user,
  });

  const xp = profile?.xp || 0;
  const currentLevel = levels.find(l => xp >= l.min && xp < l.max) || levels[3];
  const progress = ((xp - currentLevel.min) / (currentLevel.max - currentLevel.min)) * 100;

  const totalHours = (allSessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0) / 3600;

  const stats = [
    { label: 'Total XP', value: xp.toLocaleString(), icon: Zap, color: 'text-xp' },
    { label: 'Current Streak', value: `${profile?.streak || 0} days`, icon: Flame, color: 'text-streak' },
    { label: 'Study Hours', value: `${totalHours.toFixed(0)}h`, icon: Clock, color: 'text-highlight' },
    { label: 'Reports Submitted', value: reportsCount?.toString() || '0', icon: FileText, color: 'text-level' },
    { label: 'Sessions', value: (todaySessions?.length || 0).toString(), icon: Target, color: 'text-primary' },
    { label: 'Member Since', value: profile ? new Date(profile.created_at).toLocaleDateString() : '-', icon: Calendar, color: 'text-xp' },
  ];

  const handleSaveProfile = async () => {
    if (!user) return;
    try {
      await updateProfile(user.id, { 
        name: editName || profile?.name, 
        focus: editFocus || profile?.focus 
      });
      toast.success('Profile updated!');
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      setEditing(false);
    } catch (error) {
      toast.error('Failed to update profile');
    }
  };

  const startEditing = () => {
    setEditName(profile?.name || '');
    setEditFocus(profile?.focus || '');
    setEditing(true);
  };

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-6">
            <AvatarUpload
              userId={user!.id}
              avatarUrl={profile?.avatar_url || null}
              fallback={(profile?.name || user?.email)?.charAt(0)?.toUpperCase() || 'U'}
              onUploaded={() => queryClient.invalidateQueries({ queryKey: ['profile'] })}
            />
            <div className="flex-1">
              {editing ? (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Your name"
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-lg font-bold text-foreground focus:border-primary focus:outline-none"
                  />
                  <input
                    type="text"
                    value={editFocus}
                    onChange={(e) => setEditFocus(e.target.value)}
                    placeholder="Learning focus"
                    className="w-full rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-foreground focus:border-primary focus:outline-none"
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSaveProfile}>Save</Button>
                    <Button size="sm" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <h1 className="font-display text-3xl font-bold text-foreground">{profile?.name || 'Anonymous'}</h1>
                    <button onClick={startEditing} className="rounded-md p-1 text-muted-foreground hover:bg-accent hover:text-foreground">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </div>
                  <p className="text-muted-foreground">{profile?.focus || 'No focus set'}</p>
                  <div className="mt-2 flex items-center gap-4">
                    <span className="flex items-center gap-1 text-sm text-xp"><Zap className="h-4 w-4" /> {xp.toLocaleString()} XP</span>
                    <span className="flex items-center gap-1 text-sm text-streak"><Flame className="h-4 w-4" /> {profile?.streak || 0}-day streak</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Level progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{currentLevel.name}</span>
              <span className="text-muted-foreground">{xp.toLocaleString()} / {currentLevel.max.toLocaleString()} XP</span>
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
                <span key={l.name} className={profile?.level === l.name ? 'font-bold text-primary' : ''}>{l.name}</span>
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

        {user && <AchievementBadges userId={user.id} />}
      </div>
    </Layout>
  );
}
