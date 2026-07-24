import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'developer' | 'admin' | 'finance_manager' | 'finance' | 'project_manager' | 'client' | 'read_only_auditor' | 'viewer' | 'pending';

export interface AppUser {
  id: string;
  email: string;
  role: AppRole;
  user_metadata: { full_name?: string };
}

// Role capability helpers
export const canAccessAdmin   = (r: AppRole) => r === 'admin' || r === 'developer';
export const canAccessFinance = (r: AppRole) => ['developer', 'admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer'].includes(r);
export const isClientOnly     = (r: AppRole) => r === 'client';

export const ROLE_LABELS: Record<AppRole, string> = {
  developer:         'Developer',
  admin:             'Admin',
  finance_manager:   'Finance Manager',
  finance:           'Finance',
  project_manager:   'Project Manager',
  client:            'Client',
  read_only_auditor: 'Auditor',
  viewer:            'Viewer',
  pending:           'Pending Approval',
};

// Kept for import compat — no longer used for auth logic
export const DEFAULT_EMAIL = 'admin@houinc.com';
export const DEFAULT_PASS  = '';
export const VIEWER_EMAIL  = '';
export const VIEWER_PASS   = '';

const VALID_ROLES: AppRole[] = ['developer', 'admin', 'finance_manager', 'finance', 'project_manager', 'client', 'read_only_auditor', 'viewer', 'pending'];
const ROLE_PRIORITY: AppRole[] = ['developer', 'admin', 'finance_manager', 'finance', 'project_manager', 'read_only_auditor', 'viewer', 'client'];

// Real authorization is RLS (see app_user_roles / is_developer() / user_has_entity_role()
// in the database) — this is display/routing convenience only. The fallback for an
// unrecognized or absent metadata role MUST be the least-privileged role: defaulting
// to 'admin' here previously meant any self-registered portal client who wandered onto
// a role-guarded route would nominally resolve as an admin client-side.
function metadataRole(user: User): AppRole {
  const raw = user.user_metadata?.role;
  return VALID_ROLES.includes(raw) ? raw : 'client';
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
  /** True once Supabase fires a PASSWORD_RECOVERY auth event (user arrived via
      a "reset your password" email link) — Auth.tsx shows a "set new
      password" view instead of the normal sign-in form while this is true. */
  passwordRecovery: boolean;
  signIn: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUp: (fullName: string, email: string, password: string) => Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }>;
  signOut: () => Promise<void>;
  requestPasswordReset: (email: string) => Promise<{ ok: boolean; error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ ok: boolean; error?: string }>;
};

const AuthCtx = createContext<Ctx>({
  user: null, session: null, loading: true, passwordRecovery: false,
  signIn: async () => ({ ok: false }),
  signUp: async () => ({ ok: false }),
  signOut: async () => {},
  requestPasswordReset: async () => ({ ok: false }),
  updatePassword: async () => ({ ok: false }),
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser]                     = useState<AppUser | null>(null);
  const [session, setSession]               = useState<Session | null>(null);
  const [loading, setLoading]               = useState(true);
  const [passwordRecovery, setPasswordRecovery] = useState(false);

  useEffect(() => {
    // loading must resolve no matter what — RoleGuard renders nothing at all
    // while loading is true, so a hung/rejected getSession() (or a throw
    // inside toAppUser's role lookup) would otherwise leave every guarded
    // route blank forever with no console error to explain why.
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        setUser(session?.user ? await toAppUser(session.user) : null);
      } catch (err) {
        console.error('Session restore failed:', err);
        setSession(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    })();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setPasswordRecovery(true);
      setSession(session);
      if (!session?.user) { setUser(null); return; }
      setTimeout(async () => {
        try {
          setUser(await toAppUser(session.user));
        } catch (err) {
          console.error('Role resolution failed:', err);
          setUser(null);
        }
      }, 0);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  // New staff accounts are tagged role: 'pending' in their own user_metadata
  // (never trusted for authorization — see metadataRole above) so the app
  // can tell "awaiting admin approval" apart from a portal client account,
  // which goes through a completely separate registration flow (usePortal.ts)
  // and never sets an explicit role in metadata at all.
  const signUp = async (fullName: string, email: string, password: string): Promise<{ ok: boolean; error?: string; needsConfirmation?: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim(), role: 'pending' },
        emailRedirectTo: `${window.location.origin}/auth`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, needsConfirmation: !data.session };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    window.location.href = '/auth';
  };

  const requestPasswordReset = async (email: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  };

  const updatePassword = async (newPassword: string): Promise<{ ok: boolean; error?: string }> => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) return { ok: false, error: error.message };
    setPasswordRecovery(false);
    return { ok: true };
  };

  return (
    <AuthCtx.Provider value={{ user, session, loading, passwordRecovery, signIn, signUp, signOut, requestPasswordReset, updatePassword }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
export const useRole = (): AppRole => useContext(AuthCtx).user?.role ?? 'viewer';
