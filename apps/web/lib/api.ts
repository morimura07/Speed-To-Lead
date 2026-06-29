import type {
  AdminProfile,
  AdminStats,
  AnalyticsLeadDetail,
  AnalyticsLeadRow,
  AnalyticsSummary,
  AuthTokens,
  CreateRepInput,
  AvailabilityInput,
  CrmType,
  Integration,
  Lead,
  LicenseKey,
  LicenseKeyStatus,
  LicenseKeyType,
  Rep,
  RoutingConfig,
  RoutingMethod,
  SignupInput,
  SignupRow,
  UserProfile,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_BASE = `${API_URL}/v1`;

/** Token namespaces — company users and the platform admin keep separate sessions. */
export type Namespace = 'user' | 'admin';
const STORAGE_KEY: Record<Namespace, string> = {
  user: 'leadarrow.user.tokens',
  admin: 'leadarrow.admin.tokens',
};

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly data?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ── Token storage (client-side) ──────────────────────────────────────────────

export function getTokens(ns: Namespace): AuthTokens | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(STORAGE_KEY[ns]);
  return raw ? (JSON.parse(raw) as AuthTokens) : null;
}

export function setTokens(ns: Namespace, tokens: AuthTokens): void {
  window.localStorage.setItem(STORAGE_KEY[ns], JSON.stringify(tokens));
}

export function clearTokens(ns: Namespace): void {
  window.localStorage.removeItem(STORAGE_KEY[ns]);
}

// ── Core request with one-shot token refresh ────────────────────────────────

interface RequestOptions {
  method?: string;
  body?: unknown;
  ns?: Namespace; // attach + auto-refresh this session's tokens
  retry?: boolean;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, ns, retry = true } = options;
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };

  if (ns) {
    const tokens = getTokens(ns);
    if (tokens) headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // Transparently refresh once on an expired access token.
  if (res.status === 401 && ns && retry) {
    const refreshed = await tryRefresh(ns);
    if (refreshed) return request<T>(path, { ...options, retry: false });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);

  if (!res.ok) {
    const message = extractMessage(data) ?? `Request failed (${res.status})`;
    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

async function tryRefresh(ns: Namespace): Promise<boolean> {
  const tokens = getTokens(ns);
  if (!tokens) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokens.refreshToken }),
    });
    if (!res.ok) {
      clearTokens(ns);
      return false;
    }
    setTokens(ns, (await res.json()) as AuthTokens);
    return true;
  } catch {
    clearTokens(ns);
    return false;
  }
}

function extractMessage(data: unknown): string | null {
  if (data && typeof data === 'object' && 'message' in data) {
    const m = (data as { message: unknown }).message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
  }
  return null;
}

// ── Endpoints ────────────────────────────────────────────────────────────────

export const authApi = {
  signup: (input: SignupInput) =>
    request<{ user: UserProfile; tokens: AuthTokens }>('/auth/signup', {
      method: 'POST',
      body: input,
    }),
  login: (email: string, password: string) =>
    request<{ user: UserProfile; tokens: AuthTokens }>('/auth/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: () => request<UserProfile>('/auth/me', { ns: 'user' }),
  logout: (refreshToken: string) =>
    request<{ ok: true }>('/auth/logout', { method: 'POST', body: { refreshToken } }),
  forgotPassword: (email: string) =>
    request<{ ok: true }>('/auth/forgot-password', { method: 'POST', body: { email } }),
  resetPassword: (token: string, password: string) =>
    request<{ ok: true }>('/auth/reset-password', { method: 'POST', body: { token, password } }),
};

export const leadsApi = {
  list: () => request<{ items: Lead[]; total: number }>('/leads', { ns: 'user' }),
};

export const integrationsApi = {
  list: () => request<Integration[]>('/integrations', { ns: 'user' }),
  create: (type: CrmType) =>
    request<Integration>('/integrations', { method: 'POST', body: { type }, ns: 'user' }),
  remove: (id: string) =>
    request<{ ok: true }>(`/integrations/${id}`, { method: 'DELETE', ns: 'user' }),
};

export const repsApi = {
  list: () => request<Rep[]>('/reps', { ns: 'user' }),
  create: (input: CreateRepInput) =>
    request<Rep>('/reps', { method: 'POST', body: input, ns: 'user' }),
  update: (id: string, patch: Partial<Pick<Rep, 'name' | 'phone' | 'active' | 'routingPercent'>>) =>
    request<Rep>(`/reps/${id}`, { method: 'PATCH', body: patch, ns: 'user' }),
  setAvailability: (id: string, input: AvailabilityInput) =>
    request<Rep>(`/reps/${id}/availability`, { method: 'PATCH', body: input, ns: 'user' }),
  remove: (id: string) =>
    request<{ ok: true }>(`/reps/${id}`, { method: 'DELETE', ns: 'user' }),
};

export const routingApi = {
  getConfig: () => request<RoutingConfig>('/routing/config', { ns: 'user' }),
  setConfig: (patch: Partial<Omit<RoutingConfig, never>>) =>
    request<RoutingConfig>('/routing/config', { method: 'PATCH', body: patch, ns: 'user' }),
};

function qs(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter(([, v]) => v != null && v !== '');
  return entries.length ? `?${new URLSearchParams(entries as [string, string][]).toString()}` : '';
}

export const analyticsApi = {
  summary: (filters: { from?: string; to?: string; source?: string }) =>
    request<AnalyticsSummary>(`/analytics/summary${qs(filters)}`, { ns: 'user' }),
  leads: (filters: { from?: string; to?: string; source?: string; outcome?: string }) =>
    request<{ items: AnalyticsLeadRow[]; total: number }>(`/analytics/leads${qs(filters)}`, {
      ns: 'user',
    }),
  leadDetail: (id: string) =>
    request<AnalyticsLeadDetail>(`/analytics/leads/${id}`, { ns: 'user' }),
};

export const adminApi = {
  login: (email: string, password: string) =>
    request<{ admin: AdminProfile; tokens: AuthTokens }>('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    }),
  me: () => request<AdminProfile>('/auth/admin/me', { ns: 'admin' }),
  listKeys: (status?: LicenseKeyStatus) =>
    request<{ items: LicenseKey[]; total: number }>(
      `/admin/license-keys${status ? `?status=${status}` : ''}`,
      { ns: 'admin' },
    ),
  createKeys: (input: {
    type: LicenseKeyType;
    trialDays?: number;
    count?: number;
    notes?: string;
  }) => request<LicenseKey[]>('/admin/license-keys', { method: 'POST', body: input, ns: 'admin' }),
  disableKey: (id: string) =>
    request<LicenseKey>(`/admin/license-keys/${id}/disable`, { method: 'POST', ns: 'admin' }),
  enableKey: (id: string) =>
    request<LicenseKey>(`/admin/license-keys/${id}/enable`, { method: 'POST', ns: 'admin' }),
  stats: () => request<AdminStats>('/admin/stats', { ns: 'admin' }),
  signups: () => request<{ items: SignupRow[]; total: number }>('/admin/signups', { ns: 'admin' }),
};
