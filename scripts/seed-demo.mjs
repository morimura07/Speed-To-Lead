// Seed a polished demo organization ("Acme Sales Co") so every dashboard screen
// looks full for a client walkthrough: reps + availability, a connected CRM,
// ~28 leads with realistic outcomes/timings (for analytics), reminders, and
// booking alerts. Idempotent: wipes and recreates the demo org each run.
//
//   node --env-file=apps/api/.env scripts/seed-demo.mjs
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const { hash } = require('@node-rs/argon2');
const prisma = new PrismaClient();

const OWNER_EMAIL = 'demo@leadarrow.com';
const OWNER_PASSWORD = 'demo1234';
const ARGON = { memoryCost: 19456, timeCost: 2, parallelism: 1 };

const now = Date.now();
const at = (daysAgo, sec = 0) => new Date(now - daysAgo * 86_400_000 + sec * 1000);
const biz = (d) => ({ '1': [{ start: '09:00', end: '17:00' }], '2': [{ start: '09:00', end: '17:00' }], '3': [{ start: '09:00', end: '17:00' }], '4': [{ start: '09:00', end: '17:00' }], '5': [{ start: '09:00', end: '17:00' }] }[d] ? undefined : undefined);

const WEEK = { '1': [{ start: '08:00', end: '18:00' }], '2': [{ start: '08:00', end: '18:00' }], '3': [{ start: '08:00', end: '18:00' }], '4': [{ start: '08:00', end: '18:00' }], '5': [{ start: '08:00', end: '18:00' }] };

