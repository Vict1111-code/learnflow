import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Brain, Timer, BarChart3, Users, Layers, FileQuestion, MessagesSquare, Route,
  Sparkles, Play, ArrowRight, Check, Flame, Zap, Clock, Target, TrendingUp,
  BookOpen, GraduationCap, LineChart, Star, Quote, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeUp = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.6 },
};

const stagger = {
  initial: {},
  whileInView: {},
  viewport: { once: true, margin: '-80px' },
  transition: { staggerChildren: 0.08 },
};

const features = [
  { icon: Brain, title: 'AI Tutor', desc: 'Conversational tutor that explains, quizzes, and adapts to your pace.' },
  { icon: Timer, title: 'Smart Study Timer', desc: 'Focus sessions with interruption tracking and integrity scoring.' },
  { icon: BarChart3, title: 'Progress Analytics', desc: 'Beautiful charts for XP, streaks, focus and skill growth.' },
  { icon: GraduationCap, title: 'Mentor Dashboard', desc: 'Mentors track students, review proofs and unblock progress.' },
  { icon: Layers, title: 'AI Flashcards', desc: 'Auto-generated spaced-repetition cards from anything you read.' },
  { icon: FileQuestion, title: 'Quiz Generator', desc: 'Turn notes & PDFs into adaptive quizzes in seconds.' },
  { icon: MessagesSquare, title: 'Community Learning', desc: 'Study groups, discussion threads and accountability partners.' },
  { icon: Route, title: 'Adaptive Roadmaps', desc: 'Personalized skill trees that adjust as you master concepts.' },
];

const stats = [
  { value: '1.2M+', label: 'Focus sessions completed' },
  { value: '48K+', label: 'Active learners' },
  { value: '320K', label: 'Study hours tracked' },
  { value: '92K', label: 'Streak milestones' },
];

const steps = [
  { n: '01', title: 'Plan', desc: 'Tell LearnFlow your goal. AI builds a daily, adaptive study roadmap.', icon: Target },
  { n: '02', title: 'Learn', desc: 'Run focused sessions with your AI tutor, flashcards and quizzes.', icon: BookOpen },
  { n: '03', title: 'Track Growth', desc: 'Watch streaks, XP and skill mastery grow with real proof of work.', icon: TrendingUp },
];

const testimonials = [
  { name: 'Amelia Chen', role: 'CS Student, Stanford', quote: 'LearnFlow turned scattered studying into a real system. My focus score jumped 40% in two weeks.' },
  { name: 'Jordan Patel', role: 'Self-taught Designer', quote: 'The AI tutor explains things better than half my professors. The roadmaps actually feel personalized.' },
  { name: 'Sofia Martins', role: 'Med Student', quote: 'Streaks and accountability kept me consistent through exam season. Game-changer.' },
];

const pricing = [
  {
    name: 'Free',
    price: '$0',
    desc: 'Everything you need to build the habit.',
    features: ['1 active goal', 'Smart study timer', 'Basic analytics', 'Community access', '20 AI tutor messages / day'],
    cta: 'Start Learning Free',
    highlight: false,
  },
  {
    name: 'Premium',
    price: '$9',
    suffix: '/mo',
    desc: 'Unlock the full operating system.',
    features: ['Unlimited goals & roadmaps', 'Unlimited AI tutor & flashcards', 'Advanced analytics & heatmaps', 'Mentor dashboard access', 'PDF summarization', 'Priority support'],
    cta: 'Go Premium',
    highlight: true,
  },
];

