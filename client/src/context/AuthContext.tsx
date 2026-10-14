import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { authApi } from '../api/endpoints';
import { ApiError, getToken, setToken } from '../api/client';
import type { User } from '../api/types';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  // Finishes social sign-in: the server handed back a session JWT in the URL.
  loginWithToken: (token: string) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null);
      return;
    }
    try {
      const { user } = await authApi.me();
      setUser(user);
    } catch (err) {
      setUser(null);
      // Only forget the login when the server says it's no good (expired token,
      // deleted account). A "site access code required" reply on a public page
      // is not a logout.
      if (err instanceof ApiError && (err.status === 401 || err.status === 404)) setToken(null);
    }
  }, []);

  useEffect(() => {
    refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user } = await authApi.login({ email, password });
    setToken(token);
    setUser(user);
    return user;
  }, []);

  const signup = useCallback(async (email: string, password: string, name: string) => {
    const { token, user } = await authApi.signup({ email, password, name });
    setToken(token);
    setUser(user);
  }, []);


  const loginWithToken = useCallback(async (token: string) => {
    setToken(token);
    try {
      const { user } = await authApi.me();
      setUser(user);
      return user;
    } catch (err) {
      setToken(null);
      setUser(null);
      throw err;
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, loginWithToken, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