async function main() {
  // Fresh start.
  const existing = await prisma.user.findUnique({ where: { email: OWNER_EMAIL }, select: { orgId: true } });
  if (existing) await prisma.organization.delete({ where: { id: existing.orgId } });

  const org = await prisma.organization.create({
    data: {
      name: 'Acme Sales Co',
      phone: '+16145550100',
      smsConsent: true,
      smsConsentAt: new Date(),
      trialEndsAt: new Date(now + 21 * 86_400_000),
      subscriptionStatus: 'trialing',
      routingMethod: 'round_robin',
      timezone: 'America/New_York',
    },
  });

  await prisma.user.create({
    data: { orgId: org.id, email: OWNER_EMAIL, name: 'Jordan Rivera', passwordHash: await hash(OWNER_PASSWORD, ARGON), role: 'admin' },
  });

  // Reps (with availability + weights).
  const repDefs = [
    { name: 'Jordan Rivera', phone: '+16145550111', order: 0, routingPercent: 40, availability: WEEK },
    { name: 'Sam Chen', phone: '+16145550122', order: 1, routingPercent: 30, availability: WEEK },
    { name: 'Alex Morgan', phone: '+16145550133', order: 2, routingPercent: 20, availability: { '1': [{ start: '09:00', end: '15:00' }], '3': [{ start: '09:00', end: '15:00' }] } },
    { name: 'Priya Patel', phone: '+16145550144', order: 3, routingPercent: 10, availability: WEEK },
  ];
  const reps = [];
  for (const r of repDefs) reps.push(await prisma.rep.create({ data: { orgId: org.id, ...r } }));

  // Connected CRM.
  await prisma.integration.create({
    data: { orgId: org.id, type: 'close', webhookToken: randomUUID().replace(/-/g, ''), signingSecret: randomUUID().replace(/-/g, ''), config: {} },
  });

  // Leads with attempts + events for rich analytics.
  const companies = ['Northwind', 'Globex', 'Initech', 'Umbrella', 'Stark Industries', 'Wonka', 'Acme Foods', 'Cyberdyne', 'Soylent', 'Hooli', 'Pied Piper', 'Vandelay', 'Gekko Capital', 'Wayne Enterprises', 'Oscorp', 'Tyrell', 'Massive Dynamic', 'Aperture', 'Black Mesa', 'Prestige Worldwide', 'Duff', 'Kruger', 'Bluth Co', 'Sterling Cooper', 'Dunder Mifflin', 'Los Pollos', 'Nakatomi', 'Weyland'];
  const sources = (i) => (i < 17 ? 'close' : i < 24 ? 'hubspot' : 'slack');

  let n = 0;
  for (const company of companies) {
    const day = n % 14;
    const source = sources(n);
    const rep = reps[n % reps.length];
    const kind = n % 5 === 0 ? 'deadend' : n % 7 === 3 ? 'inprogress' : 'accepted';
    const reroute = kind === 'accepted' && n % 3 === 0;
    const acceptSec = [22, 45, 130, 210, 320, 35, 70][n % 7];

    const lead = await prisma.lead.create({
      data: {
        orgId: org.id, source, externalId: `demo_${n}_${randomUUID().slice(0, 6)}`,
        name: company, email: `sales@${company.toLowerCase().replace(/[^a-z]/g, '')}.com`, phone: '+16145559999',
        crmRecordUrl: 'https://app.close.com/lead/demo/',
        status: kind === 'deadend' ? 'dead_end' : kind === 'inprogress' ? 'routing' : 'accepted',
        acceptedById: kind === 'accepted' ? (reroute ? reps[(n + 1) % reps.length].id : rep.id) : null,
        createdAt: at(day, 0),
      },
    });
    await prisma.event.create({ data: { orgId: org.id, type: 'lead.received', leadId: lead.id, occurredAt: at(day, 0) } });

    const ring = async (r, outcome, ansSec, offset) => {
      await prisma.leadAttempt.create({ data: { orgId: org.id, leadId: lead.id, repId: r.id, channel: 'phone', outcome, createdAt: at(day, offset), answeredAt: ansSec != null ? at(day, offset + ansSec) : null, completedAt: outcome === 'ringing' ? null : at(day, offset + (ansSec ?? 25)) } });
      await prisma.event.create({ data: { orgId: org.id, type: 'alert.sent', leadId: lead.id, repId: r.id, occurredAt: at(day, offset) } });
    };

    if (kind === 'accepted') {
      if (reroute) { await ring(rep, 'declined', 8, 3); await ring(reps[(n + 1) % reps.length], 'accepted', acceptSec, 15); }
      else await ring(rep, 'accepted', acceptSec, 3);
      const winner = reroute ? reps[(n + 1) % reps.length] : rep;
      await prisma.event.create({ data: { orgId: org.id, type: 'alert.answered', leadId: lead.id, repId: winner.id, occurredAt: at(day, acceptSec) } });
      await prisma.event.create({ data: { orgId: org.id, type: 'lead.accepted', leadId: lead.id, repId: winner.id, occurredAt: at(day, acceptSec) } });
    } else if (kind === 'deadend') {
      await ring(rep, 'failed', null, 3);
      await ring(reps[(n + 1) % reps.length], 'timed_out', null, 35);
      await prisma.event.create({ data: { orgId: org.id, type: 'lead.dead_end', leadId: lead.id, occurredAt: at(day, 90) } });
    } else {
      await ring(rep, 'ringing', null, 3);
    }
    n += 1;
  }

  // Reminders + booking alerts.
  await prisma.followUpReminder.create({ data: { orgId: org.id, repId: reps[0].id, note: 'Send Northwind the proposal deck', dueAt: new Date(now + 3 * 3_600_000) } });
  await prisma.followUpReminder.create({ data: { orgId: org.id, repId: reps[1].id, note: 'Check in with Globex after demo', dueAt: new Date(now + 26 * 3_600_000) } });
  await prisma.bookingAlert.create({ data: { orgId: org.id, mode: 'closer', title: 'Demo call with Stark Industries', hostEmail: 'jordan@acme.com', repId: reps[0].id, status: 'alerted' } });
  await prisma.bookingAlert.create({ data: { orgId: org.id, mode: 'triage', title: 'Discovery call — Wayne Enterprises', repId: reps[1].id, status: 'alerted' } });

  console.log(`✔ Demo org "Acme Sales Co" seeded: ${reps.length} reps, ${n} leads, reminders + bookings`);
  console.log(`  Login: ${OWNER_EMAIL} / ${OWNER_PASSWORD}`);
}

main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
