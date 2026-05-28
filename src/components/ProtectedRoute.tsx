import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Zap } from 'lucide-react';

interface ProtectedRouteProps {
  children: ReactNode;
  /** Allow access even if email isn't confirmed (e.g. verify-email page itself). */
  allowUnverified?: boolean;
  /** Allow access even if onboarding isn't complete (e.g. onboarding page itself). */
  allowUnonboarded?: boolean;
}

function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-gradient-primary">
          <Zap className="h-6 w-6 text-primary-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
}

export default function ProtectedRoute({
  children,
  allowUnverified = false,
  allowUnonboarded = false,
}: ProtectedRouteProps) {
  const { user, loading, profile, profileLoading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingScreen />;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Wait for profile to gate verify/onboard checks
  if (profileLoading || !profile) return <LoadingScreen />;

  const isVerified = profile.email_verified || !!user.email_confirmed_at;

  if (!isVerified && !allowUnverified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (isVerified && !profile.onboarding_completed && !allowUnonboarded) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
