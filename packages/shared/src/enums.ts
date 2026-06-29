/**
 * Shared enumerations for the LeadArrow domain.
 * Kept as `const` objects + union types so they are usable from both
 * runtime code (values) and type positions, on backend and frontend.
 */

export const UserRole = {
  Admin: 'admin',
  Manager: 'manager',
} as const;
export type UserRole = (typeof UserRole)[keyof typeof UserRole];

export const CrmType = {
  Close: 'close',
  GoHighLevel: 'gohighlevel',
  Salesforce: 'salesforce',
  HubSpot: 'hubspot',
} as const;
export type CrmType = (typeof CrmType)[keyof typeof CrmType];

export const IntegrationType = {
  Close: 'close',
  GoHighLevel: 'gohighlevel',
  Salesforce: 'salesforce',
  HubSpot: 'hubspot',
  Slack: 'slack',
  GoogleCalendar: 'google_calendar',
} as const;
export type IntegrationType = (typeof IntegrationType)[keyof typeof IntegrationType];

export const RoutingMethod = {
  RoundRobin: 'round_robin',
  Percentage: 'percentage',
} as const;
export type RoutingMethod = (typeof RoutingMethod)[keyof typeof RoutingMethod];

export const RepStatus = {
  Idle: 'idle',
  OnCall: 'on_call',
  Off: 'off',
} as const;
export type RepStatus = (typeof RepStatus)[keyof typeof RepStatus];

export const LeadStatus = {
  Received: 'received',
  Routing: 'routing',
  Accepted: 'accepted',
  DeadEnd: 'dead_end',
} as const;
export type LeadStatus = (typeof LeadStatus)[keyof typeof LeadStatus];

export const AttemptOutcome = {
  Accepted: 'accepted',
  Declined: 'declined',
  TimedOut: 'timed_out',
  Failed: 'failed',
} as const;
export type AttemptOutcome = (typeof AttemptOutcome)[keyof typeof AttemptOutcome];

export const AlertChannel = {
  Phone: 'phone',
  Extension: 'extension',
  Pushover: 'pushover',
} as const;
export type AlertChannel = (typeof AlertChannel)[keyof typeof AlertChannel];

export const BookingMode = {
  Triage: 'triage',
  Closer: 'closer',
} as const;
export type BookingMode = (typeof BookingMode)[keyof typeof BookingMode];

export const LicenseKeyType = {
  Timed: 'timed',
  Unlimited: 'unlimited',
} as const;
export type LicenseKeyType = (typeof LicenseKeyType)[keyof typeof LicenseKeyType];

export const LicenseKeyStatus = {
  Active: 'active',
  Disabled: 'disabled',
  Redeemed: 'redeemed',
} as const;
export type LicenseKeyStatus = (typeof LicenseKeyStatus)[keyof typeof LicenseKeyStatus];

export const SubscriptionStatus = {
  Trialing: 'trialing',
  Active: 'active',
  PastDue: 'past_due',
  Canceled: 'canceled',
  Expired: 'expired',
} as const;
export type SubscriptionStatus = (typeof SubscriptionStatus)[keyof typeof SubscriptionStatus];
