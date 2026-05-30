import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { lovable } from '@/integrations/lovable/index';

interface ProfileSummary {
  onboarding_completed: boolean;
  email_verified: boolean;
  username: string | null;
  name: string | null;
}

interface SignUpPayload {
  email: string;
  password: string;
  fullName: string;
  username: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  profile: ProfileSummary | null;
  profileLoading: boolean;
  signUp: (payload: SignUpPayload) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resendVerification: (email: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<ProfileSummary | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (uid: string, { silent = false }: { silent?: boolean } = {}) => {
    if (!silent) setProfileLoading(true);
    try {
      const { data } = await supabase
        .from('profiles')
        .select('onboarding_completed, email_verified, username, name')
        .eq('user_id', uid)
        .maybeSingle();
      setProfile(
        data
          ? {
              onboarding_completed: !!data.onboarding_completed,
              email_verified: !!data.email_verified,
              username: data.username,
              name: data.name,
            }
          : { onboarding_completed: false, email_verified: false, username: null, name: null }
      );
    } finally {
      if (!silent) setProfileLoading(false);
    }
  }, []);

  useEffect(() => {
    let hasLoadedProfile = false;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setLoading(false);
      if (newSession?.user) {
        // Only show loading state on first load or explicit sign-in.
        // Skip reload on TOKEN_REFRESHED (fires on tab focus) to prevent remounts.
        const isInitialOrSignIn = event === 'SIGNED_IN' || event === 'INITIAL_SESSION';
        if (isInitialOrSignIn && !hasLoadedProfile) {
          hasLoadedProfile = true;
          setTimeout(() => loadProfile(newSession.user.id), 0);
        } else if (event === 'USER_UPDATED') {
          setTimeout(() => loadProfile(newSession.user.id, { silent: true }), 0);
        }
        // TOKEN_REFRESHED: ignore — session is still valid, no need to refetch profile.
      } else {
        hasLoadedProfile = false;
        setProfile(null);
      }
    });

    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setLoading(false);
      if (existing?.user && !hasLoadedProfile) {
        hasLoadedProfile = true;
        loadProfile(existing.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, [loadProfile]);

  const signUp: AuthContextType['signUp'] = async ({ email, password, fullName, username }) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/verify-email`,
        data: { full_name: fullName, name: fullName, username },
      },
    });
    return { error: error as Error | null };
  };

  const signIn: AuthContextType['signIn'] = async (email, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signInWithGoogle: AuthContextType['signInWithGoogle'] = async () => {
    try {
      const result = await lovable.auth.signInWithOAuth('google', {
        redirect_uri: `${window.location.origin}/dashboard`,
      });
      if (result.error) return { error: result.error as Error };
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error(String(e)) };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resendVerification: AuthContextType['resendVerification'] = async (email) => {
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email,
      options: { emailRedirectTo: `${window.location.origin}/verify-email` },
    });
    return { error: error as Error | null };
  };

  const resetPassword: AuthContextType['resetPassword'] = async (email) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error: error as Error | null };
  };

  const updatePassword: AuthContextType['updatePassword'] = async (password) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error as Error | null };
  };

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        profile,
        profileLoading,
        signUp,
        signIn,
        signInWithGoogle,
        signOut,
        resendVerification,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
