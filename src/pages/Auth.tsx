import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Zap, Mail, Lock, User, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const { signUp, signIn } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ email: '', password: '', name: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await signUp(form.email, form.password, form.name);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Check your email to confirm your account!');
        }
      } else {
        const { error } = await signIn(form.email, form.password);
        if (error) {
          toast.error(error.message);
        } else {
          navigate('/');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="mb-8 flex items-center justify-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary">
            <Zap className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-display text-2xl font-bold text-foreground">learnflow</span>
        </div>

        <div className="glass-card rounded-2xl p-8">
          <h2 className="font-display text-2xl font-bold text-foreground text-center">
            {mode === 'login' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            {mode === 'login' ? 'Sign in to continue your learning journey' : 'Start your learning journey today'}
          </p>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="mb-1.5 block text-sm text-muted-foreground">Name</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Your name"
                    required
                    className="w-full rounded-lg border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-muted-foreground">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm(prev => ({ ...prev, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full rounded-lg border border-border bg-muted/50 py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-primary py-5 text-primary-foreground hover:opacity-90"
            >
              {loading ? 'Loading...' : mode === 'login' ? 'Sign In' : 'Create Account'}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <button onClick={() => setMode('signup')} className="font-medium text-primary hover:underline">
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button onClick={() => setMode('login')} className="font-medium text-primary hover:underline">
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
