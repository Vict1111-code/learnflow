import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Zap, AlertTriangle, Clock, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { startStudySession, endStudySession, getTodaySessions, getLearningGoals, getSessionHistory, type LearningGoal } from '@/lib/database';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

type TimerState = 'idle' | 'running' | 'paused';

const BLOCK_LABELS: Record<string, string> = {
  input: 'Input',
  breakdown: 'Breakdown',
  practice: 'Practice',
  output: 'Output',
  review: 'Review',
};

const POMODORO_PRESETS = [
  { label: '25 min', seconds: 25 * 60 },
  { label: '50 min', seconds: 50 * 60 },
  { label: '90 min', seconds: 90 * 60 },
  { label: 'Custom', seconds: 0 },
];

export default function StudyTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [seconds, setSeconds] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [selectedBlock, setSelectedBlock] = useState('practice');
  const [topic, setTopic] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedGoalId, setSelectedGoalId] = useState<string>('');
  const [selectedConceptId, setSelectedConceptId] = useState<string>('');
  const [notes, setNotes] = useState('');
  const [interruptions, setInterruptions] = useState(0);
  const [targetDuration, setTargetDuration] = useState(25 * 60);
  const [customMinutes, setCustomMinutes] = useState('');
  const [isCustomDuration, setIsCustomDuration] = useState(false);

  const { data: goals } = useQuery({
    queryKey: ['learning-goals', user?.id],
    queryFn: () => user ? getLearningGoals(user.id) : [],
    enabled: !!user,
  });

  const selectedGoal = goals?.find(g => g.id === selectedGoalId) as LearningGoal | undefined;
  const concepts: any[] = (selectedGoal as any)?.concepts || [];

  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', user?.id],
    queryFn: () => user ? getTodaySessions(user.id) : [],
    enabled: !!user,
  });

  const { data: sessionHistory } = useQuery({
    queryKey: ['session-history', user?.id],
    queryFn: () => user ? getSessionHistory(user.id, 10) : [],
    enabled: !!user,
  });

  const sessionsToday = todaySessions?.length || 0;
  const totalSeconds = todaySessions?.reduce((acc, s) => acc + (s.duration_seconds || 0), 0) || 0;
  const totalXp = todaySessions?.reduce((acc, s) => acc + (s.xp_earned || 0), 0) || 0;

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (state === 'running') {
      interval = setInterval(() => setSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [state]);

  const formatTime = useCallback((s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  const progress = targetDuration > 0 ? Math.min((seconds / targetDuration) * 100, 100) : 0;

  const handleStart = async () => {
    if (!user) return;
    
    if (state === 'paused') {
      setState('running');
      return;
    }

    try {
      const session = await startStudySession(user.id, topic || 'General Study', selectedBlock, {
        goalId: selectedGoalId || undefined,
        conceptId: selectedConceptId || undefined,
        notes: notes || undefined,
        targetDuration: targetDuration || undefined,
      });
      setCurrentSessionId(session.id);
      setState('running');
    } catch (error) {
      toast.error('Failed to start session');
    }
  };

  const handlePause = () => setState('paused');

  const handleStop = async () => {
    if (currentSessionId && seconds > 0) {
      try {
        await endStudySession(currentSessionId, seconds, interruptions);
        const xpEarned = Math.min(Math.floor(seconds / 60), 60);
        toast.success(`Session ended! +${xpEarned} XP earned`);
        queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['session-history'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch (error) {
        toast.error('Failed to save session');
      }
    }
    setState('idle');
    setSeconds(0);
    setCurrentSessionId(null);
    setInterruptions(0);
    setNotes('');
  };

  const handleReset = () => setSeconds(0);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="mt-1 text-muted-foreground">Focus deeply. Track everything. Earn XP.</p>
        </motion.div>

        {/* Timer Display with Progress Ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`glass-card rounded-2xl p-10 text-center ${state === 'running' ? 'shadow-glow-primary' : ''}`}
        >
          <div className="relative mx-auto" style={{ width: 200, height: 200 }}>
            <svg width={200} height={200} className="-rotate-90">
              <circle cx={100} cy={100} r={88} fill="none" stroke="hsl(var(--muted))" strokeWidth={8} />
              <motion.circle
                cx={100} cy={100} r={88} fill="none"
                stroke={progress >= 100 ? 'hsl(var(--xp-green))' : 'hsl(var(--primary))'}
                strokeWidth={8} strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 88}
                animate={{ strokeDashoffset: 2 * Math.PI * 88 * (1 - progress / 100) }}
                transition={{ duration: 0.5 }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <p className={`font-display text-4xl font-bold tracking-tight ${state === 'running' ? 'text-gradient-primary' : 'text-foreground'}`}>
                {formatTime(seconds)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {targetDuration > 0 ? `Target: ${Math.floor(targetDuration / 60)}min` : 'Free session'}
              </p>
            </div>
          </div>

          <p className="mt-3 text-sm text-muted-foreground">
            {state === 'idle' ? 'Ready to focus' : state === 'running' ? 'Session in progress...' : 'Paused'}
          </p>

          {/* Interruption Counter (during session) */}
          {state !== 'idle' && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInterruptions(i => i + 1)}
                className="gap-1.5 text-streak"
              >
                <AlertTriangle className="h-3.5 w-3.5" /> Interruption ({interruptions})
              </Button>
            </div>
          )}

          {/* Controls */}
          <div className="mt-6 flex items-center justify-center gap-4">
            {state === 'idle' && (
              <Button onClick={handleStart} className="bg-gradient-primary px-8 py-6 text-lg text-primary-foreground hover:opacity-90">
                <Play className="mr-2 h-5 w-5" /> Start Session
              </Button>
            )}
            {state === 'running' && (
              <>
                <Button onClick={handlePause} variant="outline" size="lg">
                  <Pause className="mr-2 h-4 w-4" /> Pause
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg">
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              </>
            )}
            {state === 'paused' && (
              <>
                <Button onClick={handleStart} className="bg-gradient-primary text-primary-foreground hover:opacity-90" size="lg">
                  <Play className="mr-2 h-4 w-4" /> Resume
                </Button>
                <Button onClick={handleReset} variant="outline" size="lg">
                  <RotateCcw className="mr-2 h-4 w-4" /> Reset
                </Button>
                <Button onClick={handleStop} variant="destructive" size="lg">
                  <Square className="mr-2 h-4 w-4" /> Stop
                </Button>
              </>
            )}
          </div>
        </motion.div>

        {/* Session Config */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-card rounded-xl p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-foreground">Session Details</h2>
          <div className="space-y-4">
            {/* Duration Presets */}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Duration</label>
              <div className="flex flex-wrap gap-2">
                {POMODORO_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      if (state !== 'idle') return;
                      if (preset.seconds === 0) {
                        setIsCustomDuration(true);
                      } else {
                        setIsCustomDuration(false);
                        setTargetDuration(preset.seconds);
                      }
                    }}
                    disabled={state !== 'idle'}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
                      !isCustomDuration && targetDuration === preset.seconds
                        ? 'bg-gradient-primary text-primary-foreground'
                        : isCustomDuration && preset.seconds === 0
                        ? 'bg-gradient-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              {isCustomDuration && (
                <input
                  type="number"
                  value={customMinutes}
                  onChange={(e) => {
                    setCustomMinutes(e.target.value);
                    const mins = parseInt(e.target.value);
                    if (mins > 0) setTargetDuration(mins * 60);
                  }}
                  placeholder="Minutes"
                  disabled={state !== 'idle'}
                  className="mt-2 w-32 rounded-lg border border-border bg-muted/50 px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                />
              )}
            </div>

            {/* Goal Selector */}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Goal</label>
              <select
                value={selectedGoalId}
                onChange={(e) => {
                  setSelectedGoalId(e.target.value);
                  setSelectedConceptId('');
                }}
                disabled={state !== 'idle'}
                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              >
                <option value="">No specific goal</option>
                {goals?.filter(g => g.is_active).map(g => (
                  <option key={g.id} value={g.id}>{g.description}</option>
                ))}
              </select>
            </div>

            {/* Concept Selector */}
            {concepts.length > 0 && (
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Concept</label>
                <select
                  value={selectedConceptId}
                  onChange={(e) => setSelectedConceptId(e.target.value)}
                  disabled={state !== 'idle'}
                  className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                >
                  <option value="">All concepts</option>
                  {concepts.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Topic */}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="What are you studying?"
                disabled={state !== 'idle'}
                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
              />
            </div>

            {/* Learning Block */}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Learning Block</label>
              <div className="flex flex-wrap gap-2">
                {Object.entries(BLOCK_LABELS).map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => state === 'idle' && setSelectedBlock(key)}
                    disabled={state !== 'idle'}
                    className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${selectedBlock === key ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Session notes..."
                rows={2}
                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
        </motion.div>

        {/* Today's Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="grid grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-xp">{sessionsToday}</p>
            <p className="text-xs text-muted-foreground">Sessions today</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-streak">{(totalSeconds / 3600).toFixed(1)}h</p>
            <p className="text-xs text-muted-foreground">Total focus time</p>
          </div>
          <div className="glass-card rounded-xl p-4 text-center">
            <p className="text-2xl font-bold text-level">+{totalXp}</p>
            <p className="text-xs text-muted-foreground">XP earned today</p>
          </div>
        </motion.div>

        {/* Session History */}
        {sessionHistory && sessionHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-card rounded-xl p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <History className="h-5 w-5" /> Session History
            </h2>
            <div className="space-y-2">
              {sessionHistory.map((session: any) => (
                <div key={session.id} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
                      <Clock className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{session.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {Math.round(session.duration_seconds / 60)}min • {session.block_type}
                        {session.interruptions > 0 && ` • ${session.interruptions} interruptions`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-xp">+{session.xp_earned} XP</p>
                    <p className="text-[10px] text-muted-foreground">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
