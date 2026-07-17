import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'admin' | 'finance_manager' | 'finance' | 'project_manager' | 'client' | 'read_only_auditor' | 'viewer';

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  user_metadata: { full_name?: string };
}

// Role capability helpers
export const canAccessAdmin   = (r: AppRole) => r === 'admin';
export const canAccessFinance = (r: AppRole) => ['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer'].includes(r);
export const isClientOnly     = (r: AppRole) => r === 'client';

export const ROLE_LABELS: Record<AppRole, string> = {
  admin:             'Admin',
  finance_manager:   'Finance Manager',
  finance:           'Finance',
  project_manager:   'Project Manager',
  client:            'Client',
  read_only_auditor: 'Auditor',
  viewer:            'Viewer',
};

// Kept for import compat — no longer used for auth logic
export const DEFAULT_EMAIL = 'admin@houinc.com';
export const DEFAULT_PASS  = '';
export const VIEWER_EMAIL  = '';
export const VIEWER_PASS   = '';

const VALID_ROLES: AppRole[] = ['admin', 'finance_manager', 'finance', 'project_manager', 'client', 'read_only_auditor', 'viewer'];
const ROLE_PRIORITY: AppRole[] = ['admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer', 'client'];

function metadataRole(user: User): AppRole {
  const raw = user.user_metadata?.role;
  return VALID_ROLES.includes(raw) ? raw : 'admin';
}

async function resolveRole(user: User): Promise<AppRole> {
  const { data, error } = await supabase
    .from('app_user_roles' as any)
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (error || !data?.length) return metadataRole(user);
  const roles = data.map((r: any) => r.role).filter((r: AppRole) => VALID_ROLES.includes(r));
  return ROLE_PRIORITY.find(r => roles.includes(r)) ?? metadataRole(user);
}

async function toAppUser(user: User): Promise<AppUser> {
  const role = await resolveRole(user);
  return {
    id: user.id,
    email: user.email ?? '',
    role,
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
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ? await toAppUser(session.user) : null);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session?.user) setUser(null);
      else setTimeout(async () => setUser(await toAppUser(session.user)), 0);
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
export const useRole = (): AppRole => useContext(AuthCtx).user?.role ?? 'viewer';
