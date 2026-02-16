import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Sparkles, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useQueryClient } from '@tanstack/react-query';

const goalTypes = [
  { value: 'skill', label: 'Skill', description: 'A practical ability to develop' },
  { value: 'concept', label: 'Concept', description: 'A theoretical idea to understand' },
  { value: 'topic', label: 'Topic', description: 'A specific subject area to explore' },
  { value: 'subject', label: 'Subject', description: 'A broad field of study' },
  { value: 'habit', label: 'Habit', description: 'A recurring practice to build' },
];

const masteryLevels = [
  { value: 'awareness', label: 'Awareness', description: 'Know it exists and basics' },
  { value: 'understanding', label: 'Understanding', description: 'Grasp core concepts' },
  { value: 'application', label: 'Application', description: 'Use in real situations' },
  { value: 'mastery', label: 'Mastery', description: 'Teach and innovate' },
];

const timeOptions = [
  { value: '1-2', label: '1-2 hours/day' },
  { value: '3-5', label: '3-5 hours/day' },
  { value: '6-8', label: '6-8 hours/day' },
  { value: 'custom', label: 'Custom' },
];

const durationUnits = [
  { value: 'day', label: 'Day(s)' },
  { value: 'week', label: 'Week(s)' },
  { value: 'month', label: 'Month(s)' },
  { value: 'year', label: 'Year(s)' },
];

interface AddGoalDialogProps {
  onGoalAdded?: () => void;
}

export default function AddGoalDialog({ onGoalAdded }: AddGoalDialogProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [goalType, setGoalType] = useState('skill');
  const [description, setDescription] = useState('');
  const [masteryLevel, setMasteryLevel] = useState('understanding');
  const [timeAvailability, setTimeAvailability] = useState('1-2');
  const [customHours, setCustomHours] = useState(1);
  const [durationValue, setDurationValue] = useState(1);
  const [durationUnit, setDurationUnit] = useState('week');

  const resetForm = () => {
    setGoalType('skill');
    setDescription('');
    setMasteryLevel('understanding');
    setTimeAvailability('1-2');
    setCustomHours(1);
    setDurationValue(1);
    setDurationUnit('week');
  };

  const handleSubmit = async () => {
    if (!user || !description.trim()) {
      toast.error('Please enter a description for your goal');
      return;
    }

    setIsLoading(true);

    try {
      // Create the learning goal
      const { data: goal, error: goalError } = await supabase
        .from('learning_goals')
        .insert({
          user_id: user.id,
          goal_type: goalType,
          description: description.trim(),
          mastery_level: masteryLevel,
          time_availability: timeAvailability,
          custom_hours: timeAvailability === 'custom' ? customHours : null,
          duration_value: durationValue,
          duration_unit: durationUnit,
          is_active: true,
        })
        .select()
        .single();

      if (goalError) throw goalError;

      // Generate study plan using edge function
      const { data: planData, error: planError } = await supabase.functions.invoke('generate-study-plan', {
        body: {
          goalType,
          description: description.trim(),
          masteryLevel,
          timeAvailability,
          customHours: timeAvailability === 'custom' ? customHours : undefined,
          duration: { value: durationValue, unit: durationUnit },
        },
      });

      if (planError) {
        console.error('Plan generation error:', planError);
        toast.warning('Goal created, but study plan generation failed. You can try again later.');
      } else if (planData?.studyPlan) {
        // Save study plans
        const planRows = (planData.studyPlan as any[]).map((plan: any, index: number) => ({
          user_id: user.id,
          goal_id: goal.id,
          day_of_week: index,
          blocks: (plan.blocks || []).map((b: any) => ({ ...b, conceptId: plan.conceptId || b.conceptId })),
        }));

        const { error: saveError } = await supabase.from('study_plans').insert(planRows);
        if (saveError) console.error('Error saving plans:', saveError);

        // Save concepts and resources to goal
        if (planData.concepts || planData.resources) {
          await supabase
            .from('learning_goals')
            .update({
              concepts: planData.concepts || [],
              resources: planData.resources || [],
            })
            .eq('id', goal.id);
        }
      }

      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['study-plans'] });
      queryClient.invalidateQueries({ queryKey: ['active-goal'] });
      queryClient.invalidateQueries({ queryKey: ['learning-goals'] });

      toast.success('Learning goal created successfully!');
      resetForm();
      setOpen(false);
      onGoalAdded?.();
    } catch (error) {
      console.error('Error creating goal:', error);
      toast.error('Failed to create learning goal');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4" />
          Add Learning Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-xl">
            <Sparkles className="h-5 w-5 text-primary" />
            Create New Learning Goal
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Goal Type */}
          <div className="space-y-2">
            <Label>What type of goal is this?</Label>
            <Select value={goalType} onValueChange={setGoalType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {goalTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    <div>
                      <span className="font-medium">{type.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{type.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label>Describe your learning goal</Label>
            <Textarea
              placeholder="E.g., Learn React and build a full-stack web application..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[100px]"
            />
          </div>

          {/* Mastery Level */}
          <div className="space-y-2">
            <Label>Target mastery level</Label>
            <Select value={masteryLevel} onValueChange={setMasteryLevel}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {masteryLevels.map((level) => (
                  <SelectItem key={level.value} value={level.value}>
                    <div>
                      <span className="font-medium">{level.label}</span>
                      <span className="ml-2 text-xs text-muted-foreground">{level.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Time Availability */}
          <div className="space-y-2">
            <Label>Daily time availability</Label>
            <Select value={timeAvailability} onValueChange={setTimeAvailability}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {timeAvailability === 'custom' && (
              <div className="flex items-center gap-2 pt-2">
                <Input
                  type="number"
                  min={1}
                  max={12}
                  value={customHours}
                  onChange={(e) => setCustomHours(parseInt(e.target.value) || 1)}
                  className="w-20"
                />
                <span className="text-sm text-muted-foreground">hours per day</span>
              </div>
            )}
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label>Plan duration</Label>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min={1}
                max={365}
                value={durationValue}
                onChange={(e) => setDurationValue(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-20"
              />
              <Select value={durationUnit} onValueChange={setDurationUnit}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {durationUnits.map((unit) => (
                    <SelectItem key={unit.value} value={unit.value}>
                      {unit.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Submit Button */}
          <Button
            onClick={handleSubmit}
            disabled={isLoading || !description.trim()}
            className="w-full gap-2 bg-gradient-primary hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Create Goal & Generate Plan
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
