import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Target } from 'lucide-react';
import GoalsList from '@/components/GoalsList';
import AddGoalDialog from '@/components/AddGoalDialog';
import { useQueryClient } from '@tanstack/react-query';

export default function Goals() {
  const qc = useQueryClient();
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
          <AddGoalDialog onGoalAdded={() => qc.invalidateQueries({ queryKey: ['learning-goals'] })} />
        </motion.div>

        <GoalsList />
      </div>
    </Layout>
  );
}
