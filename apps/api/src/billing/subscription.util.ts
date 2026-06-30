export interface AccessOrg {
  subscriptionStatus: string;
  trialEndsAt: Date | null;
}

/**
 * Whether an organization currently has product access: an active subscription,
 * or a trial that hasn't expired. Everything else (expired/canceled/past_due) is
 * blocked until they subscribe.
 */
export function hasActiveAccess(org: AccessOrg, now: Date = new Date()): boolean {
  if (org.subscriptionStatus === 'active') return true;
  if (org.subscriptionStatus === 'trialing') {
    return org.trialEndsAt == null || org.trialEndsAt.getTime() > now.getTime();
  }
  return false;
}

/** Days left in a trial (0 if none/expired). */
export function trialDaysRemaining(org: AccessOrg, now: Date = new Date()): number | null {
  if (org.trialEndsAt == null) return null;
  return Math.max(0, Math.ceil((org.trialEndsAt.getTime() - now.getTime()) / 86_400_000));
}
