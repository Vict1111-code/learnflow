import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Zap, ArrowRight, ArrowLeft, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { GoalType, MasteryLevel, TimeAvailability } from '@/lib/types';

const steps = ['Goal Type', 'Description', 'Mastery Level', 'Time Availability'];

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

export default function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [goalType, setGoalType] = useState<GoalType | ''>('');
  const [description, setDescription] = useState('');
  const [mastery, setMastery] = useState<MasteryLevel | ''>('');
  const [time, setTime] = useState<TimeAvailability | ''>('');

  const canNext = [
    goalType !== '',
    description.trim().length > 5,
    mastery !== '',
    time !== '',
  ][step];

  const handleFinish = () => navigate('/');

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

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {steps.map((_, i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
          ))}
        </div>

        <div className="glass-card rounded-2xl p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
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
                        onClick={() => setGoalType(g.value)}
                        className={`rounded-xl border p-4 text-left transition-all ${goalType === g.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
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
                        onClick={() => setMastery(m.value)}
                        className={`w-full rounded-xl border p-4 text-left transition-all ${mastery === m.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
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
                  <h2 className="font-display text-xl font-bold text-foreground">Time availability</h2>
                  <p className="mt-1 text-sm text-muted-foreground">How much time can you dedicate daily?</p>
                  <div className="mt-6 grid grid-cols-2 gap-3">
                    {timeOptions.map((t) => (
                      <button
                        key={t.value}
                        onClick={() => setTime(t.value)}
                        className={`rounded-xl border p-4 text-center transition-all ${time === t.value ? 'border-primary bg-primary/10 shadow-glow-primary' : 'border-border bg-muted/30 hover:border-primary/50'}`}
                      >
                        <p className="text-sm font-medium text-foreground">{t.label}</p>
                      </button>
                    ))}
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
              <Button
                onClick={handleFinish}
                disabled={!canNext}
                className="bg-gradient-primary text-primary-foreground hover:opacity-90"
              >
                <Check className="mr-1 h-4 w-4" /> Start Learning
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
