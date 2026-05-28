import { useState, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AuthShell } from '@/components/auth/AuthShell';

const schema = z.string().trim().email('Enter a valid email');

export default function ForgotPassword() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(email);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0].message);
      return;
    }
    setSubmitting(true);
    const { error } = await resetPassword(parsed.data);
    setSubmitting(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setSent(true);
  };

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        subtitle={`We sent a password reset link to ${email}.`}
        footer={
          <Link to="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
            <ArrowLeft className="h-3 w-3" /> Back to login
          </Link>
        }
      >
        <div className="flex flex-col items-center gap-4 py-6">
          <CheckCircle2 className="h-14 w-14 text-[hsl(var(--xp-green))]" />
          <p className="text-center text-sm text-muted-foreground">
            Click the link in the email to set a new password.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link."
      footer={
        <Link to="/login" className="inline-flex items-center gap-1 text-muted-foreground hover:text-primary">
          <ArrowLeft className="h-3 w-3" /> Back to login
        </Link>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input id="email" type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="pl-9" required />
          </div>
        </div>
        <Button type="submit" disabled={submitting} className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
          {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>
    </AuthShell>
  );
}
