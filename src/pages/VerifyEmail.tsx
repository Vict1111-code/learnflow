import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MailCheck, Loader2, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';

const COOLDOWN_SECONDS = 60;

export default function VerifyEmail() {
  const { user, profile, resendVerification, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const stateEmail = (location.state as { email?: string } | null)?.email;
  const email = user?.email ?? stateEmail ?? '';
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const verified = !!user?.email_confirmed_at || !!profile?.email_verified;

  // If already verified, route forward
  useEffect(() => {
    if (verified && user) {
      const target = profile?.onboarding_completed ? '/dashboard' : '/onboarding';
      const t = setTimeout(() => navigate(target, { replace: true }), 800);
      return () => clearTimeout(t);
    }
  }, [verified, user, profile, navigate]);

  // Poll for verification every 5s
  useEffect(() => {
    if (verified || !user) return;
    const id = setInterval(() => refreshProfile(), 5000);
    return () => clearInterval(id);
  }, [verified, user, refreshProfile]);

  // Cooldown timer
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const handleResend = async () => {
    if (!email || cooldown > 0) return;
    setSending(true);
    const { error } = await resendVerification(email);
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Verification email sent. Check your inbox.');
    setCooldown(COOLDOWN_SECONDS);
  };

  const handleCheck = async () => {
    setChecking(true);
    await refreshProfile();
    setChecking(false);
    if (!verified) toast.info("Not verified yet \u2014 click the link in your email.");
  };

  if (verified) {
    return (
      <AuthShell title="Email verified!" subtitle="Redirecting you to set up your learning journey...">
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle2 className="h-14 w-14 text-[hsl(var(--xp-green))]" />
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Verify your email"
      subtitle={email ? `We sent a verification link to ${email}.` : 'We sent you a verification link.'}
      footer={
        <button onClick={() => signOut().then(() => navigate('/login'))} className="text-muted-foreground hover:text-primary">
          Use a different account
        </button>
      }
    >
      <div className="space-y-5">
        <div className="flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-primary shadow-glow-primary">
              <MailCheck className="h-9 w-9 text-primary-foreground" />
            </div>
          </div>
        </div>

        <p className="text-center text-sm text-muted-foreground">
          Click the link in the email to activate your account. The link expires in 24 hours.
        </p>

        <Button onClick={handleCheck} disabled={checking} variant="outline" className="w-full">
          {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          I've verified — check now
        </Button>

        <Button
          onClick={handleResend}
          disabled={sending || cooldown > 0 || !email}
          className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend verification email'}
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Wrong address?{' '}
          <Link to="/signup" className="text-primary hover:underline">
            Start over
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
