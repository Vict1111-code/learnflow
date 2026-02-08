import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { Send, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function DailyReport() {
  const [form, setForm] = useState({
    studied: '', understood: '', explanation: '', exercises: '', confusingConcepts: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  const fields = [
    { key: 'studied', label: 'What did you study?', placeholder: 'Topics, chapters, modules...' },
    { key: 'understood', label: 'What did you understand?', placeholder: 'Key takeaways and insights...' },
    { key: 'explanation', label: 'Explain it clearly', placeholder: 'Explain as if teaching someone...' },
    { key: 'exercises', label: 'Exercises completed', placeholder: 'Problems solved, projects built...' },
    { key: 'confusingConcepts', label: 'Confusing concepts (optional)', placeholder: 'What\'s still unclear?' },
  ];

  if (submitted) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-xp shadow-glow-xp">
              <Zap className="h-10 w-10 text-primary-foreground" />
            </div>
            <h2 className="font-display text-2xl font-bold text-foreground">Report Submitted!</h2>
            <p className="mt-2 text-muted-foreground">You earned <span className="font-bold text-xp">+50 XP</span></p>
            <Button onClick={() => { setSubmitted(false); setForm({ studied: '', understood: '', explanation: '', exercises: '', confusingConcepts: '' }); }} variant="outline" className="mt-6">
              Submit Another
            </Button>
          </motion.div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="mx-auto max-w-2xl space-y-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Daily Report</h1>
          <p className="mt-1 text-muted-foreground">Prove your learning output and earn XP</p>
        </motion.div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {fields.map((field, i) => (
            <motion.div key={field.key} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
              <label className="mb-1.5 block text-sm font-medium text-foreground">{field.label}</label>
              <textarea
                value={form[field.key as keyof typeof form]}
                onChange={(e) => setForm(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={field.key === 'explanation' ? 4 : 2}
                required={field.key !== 'confusingConcepts'}
                className="w-full rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </motion.div>
          ))}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
            <Button type="submit" className="w-full bg-gradient-primary py-6 text-primary-foreground hover:opacity-90">
              <Send className="mr-2 h-4 w-4" /> Submit Report (+50 XP)
            </Button>
          </motion.div>
        </form>
      </div>
    </Layout>
  );
}
