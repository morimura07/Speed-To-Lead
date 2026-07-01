import type {
  AdminProfile,
  AdminStats,
  AnalyticsLeadDetail,
  AnalyticsLeadRow,
  AnalyticsSummary,
  CreateRepInput,
  AvailabilityInput,
  BillingStatus,
  BookingAlert,
  CrmType,
  Integration,
  Lead,
  LicenseKey,
  LicenseKeyStatus,
  LicenseKeyType,
  Reminder,
  Rep,
  RoutingConfig,
  RoutingMethod,
  SlackChannelConfig,
  SlackConfig,
  SignupInput,
  SignupRow,
  UserProfile,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
const API_BASE = `${API_URL}/v1`;

/** Session namespaces — company users and the platform admin keep separate sessions. */
export type Namespace = 'user' | 'admin';

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

// ── Access tokens (in memory only) ────────────────────────────────────────────
// The refresh token lives in an httpOnly cookie set by the server (never exposed
// to JS). Access tokens are short-lived and held only in memory; on reload they
// are re-minted from the cookie via the refresh endpoint.

const accessTokens: Record<Namespace, string | null> = { user: null, admin: null };

function setAccessToken(ns: Namespace, token: string): void {
  accessTokens[ns] = token;
}
function clearAccessToken(ns: Namespace): void {
  accessTokens[ns] = null;
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

  if (ns && accessTokens[ns]) headers.Authorization = `Bearer ${accessTokens[ns]}`;

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
    credentials: 'include', // send/receive the httpOnly refresh cookie
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

/** Re-mint an access token from the httpOnly refresh cookie. */
async function tryRefresh(ns: Namespace): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}${ns === 'admin' ? '/auth/admin/refresh' : '/auth/refresh'}`, {
      method: 'POST',
      credentials: 'include',
    });
    if (!res.ok) {
      clearAccessToken(ns);
      return false;
    }
    const { accessToken } = (await res.json()) as { accessToken: string };
    setAccessToken(ns, accessToken);
    return true;
  } catch {
    clearAccessToken(ns);
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

async function authenticate<B>(path: string, body: B, ns: Namespace): Promise<UserProfile> {
  const res = await request<{ user: UserProfile; accessToken: string }>(path, { method: 'POST', body });
  setAccessToken(ns, res.accessToken);
  return res.user;
}

export const authApi = {
  signup: (input: SignupInput) => authenticate('/auth/signup', input, 'user'),
  login: (email: string, password: string) => authenticate('/auth/login', { email, password }, 'user'),
  me: () => request<UserProfile>('/auth/me', { ns: 'user' }),
  /** Restore a session on load: mint an access token from the cookie, then fetch the profile. */
  restore: async (): Promise<UserProfile | null> => ((await tryRefresh('user')) ? authApi.me() : null),
  logout: async () => {
    await request<{ ok: true }>('/auth/logout', { method: 'POST' }).catch(() => undefined);
    clearAccessToken('user');
  },
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
  getSlack: () => request<SlackConfig>('/integrations/slack', { ns: 'user' }),
  configureSlack: (body: {
    teamId: string;
    bookingMode: 'triage' | 'closer';
    setterRepId?: string;
    channels: SlackChannelConfig[];
  }) => request<SlackConfig>('/integrations/slack', { method: 'POST', body, ns: 'user' }),
};

export const remindersApi = {
  list: () => request<Reminder[]>('/reminders', { ns: 'user' }),
  create: (body: { repId: string; note: string; dueAt: string; crmTaskId?: string }) =>
    request<Reminder>('/reminders', { method: 'POST', body, ns: 'user' }),
  cancel: (id: string) =>
    request<{ ok: true }>(`/reminders/${id}`, { method: 'DELETE', ns: 'user' }),
};

export const bookingsApi = {
  list: () => request<BookingAlert[]>('/bookings', { ns: 'user' }),
};

export const billingApi = {
  status: () => request<BillingStatus>('/billing/status', { ns: 'user' }),
  checkout: () => request<{ url: string }>('/billing/checkout', { method: 'POST', ns: 'user' }),
};

export const repsApi = {
  list: () => request<Rep[]>('/reps', { ns: 'user' }),
  create: (input: CreateRepInput) =>
    request<Rep>('/reps', { method: 'POST', body: input, ns: 'user' }),
  update: (id: string, patch: Partial<Pick<Rep, 'name' | 'phone' | 'active' | 'routingPercent'>>) =>
    request<Rep>(`/reps/${id}`, { method: 'PATCH', body: patch, ns: 'user' }),
  setAvailability: (id: string, input: AvailabilityInput) =>
    request<Rep>(`/reps/${id}/availability`, { method: 'PATCH', body: input, ns: 'user' }),
  generatePairing: (id: string) =>
    request<{ pairingCode: string }>(`/reps/${id}/pairing`, { method: 'POST', ns: 'user' }),
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
  login: async (email: string, password: string): Promise<AdminProfile> => {
    const res = await request<{ admin: AdminProfile; accessToken: string }>('/auth/admin/login', {
      method: 'POST',
      body: { email, password },
    });
    setAccessToken('admin', res.accessToken);
    return res.admin;
  },
  me: () => request<AdminProfile>('/auth/admin/me', { ns: 'admin' }),
  restore: async (): Promise<AdminProfile | null> =>
    (await tryRefresh('admin')) ? adminApi.me() : null,
  logout: async () => {
    await request<{ ok: true }>('/auth/admin/logout', { method: 'POST' }).catch(() => undefined);
    clearAccessToken('admin');
  },
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
