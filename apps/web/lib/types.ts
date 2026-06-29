// Response/request shapes mirroring the LeadArrow API (Phase 1).

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager';
  organization: {
    id: string;
    name: string;
    subscriptionStatus: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
    trialEndsAt: string | null;
    trialDaysRemaining: number | null;
  };
}

export interface AdminProfile {
  id: string;
  email: string;
  name: string;
}

export interface SignupInput {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  password: string;
  smsConsent: boolean;
  licenseKey: string;
}

export type LicenseKeyStatus = 'active' | 'disabled' | 'redeemed';
export type LicenseKeyType = 'timed' | 'unlimited';

export interface LicenseKey {
  id: string;
  code: string;
  type: LicenseKeyType;
  trialDays: number | null;
  status: LicenseKeyStatus;
  notes: string | null;
  redeemedAt: string | null;
  createdAt: string;
  redeemedByOrg: {
    id: string;
    name: string;
    subscriptionStatus: string;
    createdAt: string;
  } | null;
}

export interface AdminStats {
  keys: { total: number; active: number; disabled: number; redeemed: number };
  organizations: {
    total: number;
    trialing: number;
    active: number;
    expired: number;
    canceled: number;
    conversionRatePct: number;
  };
}

export type CrmType = 'close' | 'gohighlevel' | 'salesforce' | 'hubspot';

export type RoutingMethod = 'round_robin' | 'percentage';

export interface Rep {
  id: string;
  name: string;
  phone: string;
  active: boolean;
  status: 'idle' | 'on_call' | 'off';
  routingPercent: number | null;
  order: number;
  createdAt: string;
}

export interface CreateRepInput {
  name: string;
  phone: string;
  routingPercent?: number;
}

export interface Integration {
  id: string;
  type: string;
  status: string;
  webhookUrl: string;
  signingSecret: string;
  createdAt: string;
}

export interface Lead {
  id: string;
  source: string;
  name: string;
  email: string | null;
  phone: string | null;
  crmRecordUrl: string | null;
  status: 'received' | 'routing' | 'accepted' | 'dead_end';
  createdAt: string;
}

export interface AnalyticsSummary {
  range: { from: string; to: string };
  kpis: {
    totalLeads: number;
    accepted: number;
    deadEnd: number;
    inProgress: number;
    connectionRatePct: number;
    avgTimeToAcceptSec: number | null;
    avgTimeToFirstAlertSec: number | null;
  };
  speed: {
    avgTimeToFirstAlertSec: number | null;
    avgTimeToAcceptSec: number | null;
    responseWindows: { label: string; count: number }[];
  };
  volume: {
    bySource: { source: string; total: number; accepted: number; connectionRatePct: number }[];
    byDay: { day: string; received: number; accepted: number }[];
  };
  reps: {
    id: string;
    name: string;
    alerts: number;
    accepted: number;
    declined: number;
    timedOut: number;
    missed: number;
    pickupRatePct: number;
    acceptanceRatePct: number;
    avgResponseSec: number | null;
  }[];
  routingHealth: { avgAttemptsPerLead: number; deadEndRatePct: number; rerouteRatePct: number };
  reliability: {
    ringFailureRatePct: number;
    ringFailures: number;
    totalRings: number;
    crmSyncErrors: number;
  };
}

export interface AnalyticsLeadRow {
  id: string;
  name: string;
  source: string;
  status: string;
  attempts: number;
  createdAt: string;
}

export interface AnalyticsLeadDetail {
  id: string;
  name: string;
  source: string;
  status: string;
  email: string | null;
  phone: string | null;
  crmRecordUrl: string | null;
  createdAt: string;
  acceptedById: string | null;
  attempts: {
    id: string;
    rep: string;
    outcome: string;
    channel: string;
    createdAt: string;
    answeredAt: string | null;
    completedAt: string | null;
    responseLabel: string;
  }[];
}

export interface SignupRow {
  id: string;
  company: string;
  ownerEmail: string | null;
  ownerName: string | null;
  subscriptionStatus: string;
  trialEndsAt: string | null;
  licenseKey: string | null;
  keyType: string | null;
  createdAt: string;
}
