import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RotateCcw, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { startStudySession, endStudySession, getTodaySessions } from '@/lib/database';
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

export default function StudyTimer() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [seconds, setSeconds] = useState(0);
  const [state, setState] = useState<TimerState>('idle');
  const [selectedBlock, setSelectedBlock] = useState('practice');
  const [topic, setTopic] = useState('');
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);

  const { data: todaySessions } = useQuery({
    queryKey: ['today-sessions', user?.id],
    queryFn: () => user ? getTodaySessions(user.id) : [],
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

  const handleStart = async () => {
    if (!user) return;
    
    if (state === 'paused') {
      setState('running');
      return;
    }

    try {
      const session = await startStudySession(user.id, topic || 'General Study', selectedBlock);
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
        await endStudySession(currentSessionId, seconds);
        const xpEarned = Math.min(Math.floor(seconds / 60), 60);
        toast.success(`Session ended! +${xpEarned} XP earned`);
        queryClient.invalidateQueries({ queryKey: ['today-sessions'] });
        queryClient.invalidateQueries({ queryKey: ['profile'] });
      } catch (error) {
        toast.error('Failed to save session');
      }
    }
    setState('idle');
    setSeconds(0);
    setCurrentSessionId(null);
  };

  const handleReset = () => setSeconds(0);

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Study Timer</h1>
          <p className="mt-1 text-muted-foreground">Focus deeply. Track everything. Earn XP.</p>
        </motion.div>

        {/* Timer Display */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          className={`glass-card rounded-2xl p-10 text-center ${state === 'running' ? 'shadow-glow-primary' : ''}`}
        >
          <p className={`font-display text-7xl font-bold tracking-tight ${state === 'running' ? 'text-gradient-primary' : 'text-foreground'}`}>
            {formatTime(seconds)}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {state === 'idle' ? 'Ready to focus' : state === 'running' ? 'Session in progress...' : 'Paused'}
          </p>

          {/* Controls */}
          <div className="mt-8 flex items-center justify-center gap-4">
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
      </div>
    </Layout>
  );
}
