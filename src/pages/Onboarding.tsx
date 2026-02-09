import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ArrowLeft, Check, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/contexts/AuthContext';
import { createLearningGoal, saveStudyPlans, updateProfile } from '@/lib/database';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { GoalType, MasteryLevel, TimeAvailability, DurationUnit, PlanDuration } from '@/lib/types';

const steps = ['Goal Type', 'Description', 'Mastery Level', 'Time & Duration'];

const goalTypes: { value: GoalType; label: string; emoji: string }[] = [
  { value: 'skill', label: 'Skill', emoji: '🛠️' },
  { value: 'concept', label: 'Concept', emoji: '💡' },
  { value: 'topic', label: 'Topic', emoji: '📚' },
  { value: 'subject', label: 'Subject', emoji: '🎓' },
  { value: 'habit', label: 'Habit', emoji: '🔁' },
];

const masteryLevels: { value: MasteryLevel; label: string; desc: string }[] = [
  { value: 'awareness', label: 'Awareness', desc: 'I want to know it exists and what it does' },
  { value: 'understanding', label: 'Understanding', desc: 'I want to explain it to someone' },
  { value: 'application', label: 'Application', desc: 'I want to use it in real projects' },
  { value: 'mastery', label: 'Mastery', desc: 'I want to teach it and solve hard problems' },
];

const timeOptions: { value: TimeAvailability; label: string }[] = [
  { value: '1-2', label: '1–2 hours/day' },
  { value: '3-5', label: '3–5 hours/day' },
  { value: '6-8', label: '6–8 hours/day' },
  { value: 'custom', label: 'Custom' },
];

const durationUnits: { value: DurationUnit; label: string; plural: string }[] = [
  { value: 'day', label: 'Day', plural: 'Days' },
  { value: 'week', label: 'Week', plural: 'Weeks' },
  { value: 'month', label: 'Month', plural: 'Months' },
  { value: 'year', label: 'Year', plural: 'Years' },
];

interface LearningPlan {
  id: string;
  goalType: GoalType | '';
  description: string;
  mastery: MasteryLevel | '';
  time: TimeAvailability | '';
  customHours?: number;
  duration: PlanDuration;
}

const createEmptyPlan = (): LearningPlan => ({
  id: crypto.randomUUID(),
  goalType: '',
  description: '',
  mastery: '',
  time: '',
  duration: { value: 1, unit: 'week' },
});

