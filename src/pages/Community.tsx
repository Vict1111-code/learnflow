import { useState } from 'react';
import Layout from '@/components/Layout';
import { motion } from 'framer-motion';
import { mockPosts } from '@/lib/mock-data';
import { ArrowUp, MessageSquare, HelpCircle, Lightbulb, Trophy, Link2 } from 'lucide-react';

const typeIcons: Record<string, typeof HelpCircle> = {
  question: HelpCircle,
  explanation: Lightbulb,
  achievement: Trophy,
  resource: Link2,
};

const typeColors: Record<string, string> = {
  question: 'bg-primary/10 text-primary',
  explanation: 'bg-xp/10 text-xp',
  achievement: 'bg-streak/10 text-streak',
  resource: 'bg-level/10 text-level',
};

const filters = ['All', 'Questions', 'Explanations', 'Achievements', 'Resources'];

export default function Community() {
  const [activeFilter, setActiveFilter] = useState('All');

  const filtered = activeFilter === 'All'
    ? mockPosts
    : mockPosts.filter(p => p.type === activeFilter.toLowerCase().slice(0, -1));

  return (
    <Layout>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground">Community</h1>
          <p className="mt-1 text-muted-foreground">Learn together. Help others. Earn XP.</p>
        </motion.div>

        {/* Filters */}
        <div className="flex gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${activeFilter === f ? 'bg-gradient-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Posts */}
        <div className="space-y-4">
          {filtered.map((post, i) => {
            const Icon = typeIcons[post.type];
            return (
              <motion.div
                key={post.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="glass-card rounded-xl p-5"
              >
                <div className="flex gap-4">
                  {/* Votes */}
                  <div className="flex flex-col items-center gap-1">
                    <button className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                      <ArrowUp className="h-4 w-4" />
                    </button>
                    <span className="text-sm font-bold text-foreground">{post.upvotes}</span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex items-center gap-2">
                      <span className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase ${typeColors[post.type]}`}>
                        <Icon className="h-3 w-3" /> {post.type}
                      </span>
                      <span className="rounded-md bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">{post.topic}</span>
                    </div>
                    <h3 className="text-base font-semibold text-foreground">{post.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{post.content}</p>
                    <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{post.userName}</span>
                      <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {post.comments}</span>
                      <span>{new Date(post.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </Layout>
  );
}
