'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi, authApi, clearTokens, getTokens, setTokens } from './api';
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
    if (!getTokens('user')) {
      setStatus('guest');
      return;
    }
    authApi
      .me()
      .then((u) => {
        setUser(u);
        setStatus('authed');
      })
      .catch(() => {
        clearTokens('user');
        setStatus('guest');
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, tokens } = await authApi.login(email, password);
    setTokens('user', tokens);
    setUser(u);
    setStatus('authed');
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const { user: u, tokens } = await authApi.signup(input);
    setTokens('user', tokens);
    setUser(u);
    setStatus('authed');
  }, []);

  const logout = useCallback(async () => {
    const tokens = getTokens('user');
    if (tokens) await authApi.logout(tokens.refreshToken).catch(() => undefined);
    clearTokens('user');
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
    if (!getTokens('admin')) {
      setStatus('guest');
      return;
    }
    adminApi
      .me()
      .then((a) => {
        setAdmin(a);
        setStatus('authed');
      })
      .catch(() => {
        clearTokens('admin');
        setStatus('guest');
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { admin: a, tokens } = await adminApi.login(email, password);
    setTokens('admin', tokens);
    setAdmin(a);
    setStatus('authed');
  }, []);

  const logout = useCallback(() => {
    clearTokens('admin');
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
