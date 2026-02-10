import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getLearningGoals, getGoalProgress } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  CheckCircle,
  Circle,
  Sparkles,
  Target,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { toast } from 'sonner';

const blockColors: Record<string, string> = {
  input: 'bg-primary/10 text-primary border-primary/20',
  breakdown: 'bg-streak/10 text-streak border-streak/20',
  practice: 'bg-xp/10 text-xp border-xp/20',
  output: 'bg-level/10 text-level border-level/20',
  review: 'bg-highlight/10 text-highlight border-highlight/20',
};

const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

function formatDuration(value: number | null, unit: string | null): string {
  if (!value || !unit) return 'Not set';
  const plural = value > 1 ? 's' : '';
  return `${value} ${unit}${plural}`;
}

export default function GoalDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const { data: goals } = useQuery({
    queryKey: ['learning-goals', user?.id],
    queryFn: () => (user ? getLearningGoals(user.id) : []),
    enabled: !!user,
  });

  const goal = goals?.find((g) => g.id === id);

  const { data: plans, isLoading: plansLoading } = useQuery({
    queryKey: ['goal-plans', id, user?.id],
    queryFn: async () => {
      if (!user || !id) return [];
      const { data, error } = await supabase
        .from('study_plans')
        .select('*')
        .eq('user_id', user.id)
        .eq('goal_id', id)
        .order('day_of_week', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!id,
  });

  const { data: progress } = useQuery({
    queryKey: ['goal-progress', id],
    queryFn: () => (user && id ? getGoalProgress(id, user.id) : { completed: 0, total: 0 }),
    enabled: !!user && !!id,
  });

  const progressPercent = progress?.total
    ? Math.round((progress.completed / progress.total) * 100)
    : 0;

  const handleRegenerate = async () => {
    if (!user || !goal) return;
    setIsRegenerating(true);

    try {
      // Delete existing plans for this goal
      await supabase
        .from('study_plans')
        .delete()
        .eq('goal_id', goal.id)
        .eq('user_id', user.id);

      // Call the edge function to generate new plans
      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('generate-study-plan', {
        body: {
          goalType: goal.goal_type,
          description: goal.description,
          masteryLevel: goal.mastery_level,
          timeAvailability: goal.time_availability,
          customHours: goal.custom_hours,
          duration: goal.duration_value && goal.duration_unit
            ? { value: goal.duration_value, unit: goal.duration_unit }
            : { value: 1, unit: 'week' },
        },
      });

      if (response.error) throw new Error(response.error.message);

      const studyPlan = response.data?.studyPlan;
      if (!studyPlan || !Array.isArray(studyPlan)) {
        throw new Error('Invalid study plan response');
      }

      // Save new plans
      const planRows = studyPlan.map((plan: any, index: number) => ({
        user_id: user.id,
        goal_id: goal.id,
        day_of_week: index,
        blocks: plan.blocks || [],
      }));

      const { error: insertError } = await supabase.from('study_plans').insert(planRows);
      if (insertError) throw insertError;

      // Refresh queries
      queryClient.invalidateQueries({ queryKey: ['goal-plans', id] });
      queryClient.invalidateQueries({ queryKey: ['goal-progress', id] });
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Study plan regenerated successfully!');
    } catch (error) {
      console.error('Error regenerating plan:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to regenerate study plan');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (!goal && !plansLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <Target className="h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">Goal not found</p>
          <Button variant="outline" onClick={() => navigate('/plan')}>
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Study Plan
          </Button>
        </div>
      </Layout>
    );
  }

  if (plansLoading || !goal) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/plan')}
            className="mb-4 -ml-2 gap-1 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Study Plan
          </Button>

          <div className="glass-card rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-gradient-primary">
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h1 className="font-display text-2xl font-bold text-foreground">
                    {goal.description}
                  </h1>
                  {goal.is_active && (
                    <span className="shrink-0 rounded-full bg-primary/20 px-2.5 py-0.5 text-xs font-semibold uppercase text-primary">
                      Active
                    </span>
                  )}
                </div>

                {/* Meta row */}
                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" />
                    {formatDuration(goal.duration_value, goal.duration_unit)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4" />
                    {goal.time_availability === 'custom'
                      ? `${goal.custom_hours}h/day`
                      : `${goal.time_availability}h/day`}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                    {goal.mastery_level}
                  </span>
                  <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium capitalize">
                    {goal.goal_type}
                  </span>
                </div>

                {/* Progress */}
                <div className="mt-4 space-y-1.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Overall Progress</span>
                    <span className="font-semibold text-foreground">{progressPercent}%</span>
                  </div>
                  <Progress value={progressPercent} className="h-2.5" />
                  <p className="text-xs text-muted-foreground">
                    {progress?.completed || 0} of {progress?.total || 0} study blocks completed
                  </p>
                </div>

                {/* Regenerate button */}
                <div className="mt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isRegenerating}
                        className="gap-2"
                      >
                        {isRegenerating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {isRegenerating ? 'Regenerating...' : 'Regenerate Plan'}
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Regenerate Study Plan?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This will replace your current study plan with a freshly generated one. All progress on existing blocks will be lost.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRegenerate}>
                          Regenerate
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(blockColors).map(([type, cls]) => (
            <span
              key={type}
              className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${cls}`}
            >
              {type}
            </span>
          ))}
        </div>

        {/* Plans by day */}
        {(!plans || plans.length === 0) ? (
          <div className="flex min-h-[30vh] items-center justify-center">
            <div className="text-center">
              <BookOpen className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
              <p className="text-muted-foreground">No study plans generated for this goal yet.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {plans.map((plan, dayIndex) => {
              const blocks = (plan.blocks as any[]) || [];
              const totalDuration = blocks.reduce((acc: number, b: any) => acc + (b.duration || 0), 0);
              const completedCount = blocks.filter((b: any) => b.completed).length;

              return (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: dayIndex * 0.07 }}
                  className="glass-card rounded-xl p-6"
                >
                  <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                      <BookOpen className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="font-display text-lg font-semibold text-foreground">
                        {dayNames[plan.day_of_week]}
                      </h2>
                      <p className="text-xs text-muted-foreground">
                        {totalDuration} min total • {completedCount}/{blocks.length} done
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {blocks.map((block: any) => (
                      <div
                        key={block.id}
                        className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all ${
                          block.completed
                            ? 'border-xp/20 bg-xp/5 opacity-60'
                            : 'border-border bg-muted/20'
                        }`}
                      >
                        {block.completed ? (
                          <CheckCircle className="h-5 w-5 shrink-0 text-xp" />
                        ) : (
                          <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                        )}
                        <div className="flex-1">
                          <p
                            className={`text-sm font-medium ${
                              block.completed
                                ? 'line-through text-muted-foreground'
                                : 'text-foreground'
                            }`}
                          >
                            {block.title}
                          </p>
                          <p className="text-xs text-muted-foreground">{block.description}</p>
                        </div>
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                            blockColors[block.type] || 'bg-muted text-muted-foreground'
                          }`}
                        >
                          {block.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{block.duration}m</span>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