export default function Landing() {
  const { user } = useAuth();
  const ctaHref = user ? '/dashboard' : '/signup';
  const signInHref = user ? '/dashboard' : '/login';

  return (
    <div className="min-h-screen overflow-hidden bg-background text-foreground">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-primary">
              <Sparkles className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">LearnFlow</span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            {['Features', 'How it works', 'Pricing', 'Community'].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(/\s/g, '-')}`} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {item}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Sign in</Link>
            <Button asChild size="sm" className="bg-gradient-primary shadow-glow-primary">
              <Link to={ctaHref}>Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative px-6 pb-24 pt-20 sm:pt-28">
        {/* glow backdrop */}
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
          <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
          <div className="absolute right-0 top-40 h-[400px] w-[400px] rounded-full bg-level/20 blur-[120px]" />
          <div className="absolute left-0 top-60 h-[300px] w-[300px] rounded-full bg-highlight/10 blur-[100px]" />
        </div>

        <div className="mx-auto max-w-7xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="mx-auto max-w-3xl text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
              <span className="flex h-1.5 w-1.5 rounded-full bg-xp" />
              New: AI Tutor v2 with PDF summarization
            </div>
            <h1 className="mt-6 font-display text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Your <span className="text-gradient-primary">AI-Powered</span><br />Learning Operating System
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
              Plan study sessions, learn with an AI tutor, track focus, get mentorship, generate flashcards & quizzes — and stay accountable with streaks and analytics. All in one place.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" className="bg-gradient-primary shadow-glow-primary">
                <Link to={ctaHref}>Start Learning Free <ArrowRight className="h-4 w-4" /></Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="border-border/60 bg-card/40 backdrop-blur">
                <a href="#how-it-works"><Play className="h-4 w-4" /> Watch Demo</a>
              </Button>
            </div>
          </motion.div>

          {/* Dashboard mockup */}
          <motion.div
            initial={{ opacity: 0, y: 60 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative mx-auto mt-16 max-w-5xl"
          >
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-primary opacity-30 blur-2xl" />
            <div className="glass-card overflow-hidden rounded-2xl border-border/60 p-4 shadow-2xl sm:p-6">
              {/* fake top bar */}
              <div className="mb-4 flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-destructive/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-streak/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-xp/70" />
                <span className="ml-3 text-xs text-muted-foreground">learnflow.app/dashboard</span>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                {/* main panel */}
                <div className="md:col-span-2">
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                    {[
                      { i: Zap, l: 'Total XP', v: '8,420', c: 'text-xp' },
                      { i: Flame, l: 'Streak', v: '23d', c: 'text-streak' },
                      { i: Clock, l: 'Hours', v: '3.4', c: 'text-highlight' },
                      { i: Target, l: 'Sessions', v: '7', c: 'text-level' },
                    ].map(s => (
                      <div key={s.l} className="rounded-xl border border-border/50 bg-muted/30 p-3">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          {s.l} <s.i className={`h-3.5 w-3.5 ${s.c}`} />
                        </div>
                        <div className={`mt-1 font-display text-lg font-bold ${s.c}`}>{s.v}</div>
                      </div>
                    ))}
                  </div>
                  {/* fake chart */}
                  <div className="mt-4 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <span className="text-sm font-medium">XP Growth</span>
                      <span className="text-xs text-muted-foreground">Last 30 days</span>
                    </div>
                    <svg viewBox="0 0 400 120" className="h-32 w-full">
                      <defs>
                        <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
                          <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.5" />
                          <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path d="M0,90 C40,70 70,80 100,60 C140,40 170,55 210,35 C250,20 290,30 330,18 C360,10 380,15 400,8 L400,120 L0,120 Z" fill="url(#g)" />
                      <path d="M0,90 C40,70 70,80 100,60 C140,40 170,55 210,35 C250,20 290,30 330,18 C360,10 380,15 400,8" stroke="hsl(var(--primary))" strokeWidth="2" fill="none" />
                    </svg>
                  </div>
                </div>
                {/* focus timer */}
                <div className="space-y-3">
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4 text-center">
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">Focus Timer</div>
                    <div className="my-3 font-display text-4xl font-bold text-gradient-primary">24:18</div>
                    <div className="flex items-center justify-center gap-1.5 text-xs text-xp">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-xp" /> Deep focus
                    </div>
                  </div>
                  <div className="rounded-xl border border-border/50 bg-muted/30 p-4">
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Today's plan</span><span>4/6</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full w-2/3 rounded-full bg-gradient-xp" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Floating cards */}
            <motion.div
              animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity }}
              className="absolute -left-6 top-20 hidden rounded-xl border border-border/60 bg-card/80 p-3 shadow-glow-streak backdrop-blur md:block"
            >
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-streak" />
                <div>
                  <div className="text-xs font-medium">Streak +1</div>
                  <div className="text-[10px] text-muted-foreground">23 days strong</div>
                </div>
              </div>
            </motion.div>
            <motion.div
              animate={{ y: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }}
              className="absolute -right-4 top-40 hidden rounded-xl border border-border/60 bg-card/80 p-3 shadow-glow-xp backdrop-blur md:block"
            >
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-xp" />
                <div>
                  <div className="text-xs font-medium">+120 XP</div>
                  <div className="text-[10px] text-muted-foreground">Quiz mastered</div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* STATS */}
      <section className="border-y border-border/40 bg-card/30 px-6 py-12">
        <div className="mx-auto max-w-7xl">
          <p className="mb-8 text-center text-xs uppercase tracking-widest text-muted-foreground">Trusted by learners worldwide</p>
          <motion.div {...stagger} className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map(s => (
              <motion.div key={s.label} variants={fadeUp} className="text-center">
                <div className="font-display text-3xl font-bold text-gradient-primary sm:text-4xl">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground sm:text-sm">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="text-xs uppercase tracking-widest text-primary">Features</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Everything you need to actually learn</h2>
            <p className="mt-4 text-muted-foreground">A complete OS for self-directed students — built around focus, proof of work, and consistency.</p>
          </motion.div>

          <motion.div {...stagger} className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(f => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                className="group glass-card relative overflow-hidden rounded-2xl p-6 transition-shadow hover:shadow-glow-primary"
              >
                <div className="absolute -right-8 -top-8 h-24 w-24 rounded-full bg-primary/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-50" />
                <div className="relative">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary shadow-glow-primary">
                    <f.icon className="h-5 w-5 text-primary-foreground" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="border-t border-border/40 bg-card/20 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="text-xs uppercase tracking-widest text-primary">How it works</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Three steps. Real momentum.</h2>
          </motion.div>

          <motion.div {...stagger} className="relative mt-16 grid gap-6 md:grid-cols-3">
            <div aria-hidden className="absolute left-0 right-0 top-12 hidden h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent md:block" />
            {steps.map(s => (
              <motion.div key={s.n} variants={fadeUp} className="glass-card relative rounded-2xl p-8 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-primary shadow-glow-primary">
                  <s.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <div className="mt-4 text-xs font-mono text-muted-foreground">{s.n}</div>
                <h3 className="mt-1 font-display text-2xl font-bold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* AI TUTOR SHOWCASE */}
      <section className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp}>
            <div className="text-xs uppercase tracking-widest text-primary">AI Tutor</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">A tutor that meets you where you are</h2>
            <p className="mt-4 text-muted-foreground">Ask anything. Get patient, adaptive explanations. Convert notes into quizzes. Summarize PDFs. Generate flashcards. Learn the way that fits you.</p>
            <ul className="mt-6 space-y-3">
              {['Explain concepts at any level', 'Generate quizzes & flashcards', 'Adaptive tutoring loops', 'PDF summarization', 'Personalized recommendations'].map(x => (
                <li key={x} className="flex items-center gap-3 text-sm">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-xp/20">
                    <Check className="h-3 w-3 text-xp" />
                  </div>
                  {x}
                </li>
              ))}
            </ul>
          </motion.div>

          <motion.div {...fadeUp} className="relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-gradient-primary opacity-20 blur-2xl" />
            <div className="glass-card rounded-2xl p-5">
              <div className="mb-4 flex items-center gap-2 border-b border-border/40 pb-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-primary">
                  <Brain className="h-4 w-4 text-primary-foreground" />
                </div>
                <div>
                  <div className="text-sm font-medium">LearnFlow Tutor</div>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-xp" /> Online
                  </div>
                </div>
              </div>
              <div className="space-y-3 text-sm">
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-2.5 text-muted-foreground">
                  Can you explain gradient descent like I'm new to calculus?
                </div>
                <div className="ml-auto max-w-[85%] rounded-2xl rounded-tr-sm bg-gradient-primary px-4 py-2.5 text-primary-foreground">
                  Sure. Imagine you're hiking down a foggy hill blindfolded. You feel the slope under your feet and step in the steepest downward direction. Gradient descent does exactly that — for math.
                </div>
                <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-muted/40 px-4 py-2.5 text-muted-foreground">
                  Quiz me on it 👀
                </div>
                <motion.div
                  initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="ml-auto inline-flex items-center gap-2 rounded-full bg-card/80 px-3 py-1.5 text-xs text-muted-foreground"
                >
                  <span className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <motion.span key={i} className="h-1.5 w-1.5 rounded-full bg-primary"
                        animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }} />
                    ))}
                  </span>
                  Generating quiz…
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ANALYTICS SHOWCASE */}
      <section className="border-t border-border/40 bg-card/20 px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2">
          <motion.div {...fadeUp} className="order-2 lg:order-1 relative">
            <div className="absolute -inset-4 -z-10 rounded-3xl bg-level/20 opacity-40 blur-2xl" />
            <div className="glass-card rounded-2xl p-6">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-medium">Focus & XP Trends</span>
                <LineChart className="h-4 w-4 text-muted-foreground" />
              </div>
              <svg viewBox="0 0 400 140" className="h-36 w-full">
                <defs>
                  <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--level-purple))" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="hsl(var(--level-purple))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path d="M0,110 C40,90 70,100 100,80 C140,55 170,75 210,50 C250,30 290,40 330,25 C360,15 380,20 400,12 L400,140 L0,140 Z" fill="url(#g2)" />
                <path d="M0,110 C40,90 70,100 100,80 C140,55 170,75 210,50 C250,30 290,40 330,25 C360,15 380,20 400,12" stroke="hsl(var(--level-purple))" strokeWidth="2" fill="none" />
              </svg>
              {/* heatmap */}
              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Study consistency</span>
                  <span className="text-xp">23-day streak 🔥</span>
                </div>
                <div className="grid grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
                  {Array.from({ length: 100 }).map((_, i) => {
                    const intensity = Math.random();
                    const bg = intensity > 0.75 ? 'bg-xp' : intensity > 0.5 ? 'bg-xp/60' : intensity > 0.25 ? 'bg-xp/30' : 'bg-muted/50';
                    return <div key={i} className={`aspect-square rounded-sm ${bg}`} />;
                  })}
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div {...fadeUp} className="order-1 lg:order-2">
            <div className="text-xs uppercase tracking-widest text-primary">Analytics</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">See your growth — not just your hours</h2>
            <p className="mt-4 text-muted-foreground">Beautiful dashboards turn focus, XP, streaks and skill mastery into signals you can act on. Spot bottlenecks. Celebrate wins.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {[
                { i: TrendingUp, l: 'Focus trends' },
                { i: Flame, l: 'Streak tracking' },
                { i: Zap, l: 'XP & levels' },
                { i: BarChart3, l: 'Skill growth' },
              ].map(x => (
                <div key={x.l} className="flex items-center gap-2 rounded-lg border border-border/50 bg-card/40 px-3 py-2 text-sm">
                  <x.i className="h-4 w-4 text-primary" /> {x.l}
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* COMMUNITY & MENTORSHIP */}
      <section id="community" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="text-xs uppercase tracking-widest text-primary">Community & Mentorship</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Learn together. Stay accountable.</h2>
          </motion.div>

          <motion.div {...stagger} className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: GraduationCap, title: 'Mentor Dashboard', desc: 'Mentors see your roadmap, proofs and bottlenecks.' },
              { icon: MessagesSquare, title: 'Discussion Threads', desc: 'Ask, answer and learn alongside other learners.' },
              { icon: Target, title: 'Accountability', desc: 'Daily reports and streaks keep you on track.' },
              { icon: Users, title: 'Study Groups', desc: 'Co-study sessions with shared timers and goals.' },
            ].map(c => (
              <motion.div key={c.title} variants={fadeUp} className="glass-card rounded-2xl p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15">
                  <c.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="border-t border-border/40 bg-card/20 px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="text-xs uppercase tracking-widest text-primary">Loved by learners</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Real students. Real momentum.</h2>
          </motion.div>
          <motion.div {...stagger} className="mt-14 grid gap-5 md:grid-cols-3">
            {testimonials.map(t => (
              <motion.div key={t.name} variants={fadeUp} className="glass-card relative rounded-2xl p-6">
                <Quote className="absolute right-5 top-5 h-6 w-6 text-primary/30" />
                <div className="flex gap-1">
                  {Array.from({ length: 5 }).map((_, i) => <Star key={i} className="h-4 w-4 fill-streak text-streak" />)}
                </div>
                <p className="mt-4 text-sm text-foreground/90">"{t.quote}"</p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-primary font-display text-sm font-bold text-primary-foreground">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-medium">{t.name}</div>
                    <div className="text-xs text-muted-foreground">{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="px-6 py-24">
        <div className="mx-auto max-w-5xl">
          <motion.div {...fadeUp} className="mx-auto max-w-2xl text-center">
            <div className="text-xs uppercase tracking-widest text-primary">Pricing</div>
            <h2 className="mt-2 font-display text-3xl font-bold sm:text-5xl">Simple. Honest. Built for learners.</h2>
          </motion.div>

          <motion.div {...stagger} className="mt-14 grid gap-6 md:grid-cols-2">
            {pricing.map(p => (
              <motion.div
                key={p.name}
                variants={fadeUp}
                className={`relative rounded-2xl p-8 ${p.highlight ? 'border-2 border-primary/40 bg-gradient-to-b from-primary/10 to-card/40 shadow-glow-primary' : 'glass-card'}`}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-primary px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground shadow-glow-primary">
                    Most popular
                  </div>
                )}
                <h3 className="font-display text-xl font-bold">{p.name}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-5xl font-bold">{p.price}</span>
                  {p.suffix && <span className="text-muted-foreground">{p.suffix}</span>}
                </div>
                <Button asChild size="lg" className={`mt-6 w-full ${p.highlight ? 'bg-gradient-primary shadow-glow-primary' : ''}`} variant={p.highlight ? 'default' : 'outline'}>
                  <Link to={ctaHref}>{p.cta} <ChevronRight className="h-4 w-4" /></Link>
                </Button>
                <ul className="mt-6 space-y-3">
                  {p.features.map(f => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-xp" /> {f}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="px-6 pb-24 pt-12">
        <motion.div {...fadeUp} className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/20 via-card/60 to-level/20 p-12 text-center backdrop-blur-xl">
          <div aria-hidden className="absolute inset-0 -z-10">
            <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/30 blur-3xl" />
          </div>
          <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold sm:text-5xl">Start your learning OS today</h2>
          <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Join thousands building the habit, with the tutor, timer and tracker that finally make studying click.</p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="bg-gradient-primary shadow-glow-primary">
              <Link to={ctaHref}>Start Learning Free <ArrowRight className="h-4 w-4" /></Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="border-border/60 bg-card/40 backdrop-blur">
              <a href="#features">Explore features</a>
            </Button>
          </div>
        </motion.div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/40 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 text-sm text-muted-foreground md:flex-row">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-gradient-primary">
              <Sparkles className="h-3 w-3 text-primary-foreground" />
            </div>
            <span className="font-display font-semibold text-foreground">LearnFlow</span>
            <span>© {new Date().getFullYear()}</span>
          </div>
          <div className="flex gap-6">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
            <Link to="/auth" className="hover:text-foreground">Sign in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
