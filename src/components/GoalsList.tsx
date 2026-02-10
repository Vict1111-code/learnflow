import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Target, 
  CheckCircle2, 
  Trash2, 
  ToggleLeft, 
  ToggleRight, 
  Calendar, 
  Clock,
  ChevronDown,
  ChevronUp,
  Loader2,
  Eye
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
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  LearningGoal, 
  getLearningGoals, 
  deleteLearningGoal, 
  toggleGoalActive, 
  setActiveGoal,
  getGoalProgress 
} from '@/lib/database';

interface GoalsListProps {
  onGoalSwitch?: (goalId: string) => void;
}

function formatDuration(value: number | null, unit: string | null): string {
  if (!value || !unit) return 'Not set';
  const plural = value > 1 ? 's' : '';
  return `${value} ${unit}${plural}`;
}

function GoalCard({ 
  goal, 
  onDelete, 
  onToggleActive, 
  onSetActive,
  isDeleting,
  isToggling 
}: { 
  goal: LearningGoal;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
  onSetActive: (id: string) => void;
  isDeleting: boolean;
  isToggling: boolean;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data: progress } = useQuery({
    queryKey: ['goal-progress', goal.id],
    queryFn: () => user ? getGoalProgress(goal.id, user.id) : { completed: 0, total: 0 },
    enabled: !!user,
  });

  const progressPercent = progress?.total ? Math.round((progress.completed / progress.total) * 100) : 0;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={`glass-card rounded-xl p-4 transition-all ${
        goal.is_active 
          ? 'ring-2 ring-primary/50 bg-primary/5' 
          : 'opacity-70 hover:opacity-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Status indicator */}
        <div className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          goal.is_active ? 'bg-gradient-primary' : 'bg-muted'
        }`}>
          <Target className={`h-4 w-4 ${goal.is_active ? 'text-primary-foreground' : 'text-muted-foreground'}`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-display font-semibold text-foreground truncate">
              {goal.description.slice(0, 50)}{goal.description.length > 50 ? '...' : ''}
            </h3>
            {goal.is_active && (
              <span className="shrink-0 rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-semibold uppercase text-primary">
                Active
              </span>
            )}
          </div>

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-3">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatDuration(goal.duration_value, goal.duration_unit)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {goal.time_availability === 'custom' 
                ? `${goal.custom_hours}h/day` 
                : `${goal.time_availability}h/day`}
            </span>
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium capitalize">
              {goal.mastery_level}
            </span>
          </div>

          {/* Progress bar */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-foreground">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
            <p className="text-[10px] text-muted-foreground">
              {progress?.completed || 0} of {progress?.total || 0} blocks completed
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/goal/${goal.id}`)}
            className="h-8 px-2 text-xs gap-1"
          >
            <Eye className="h-3 w-3" />
            View
          </Button>
          {!goal.is_active && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSetActive(goal.id)}
              disabled={isToggling}
              className="h-8 px-2 text-xs gap-1"
            >
              {isToggling ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <CheckCircle2 className="h-3 w-3" />
              )}
              Set Active
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleActive(goal.id, !goal.is_active)}
            disabled={isToggling}
            className="h-8 px-2 text-xs gap-1"
          >
            {isToggling ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : goal.is_active ? (
              <ToggleRight className="h-3 w-3" />
            ) : (
              <ToggleLeft className="h-3 w-3" />
            )}
            {goal.is_active ? 'Deactivate' : 'Activate'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                disabled={isDeleting}
                className="h-8 px-2 text-xs gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                {isDeleting ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Trash2 className="h-3 w-3" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Learning Goal?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this learning goal and all associated study plans. 
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(goal.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </motion.div>
  );
}

export default function GoalsList({ onGoalSwitch }: GoalsListProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [isExpanded, setIsExpanded] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const { data: goals, isLoading } = useQuery({
    queryKey: ['learning-goals', user?.id],
    queryFn: () => user ? getLearningGoals(user.id) : [],
    enabled: !!user,
  });

  const handleDelete = async (goalId: string) => {
    if (!user) return;
    setDeletingId(goalId);
    
    try {
      await deleteLearningGoal(goalId, user.id);
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Learning goal deleted');
    } catch (error) {
      console.error('Error deleting goal:', error);
      toast.error('Failed to delete goal');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (goalId: string, isActive: boolean) => {
    if (!user) return;
    setTogglingId(goalId);
    
    try {
      await toggleGoalActive(goalId, user.id, isActive);
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      toast.success(isActive ? 'Goal activated' : 'Goal deactivated');
    } catch (error) {
      console.error('Error toggling goal:', error);
      toast.error('Failed to update goal');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSetActive = async (goalId: string) => {
    if (!user) return;
    setTogglingId(goalId);
    
    try {
      await setActiveGoal(goalId, user.id);
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      toast.success('Active goal changed');
      onGoalSwitch?.(goalId);
    } catch (error) {
      console.error('Error setting active goal:', error);
      toast.error('Failed to switch goal');
    } finally {
      setTogglingId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="glass-card rounded-xl p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!goals || goals.length === 0) {
    return null;
  }

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h2 className="font-display font-semibold text-foreground">
            Your Learning Goals
          </h2>
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {goals.length}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-5 w-5 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Goals list */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-3 p-4 pt-0">
              {goals.map((goal) => (
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  onDelete={handleDelete}
                  onToggleActive={handleToggleActive}
                  onSetActive={handleSetActive}
                  isDeleting={deletingId === goal.id}
                  isToggling={togglingId === goal.id}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