export default function Onboarding() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [step, setStep] = useState(0);
  const [plans, setPlans] = useState<LearningPlan[]>([createEmptyPlan()]);
  const [currentPlanIndex, setCurrentPlanIndex] = useState(0);
  const [generating, setGenerating] = useState(false);

  const currentPlan = plans[currentPlanIndex];

  const updateCurrentPlan = (updates: Partial<LearningPlan>) => {
    setPlans(prev => prev.map((p, i) => 
      i === currentPlanIndex ? { ...p, ...updates } : p
    ));
  };

  const addPlan = () => {
    const newPlan = createEmptyPlan();
    setPlans(prev => [...prev, newPlan]);
    setCurrentPlanIndex(plans.length);
    setStep(0);
  };

  const removePlan = (index: number) => {
    if (plans.length === 1) return;
    setPlans(prev => prev.filter((_, i) => i !== index));
    if (currentPlanIndex >= index && currentPlanIndex > 0) {
      setCurrentPlanIndex(prev => prev - 1);
    }
  };

  const canNext = [
    currentPlan.goalType !== '',
    currentPlan.description.trim().length > 5,
    currentPlan.mastery !== '',
    currentPlan.time !== '' && currentPlan.duration.value > 0,
  ][step];

  const allPlansComplete = plans.every(plan => 
    plan.goalType !== '' && 
    plan.description.trim().length > 5 && 
    plan.mastery !== '' && 
    plan.time !== '' &&
    plan.duration.value > 0
  );

  const handleFinish = async () => {
    if (!user || !allPlansComplete) return;
    
    setGenerating(true);
    try {
      // Process each plan
      for (const plan of plans) {
        // Create learning goal
        const goal = await createLearningGoal({
          user_id: user.id,
          goal_type: plan.goalType as GoalType,
          description: plan.description,
          mastery_level: plan.mastery as MasteryLevel,
          time_availability: plan.time as TimeAvailability,
          custom_hours: plan.customHours ?? null,
          duration_value: plan.duration.value,
          duration_unit: plan.duration.unit,
          is_active: true,
        });

        // Generate AI study plan
        const { data, error } = await supabase.functions.invoke('generate-study-plan', {
          body: {
            goalType: plan.goalType,
            description: plan.description,
            masteryLevel: plan.mastery,
            timeAvailability: plan.time,
            customHours: plan.customHours,
            duration: plan.duration,
          },
        });

        if (error) {
          console.error('Error generating study plan:', error);
          toast.error(`Failed to generate plan for "${plan.description.slice(0, 30)}..."`);
        } else if (data?.studyPlan) {
          await saveStudyPlans(user.id, goal.id, data.studyPlan);
        }
      }

      // Update profile focus with first plan's description
      await updateProfile(user.id, { focus: plans[0].description.slice(0, 100) });

      toast.success(`${plans.length} study plan${plans.length > 1 ? 's' : ''} generated successfully!`);
      navigate('/');
    } catch (error) {
      console.error('Onboarding error:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">learnflow</span>
        </div>

        {/* Plan tabs */}
        {plans.length > 1 && (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {plans.map((plan, index) => (
              <button
                key={plan.id}
                onClick={() => {
                  setCurrentPlanIndex(index);
                  setStep(0);
                }}
                className={`group relative flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                  currentPlanIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                Plan {index + 1}
                {plans.length > 1 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePlan(index);
                    }}
                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </button>
            ))}
            <button
              onClick={addPlan}
              className="flex items-center gap-1 rounded-lg border border-dashed border-border px-3 py-1.5 text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors"
            >
              <Plus className="h-3 w-3" /> Add Plan
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentPlan.id}-${step}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === 0 && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">What do you want to learn?</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Choose the type of learning goal</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {goalTypes.map((g) => (
                      <button
                        key={g.value}
                        onClick={() => updateCurrentPlan({ goalType: g.value })}
                        className={`rounded-xl border p-4 text-left transition-all ${currentPlan.goalType === g.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
                      >
                        <span className="text-2xl">{g.emoji}</span>
                        <p className="mt-2 text-sm font-medium text-foreground">{g.label}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 1 && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Describe your goal</h2>
                  <p className="mt-1 text-sm text-muted-foreground">What specifically do you want to learn?</p>
                  <textarea
                    value={currentPlan.description}
                    onChange={(e) => updateCurrentPlan({ description: e.target.value })}
                    placeholder="e.g., Learn React hooks and state management for building modern web apps..."
                    rows={4}
                    className="mt-6 w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              )}

              {step === 2 && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Desired mastery level</h2>
                  <p className="mt-1 text-sm text-muted-foreground">How deep do you want to go?</p>
                  <div className="mt-6 space-y-3">
                    {masteryLevels.map((m) => (
                      <button
                        key={m.value}
                        onClick={() => updateCurrentPlan({ mastery: m.value })}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${currentPlan.mastery === m.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{m.label}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">{m.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground">Time & Duration</h2>
                  <p className="mt-1 text-sm text-muted-foreground">How much time can you dedicate, and for how long?</p>
                  
                  {/* Daily time availability */}
                  <div className="mt-6">
                    <label className="text-sm font-medium text-foreground">Daily study time</label>
                    <div className="mt-2 grid grid-cols-2 gap-3">
                      {timeOptions.map((t) => (
                        <button
                          key={t.value}
                          onClick={() => updateCurrentPlan({ time: t.value })}
                          className={`rounded-xl border p-3 text-center transition-all ${currentPlan.time === t.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
                        >
                          <p className="text-sm font-medium text-foreground">{t.label}</p>
                        </button>
                      ))}
                    </div>
                    {currentPlan.time === 'custom' && (
                      <div className="mt-3">
                        <Input
                          type="number"
                          min={1}
                          max={24}
                          value={currentPlan.customHours || ''}
                          onChange={(e) => updateCurrentPlan({ customHours: parseInt(e.target.value) || undefined })}
                          placeholder="Hours per day"
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>

                  {/* Plan duration */}
                  <div className="mt-6">
                    <label className="text-sm font-medium text-foreground">Plan duration</label>
                    <div className="mt-2 flex gap-3">
                      <Input
                        type="number"
                        min={1}
                        max={365}
                        value={currentPlan.duration.value}
                        onChange={(e) => updateCurrentPlan({ 
                          duration: { 
                            ...currentPlan.duration, 
                            value: parseInt(e.target.value) || 1 
                          } 
                        })}
                        className="w-24"
                      />
                      <Select
                        value={currentPlan.duration.unit}
                        onValueChange={(value: DurationUnit) => updateCurrentPlan({ 
                          duration: { ...currentPlan.duration, unit: value } 
                        })}
                      >
                        <SelectTrigger className="flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {durationUnits.map((unit) => (
                            <SelectItem key={unit.value} value={unit.value}>
                              {currentPlan.duration.value === 1 ? unit.label : unit.plural}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={() => setStep(s => s - 1)}
              disabled={step === 0}
              className="text-muted-foreground"
            >
              <ArrowLeft className="mr-1 h-4 w-4" /> Back
            </Button>
            {step < 3 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canNext}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                Next <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            ) : (
              <div className="flex gap-2">
                {plans.length === 1 && (
                  <Button
                    variant="outline"
                    onClick={addPlan}
                    disabled={!canNext}
                    className="border-primary text-primary hover:bg-primary/10"
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Another
                  </Button>
                )}
                <Button
                  onClick={handleFinish}
                  disabled={!allPlansComplete || generating}
                  className="bg-gradient-primary text-primary-foreground hover:opacity-90"
                >
                  {generating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Generating {plans.length} Plan{plans.length > 1 ? 's' : ''}...
                    </>
                  ) : (
                    <>
                      <Check className="mr-1 h-4 w-4" /> Start Learning
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
