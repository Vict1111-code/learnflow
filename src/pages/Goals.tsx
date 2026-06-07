import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Target, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import GoalsList from '@/components/GoalsList';
import AddGoalDialog from '@/components/AddGoalDialog';
import { useState } from 'react';

export default function Goals() {
  const [addOpen, setAddOpen] = useState(false);

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-end justify-between gap-3"
        >
          <div>
            <h1 className="flex items-center gap-2 font-display text-3xl font-bold text-foreground">
              <Target className="h-7 w-7 text-primary" /> Goals
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Track milestones, deadlines, and progress for everything you're learning.
            </p>
          </div>
          <Button onClick={() => setAddOpen(true)} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="mr-2 h-4 w-4" /> New Goal
          </Button>
        </motion.div>

        <GoalsList />

        <AddGoalDialog open={addOpen} onOpenChange={setAddOpen} />
      </div>
    </Layout>
  );
}
