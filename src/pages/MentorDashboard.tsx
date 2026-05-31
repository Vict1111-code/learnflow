import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Users, UserPlus, Check, X, Clock, Zap, Flame, Target, ChevronDown, ChevronUp,
} from 'lucide-react';
import { toast } from 'sonner';

interface MentorLink {
  id: string;
  mentor_id: string;
  mentee_id: string;
  status: string;
  created_at: string;
}

export default function MentorDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchEmail, setSearchEmail] = useState('');
  const [expandedMentee, setExpandedMentee] = useState<string | null>(null);

  // Fetch mentor links (as mentor)
  const { data: menteeLinks } = useQuery({
    queryKey: ['mentor-links-mentor', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('mentor_links')
        .select('*')
        .eq('mentor_id', user.id)
        .order('created_at', { ascending: false });
      return (data || []) as MentorLink[];
    },
    enabled: !!user,
  });

  // Fetch mentor links (as mentee)
  const { data: mentorLinks } = useQuery({
    queryKey: ['mentor-links-mentee', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from('mentor_links')
        .select('*')
        .eq('mentee_id', user.id)
        .order('created_at', { ascending: false });
      return (data || []) as MentorLink[];
    },
    enabled: !!user,
  });

  // Fetch profiles for linked users
  const linkedUserIds = [
    ...(menteeLinks?.map(l => l.mentee_id) || []),
    ...(mentorLinks?.map(l => l.mentor_id) || []),
  ].filter(Boolean);

  const { data: linkedProfiles } = useQuery({
    queryKey: ['mentor-profiles', linkedUserIds],
    queryFn: async () => {
      if (linkedUserIds.length === 0) return [];
      const { data } = await supabase.from('profiles').select('*').in('user_id', linkedUserIds);
      return data || [];
    },
    enabled: linkedUserIds.length > 0,
  });

  // Mentee detail data is loaded inside MenteeDetailPanel


  // Request mentor by searching profile name
  const requestMentor = useMutation({
    mutationFn: async (mentorName: string) => {
      if (!user) throw new Error('Not logged in');
      const { data: matches } = await supabase.rpc('search_mentor_candidates', { query: mentorName });
      const mentorProfile = matches?.[0];

      if (!mentorProfile) throw new Error('User not found');

      const { error } = await supabase.from('mentor_links').insert({
        mentor_id: mentorProfile.user_id,
        mentee_id: user.id,
        status: 'pending',
      } as any);

      if (error) {
        if (error.code === '23505') throw new Error('Link already exists');
        throw error;
      }
      return mentorProfile.name;
    },
    onSuccess: (name) => {
      queryClient.invalidateQueries({ queryKey: ['mentor-links-mentee'] });
      setSearchEmail('');
      toast.success(`Mentor request sent to ${name}`);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Accept/decline mentor request
  const updateLink = useMutation({
    mutationFn: async ({ linkId, status }: { linkId: string; status: string }) => {
      const { error } = await supabase.from('mentor_links').update({ status } as any).eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-links-mentor'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-links-mentee'] });
      toast.success('Link updated');
    },
  });

  const removeLink = useMutation({
    mutationFn: async (linkId: string) => {
      const { error } = await supabase.from('mentor_links').delete().eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mentor-links-mentor'] });
      queryClient.invalidateQueries({ queryKey: ['mentor-links-mentee'] });
      toast.success('Link removed');
    },
  });

  const getProfile = (userId: string) => linkedProfiles?.find(p => p.user_id === userId);

  const pendingRequests = menteeLinks?.filter(l => l.status === 'pending') || [];
  const activeMentees = menteeLinks?.filter(l => l.status === 'active') || [];
  const myMentors = mentorLinks || [];

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary">
            <Users className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Mentor Dashboard</h1>
            <p className="text-sm text-muted-foreground">Connect with mentors and track mentee progress</p>
          </div>
        </motion.div>

        {/* Request a Mentor */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
          className="glass-card rounded-xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" /> Request a Mentor
          </h2>
          <p className="mb-3 text-sm text-muted-foreground">Search by name to send a mentor request</p>
          <div className="flex gap-2">
            <Input
              placeholder="Search by name..."
              value={searchEmail}
              onChange={e => setSearchEmail(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={() => requestMentor.mutate(searchEmail)}
              disabled={!searchEmail.trim() || requestMentor.isPending}>
              {requestMentor.isPending ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </motion.div>

        {/* My Mentors */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
          className="glass-card rounded-xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground">My Mentors</h2>
          {myMentors.length > 0 ? (
            <div className="space-y-2">
              {myMentors.map(link => {
                const mentor = getProfile(link.mentor_id);
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                        {mentor?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{mentor?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{mentor?.level} • {mentor?.xp?.toLocaleString()} XP</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        link.status === 'active' ? 'bg-xp/20 text-xp' :
                        link.status === 'pending' ? 'bg-streak/20 text-streak' : 'bg-destructive/20 text-destructive'
                      }`}>
                        {link.status}
                      </span>
                      <Button variant="ghost" size="icon" onClick={() => removeLink.mutate(link.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No mentors yet. Search above to request one.</p>
          )}
        </motion.div>

        {/* Pending Requests (as mentor) */}
        {pendingRequests.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="glass-card rounded-xl p-6">
            <h2 className="mb-3 font-display text-lg font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-5 w-5 text-streak" /> Pending Mentee Requests
            </h2>
            <div className="space-y-2">
              {pendingRequests.map(link => {
                const mentee = getProfile(link.mentee_id);
                return (
                  <div key={link.id} className="flex items-center justify-between rounded-lg border border-border/50 bg-muted/20 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-streak text-sm font-bold text-primary-foreground">
                        {mentee?.name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">{mentee?.name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">{mentee?.level}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" onClick={() => updateLink.mutate({ linkId: link.id, status: 'active' })} className="gap-1">
                        <Check className="h-3.5 w-3.5" /> Accept
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => updateLink.mutate({ linkId: link.id, status: 'declined' })}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Active Mentees */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
          className="glass-card rounded-xl p-6">
          <h2 className="mb-3 font-display text-lg font-semibold text-foreground flex items-center gap-2">
            <Target className="h-5 w-5 text-xp" /> Your Mentees
          </h2>
          {activeMentees.length > 0 ? (
            <div className="space-y-3">
              {activeMentees.map(link => {
                const mentee = getProfile(link.mentee_id);
                const isExpanded = expandedMentee === link.mentee_id;

                return (
                  <div key={link.id} className="rounded-lg border border-border/50 bg-muted/20 overflow-hidden">
                    <button
                      onClick={() => setExpandedMentee(isExpanded ? null : link.mentee_id)}
                      className="flex w-full items-center justify-between px-4 py-3 text-left hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-xp text-sm font-bold text-primary-foreground">
                          {mentee?.name?.charAt(0).toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-foreground">{mentee?.name || 'Unknown'}</p>
                          <div className="flex gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> {mentee?.xp?.toLocaleString()} XP</span>
                            <span className="flex items-center gap-1"><Flame className="h-3 w-3" /> {mentee?.streak} days</span>
                            <span>{mentee?.level}</span>
                          </div>
                        </div>
                      </div>
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </button>

                    {isExpanded && user && (
                      <>
                        <MenteeDetailPanel menteeId={link.mentee_id} mentorId={user.id} isMentor={true} />
                        <div className="px-4 pb-4">
                          <Button variant="ghost" size="sm" onClick={() => removeLink.mutate(link.id)}
                            className="text-destructive hover:text-destructive">
                            Remove Mentee
                          </Button>
                        </div>
                      </>
                    )}

                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No active mentees. Students can send you requests.</p>
          )}
        </motion.div>
      </div>
    </Layout>
  );
}
