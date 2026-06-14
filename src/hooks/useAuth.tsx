import { createContext, useContext, useState, ReactNode } from 'react';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { full_name?: string };
}

const SESSION_KEY = 'hou-session';
const CREDS_KEY   = 'hou-admin-creds';

export const DEFAULT_EMAIL = 'admin@houinc.com';
export const DEFAULT_PASS  = 'houinc2024';

function readSession(): AppUser | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw);
    if (s.expires && Date.now() > s.expires) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return {
      id: s.id,
      email: s.email,
      user_metadata: { full_name: localStorage.getItem('hou-display-name') || undefined },
    };
  } catch { return null; }
}

type Ctx = {
  user: AppUser | null;
  session: { user: AppUser } | null;
  loading: false;
  signIn: (email: string, password: string) => { ok: boolean; error?: string };
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: null, session: null, loading: false,
  signIn: () => ({ ok: false }),
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(readSession);

  const signIn = (email: string, password: string): { ok: boolean; error?: string } => {
    try {
      const stored = JSON.parse(localStorage.getItem(CREDS_KEY) || '{}');
      const adminEmail = stored.email    || DEFAULT_EMAIL;
      const adminPass  = stored.password || DEFAULT_PASS;
      if (email.trim().toLowerCase() !== adminEmail.toLowerCase() || password !== adminPass) {
        return { ok: false, error: 'Invalid email or password.' };
      }
      const u: AppUser = {
        id: 'local-user-001',
        email: adminEmail,
        user_metadata: { full_name: localStorage.getItem('hou-display-name') || undefined },
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify({
        id: u.id,
        email: u.email,
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000,
      }));
      setUser(u);
      return { ok: true };
    } catch {
      return { ok: false, error: 'Sign-in failed. Please try again.' };
    }
  };

  const signOut = async () => {
    localStorage.removeItem(SESSION_KEY);
    setUser(null);
    window.location.href = '/auth';
  };

  return (
    <AuthCtx.Provider value={{ user, session: user ? { user } : null, loading: false, signIn, signOut }}>
      {children}
    </AuthCtx.Provider>
  );
};

export const useAuth = () => useContext(AuthCtx);
