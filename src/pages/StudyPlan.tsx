import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle, Circle, Sparkles, Calendar, Clock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getStudyPlansWithGoals, getLearningGoals } from '@/lib/database';
import { Link } from 'react-router-dom';
import AddGoalDialog from '@/components/AddGoalDialog';

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

export default function StudyPlan() {
  const { user } = useAuth();

  const { data: studyPlans, isLoading, refetch } = useQuery({
    queryKey: ['study-plans', user?.id],
    queryFn: () => user ? getStudyPlansWithGoals(user.id) : [],
    enabled: !!user,
  });

  const { data: learningGoals } = useQuery({
    queryKey: ['learning-goals', user?.id],
    queryFn: () => user ? getLearningGoals(user.id) : [],
    enabled: !!user,
  });

  // Get the most recent active goal for header display
  const activeGoal = learningGoals?.find(g => g.is_active) || learningGoals?.[0];

  if (isLoading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </Layout>
    );
  }

  if (!studyPlans || studyPlans.length === 0) {
    return (
      <Layout>
        <div className="space-y-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
              <p className="mt-1 text-muted-foreground">Your optimized weekly learning roadmap</p>
            </div>
            <AddGoalDialog onGoalAdded={() => refetch()} />
          </motion.div>

          <div className="flex min-h-[40vh] items-center justify-center">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="font-display text-xl font-bold text-foreground">No Study Plan Yet</h2>
              <p className="mt-2 text-muted-foreground">Create your first learning goal to generate an AI study plan</p>
            </motion.div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
            <p className="mt-1 text-muted-foreground">
              {activeGoal ? `Learning: ${activeGoal.description.slice(0, 60)}...` : 'Your optimized weekly learning roadmap'}
            </p>
          </div>
          <AddGoalDialog onGoalAdded={() => refetch()} />
        </motion.div>

        {/* Active Goal Info */}
        {activeGoal && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-xl p-4"
          >
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-primary">
                <Sparkles className="h-6 w-6 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <h3 className="font-display font-semibold text-foreground">{activeGoal.description.slice(0, 80)}{activeGoal.description.length > 80 ? '...' : ''}</h3>
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {formatDuration(activeGoal.duration_value, activeGoal.duration_unit)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {activeGoal.time_availability === 'custom' 
                      ? `${activeGoal.custom_hours}h/day` 
                      : `${activeGoal.time_availability}h/day`}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium capitalize text-primary">
                    {activeGoal.mastery_level}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Legend */}
        <div className="flex flex-wrap gap-3">
          {Object.entries(blockColors).map(([type, cls]) => (
            <span key={type} className={`rounded-full border px-3 py-1 text-xs font-medium capitalize ${cls}`}>
              {type}
            </span>
          ))}
        </div>

        {/* Days */}
        <div className="space-y-6">
          {studyPlans.map((plan, dayIndex) => {
            const blocks = (plan.blocks as any[]) || [];
            const totalDuration = blocks.reduce((acc: number, b: any) => acc + (b.duration || 0), 0);
            const completedCount = blocks.filter((b: any) => b.completed).length;

            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: dayIndex * 0.1 }}
                className="glass-card rounded-xl p-6"
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary">
                    <BookOpen className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="font-display text-lg font-semibold text-foreground">{dayNames[plan.day_of_week]}</h2>
                    <p className="text-xs text-muted-foreground">
                      {totalDuration} min total • {completedCount}/{blocks.length} done
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {blocks.map((block: any) => (
                    <div
                      key={block.id}
                      className={`flex items-center gap-4 rounded-lg border px-4 py-3 transition-all ${block.completed ? 'border-xp/20 bg-xp/5 opacity-60' : 'border-border bg-muted/20'}`}
                    >
                      {block.completed ? (
                        <CheckCircle className="h-5 w-5 shrink-0 text-xp" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className={`text-sm font-medium ${block.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{block.title}</p>
                        <p className="text-xs text-muted-foreground">{block.description}</p>
                      </div>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${blockColors[block.type] || 'bg-muted text-muted-foreground'}`}>
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
      </div>
    </Layout>
  );
}
