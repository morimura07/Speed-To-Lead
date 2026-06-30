import { hasActiveAccess, trialDaysRemaining } from './subscription.util';

const now = new Date('2026-06-30T00:00:00Z');
const inDays = (d: number) => new Date(now.getTime() + d * 86_400_000);

describe('hasActiveAccess', () => {
  it('grants access for an active subscription', () => {
    expect(hasActiveAccess({ subscriptionStatus: 'active', trialEndsAt: null }, now)).toBe(true);
  });

  it('grants access during an unexpired trial and denies after', () => {
    expect(hasActiveAccess({ subscriptionStatus: 'trialing', trialEndsAt: inDays(5) }, now)).toBe(true);
    expect(hasActiveAccess({ subscriptionStatus: 'trialing', trialEndsAt: inDays(-1) }, now)).toBe(false);
  });

  it('denies access for canceled/past_due/expired', () => {
    for (const s of ['canceled', 'past_due', 'expired']) {
      expect(hasActiveAccess({ subscriptionStatus: s, trialEndsAt: inDays(5) }, now)).toBe(false);
    }
  });
});

describe('trialDaysRemaining', () => {
  it('counts up days and floors at zero', () => {
    expect(trialDaysRemaining({ subscriptionStatus: 'trialing', trialEndsAt: inDays(3) }, now)).toBe(3);
    expect(trialDaysRemaining({ subscriptionStatus: 'trialing', trialEndsAt: inDays(-2) }, now)).toBe(0);
    expect(trialDaysRemaining({ subscriptionStatus: 'active', trialEndsAt: null }, now)).toBeNull();
  });
});
