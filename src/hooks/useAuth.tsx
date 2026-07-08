import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export interface AppUser {
  id: string;
  email: string;
  role: 'admin' | 'viewer';
  user_metadata: { full_name?: string };
}

// Kept for import compat — no longer used for auth logic
export const DEFAULT_EMAIL = 'admin@houinc.com';
export const DEFAULT_PASS  = '';
export const VIEWER_EMAIL  = '';
export const VIEWER_PASS   = '';

function toAppUser(user: User): AppUser {
  return {
    id: user.id,
    email: user.email ?? '',
    role: (user.user_metadata?.role as 'admin' | 'viewer') ?? 'admin',
    user_metadata: { full_name: user.user_metadata?.full_name },
  };
}

type Ctx = {
  user: AppUser | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null, session: null, loading: true,
  signIn: async () => ({ ok: false }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]       = useState<AppUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? toAppUser(session.user) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ? toAppUser(session.user) : null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  return (
    <AuthCtx.Provider value={{ user, session, loading, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
export const useRole = () => useContext(AuthCtx).user?.role ?? 'admin';
