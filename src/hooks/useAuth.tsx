import { createContext, useContext, ReactNode } from 'react';

export interface AppUser {
  id: string;
  email: string;
  user_metadata: { full_name?: string };
}

function getMockUser(): AppUser {
  return {
    id: 'local-user-001',
    email: 'admin@hou-inc.local',
    user_metadata: { full_name: localStorage.getItem('hou-display-name') || 'HOU INC' },
  };
}

type Ctx = {
  user: AppUser;
  session: { user: AppUser };
  loading: false;
  signOut: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  user: getMockUser(),
  session: { user: getMockUser() },
  loading: false,
  signOut: async () => {},
});

export const AuthProvider = ({ children }: { children: ReactNode }) => (
  <AuthCtx.Provider
    value={{
      user: getMockUser(),
      session: { user: getMockUser() },
      loading: false,
      signOut: async () => { window.location.href = '/'; },
    }}
  >
    {children}
  </AuthCtx.Provider>
);

export const useAuth = () => useContext(AuthCtx);
