'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, authApi } from './api';
import type { AdminProfile, SignupInput, UserProfile } from './types';

type Status = 'loading' | 'authed' | 'guest';

// ── Company-user session ─────────────────────────────────────────────────────

interface AuthContextValue {
  status: Status;
  user: UserProfile | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (input: SignupInput) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    // Restore the session from the httpOnly refresh cookie (if any).
    authApi
      .restore()
      .then((u) => {
        setUser(u);
        setStatus(u ? 'authed' : 'guest');
      })
      .catch(() => setStatus('guest'));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setUser(await authApi.login(email, password));
    setStatus('authed');
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    setUser(await authApi.signup(input));
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
    setStatus('guest');
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within <AuthProvider>');
  return ctx;
}

// ── Platform-admin session ───────────────────────────────────────────────────

interface AdminAuthContextValue {
  status: Status;
  admin: AdminProfile | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [admin, setAdmin] = useState<AdminProfile | null>(null);

  useEffect(() => {
    adminApi
      .restore()
      .then((a) => {
        setAdmin(a);
        setStatus(a ? 'authed' : 'guest');
      })
      .catch(() => setStatus('guest'));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    setAdmin(await adminApi.login(email, password));
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    void adminApi.logout();
    setAdmin(null);
    setStatus('guest');
  }, []);

  return (
    <AdminAuthContext.Provider value={{ status, admin, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth(): AdminAuthContextValue {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within <AdminAuthProvider>');
  return ctx;
}
