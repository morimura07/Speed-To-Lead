// Live checks for Phase 8: gated checkout, billing status, and that an expired
// trial is blocked (402) until subscribed. Run with:
//   node --env-file=apps/api/.env scripts/test-phase8.mjs
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const base = 'http://127.0.0.1:4000/v1';
const j = (r) => r.json();
const post = (p, b, t) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined });
const get = (p, t) => fetch(base + p, { headers: { Authorization: 'Bearer ' + t } });

(async () => {
  const admin = (await post('/auth/admin/login', { email: 'admin@leadarrow.local', password: 'changeme-admin-123' }).then(j)).tokens.accessToken;
  const key = (await post('/admin/license-keys', { type: 'timed', trialDays: 30, count: 1 }, admin).then(j))[0].code;

  const email = `billing-${randomUUID().slice(0, 6)}@example.com`;
  const signup = await post('/auth/signup', { companyName: 'Billing Test', fullName: 'BT', email, phone: '+15555550100', password: 'password123', smsConsent: true, licenseKey: key }).then(j);
  const token = signup.tokens.accessToken;
  const orgId = signup.user.organization.id;
  console.log('1) signed up trial org', orgId);

  // 2) Gated checkout (no Stripe keys) -> 503.
  const checkout = await post('/billing/checkout', null, token);
  console.log('2) POST /billing/checkout ->', checkout.status, checkout.status === 503 ? '(gated, as expected)' : '');

  // 3) Status while on trial -> hasAccess true.
  const s1 = await get('/billing/status', token).then(j);
  console.log('3) status (trial):', JSON.stringify({ status: s1.subscriptionStatus, hasAccess: s1.hasAccess, days: s1.trialDaysRemaining }));

  // 4) Feature endpoint works during trial.
  const leadsTrial = await get('/leads', token);
  console.log('4) GET /leads during trial ->', leadsTrial.status);

  // 5) Expire the trial directly, then the gate should return 402.
  await prisma.organization.update({ where: { id: orgId }, data: { trialEndsAt: new Date(Date.now() - 86_400_000) } });
  const leadsExpired = await get('/leads', token);
  console.log('5) GET /leads after expiry ->', leadsExpired.status, leadsExpired.status === 402 ? '✅ blocked (SubscriptionRequired)' : '');

  const s2 = await get('/billing/status', token).then(j);
  console.log('6) status (expired):', JSON.stringify({ status: s2.subscriptionStatus, hasAccess: s2.hasAccess }));

  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => {
  console.error('FAILED:', e.message);
  await prisma.$disconnect();
  process.exit(1);
});
