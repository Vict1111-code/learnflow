import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { mockStudyPlan } from '@/lib/mock-data';
import { BookOpen, CheckCircle, Circle } from 'lucide-react';

const blockColors: Record<string, string> = {
  input: 'bg-primary/10 text-primary border-primary/20',
  breakdown: 'bg-streak/10 text-streak border-streak/20',
  practice: 'bg-xp/10 text-xp border-xp/20',
  output: 'bg-level/10 text-level border-level/20',
  review: 'bg-highlight/10 text-highlight border-highlight/20',
};

export default function StudyPlan() {
  return (
    <Layout>
      <div className="space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Study Plan</h1>
          <p className="mt-1 text-muted-foreground">Your optimized weekly learning roadmap</p>
        </motion.div>

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
          {mockStudyPlan.map((day, dayIndex) => (
            <motion.div
              key={day.id}
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
                  <h2 className="font-display text-lg font-semibold text-foreground">{day.day}</h2>
                  <p className="text-xs text-muted-foreground">
                    {day.blocks.reduce((acc, b) => acc + b.duration, 0)} min total • {day.blocks.filter(b => b.completed).length}/{day.blocks.length} done
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                {day.blocks.map((block) => (
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
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase ${blockColors[block.type]}`}>
                      {block.type}
                    </span>
                    <span className="text-xs text-muted-foreground">{block.duration}m</span>
                  </div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </Layout>
  );
}
