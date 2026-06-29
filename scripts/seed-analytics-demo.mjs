// Seed realistic demo data (leads, attempts, events) so the analytics dashboard
// is populated without placing real calls. Idempotent-ish: safe to re-run (it
// appends a fresh batch each time).
//
// Usage (from repo root):
//   node --env-file=apps/api/.env scripts/seed-analytics-demo.mjs [ownerEmail]
import { createRequire } from 'node:module';

// @prisma/client is only installed under apps/api (pnpm workspace), so resolve
// it from there rather than this script's location.
const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();
const ownerEmail = (process.argv[2] ?? 'analytics-test@example.com').toLowerCase();
const SEC = 1000;
const now = Date.now();
const at = (daysAgo, sec = 0) => new Date(now - daysAgo * 86_400_000 + sec * SEC);

async function main() {
  const user = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!user) throw new Error(`No user for ${ownerEmail} — sign up first.`);
  const orgId = user.orgId;

  // Ensure two reps exist.
  const repNames = ['Alex Rivera', 'Sam Chen'];
  const reps = [];
  for (let i = 0; i < repNames.length; i += 1) {
    reps.push(
      await prisma.rep.create({
        data: { orgId, name: repNames[i], phone: `+1555000${i}001`, order: i, routingPercent: 50 },
      }),
    );
  }
  const [alex, sam] = reps;

  // Scenario set: a spread of outcomes, sources, speeds, and re-routes.
  const scenarios = [
    { day: 0, src: 'close', status: 'accepted', acceptSec: 18, attempts: [[alex, 'accepted', 16]] },
    { day: 0, src: 'close', status: 'accepted', acceptSec: 140, attempts: [[alex, 'declined', 9], [sam, 'accepted', 120]] },
    { day: 1, src: 'close', status: 'accepted', acceptSec: 42, attempts: [[sam, 'accepted', 40]] },
    { day: 1, src: 'hubspot', status: 'accepted', acceptSec: 320, attempts: [[alex, 'timed_out', null], [sam, 'accepted', 300]] },
    { day: 2, src: 'close', status: 'accepted', acceptSec: 25, attempts: [[alex, 'accepted', 22]] },
    { day: 2, src: 'close', status: 'dead_end', acceptSec: null, attempts: [[alex, 'failed', null], [sam, 'failed', null]] },
    { day: 3, src: 'hubspot', status: 'accepted', acceptSec: 55, attempts: [[sam, 'accepted', 53]] },
    { day: 3, src: 'close', status: 'accepted', acceptSec: 200, attempts: [[alex, 'declined', 12], [sam, 'accepted', 180]] },
    { day: 4, src: 'close', status: 'dead_end', acceptSec: null, attempts: [[sam, 'timed_out', null], [alex, 'failed', null]] },
    { day: 5, src: 'close', status: 'accepted', acceptSec: 30, attempts: [[alex, 'accepted', 28]] },
    { day: 6, src: 'hubspot', status: 'accepted', acceptSec: 70, attempts: [[sam, 'accepted', 66]] },
    { day: 7, src: 'close', status: 'routing', acceptSec: null, attempts: [[alex, 'ringing', null]] },
    { day: 8, src: 'close', status: 'accepted', acceptSec: 15, attempts: [[sam, 'accepted', 14]] },
    { day: 9, src: 'close', status: 'received', acceptSec: null, attempts: [] },
  ];

  let n = 0;
  for (const s of scenarios) {
    const created = at(s.day, 0);
    const lead = await prisma.lead.create({
      data: {
        orgId,
        source: s.src,
        externalId: `demo_${now}_${n}`,
        name: `Demo Lead ${n + 1}`,
        email: `lead${n + 1}@example.com`,
        phone: '+15555559999',
        crmRecordUrl: 'https://app.close.com/lead/demo/',
        status: s.status,
        acceptedById: s.status === 'accepted' ? s.attempts.at(-1)?.[0].id ?? null : null,
        createdAt: created,
      },
    });

    await prisma.event.create({
      data: { orgId, type: 'lead.received', leadId: lead.id, occurredAt: created },
    });

    let offset = 3;
    for (const [rep, outcome, ansSec] of s.attempts) {
      const aCreated = at(s.day, offset);
      await prisma.leadAttempt.create({
        data: {
          orgId,
          leadId: lead.id,
          repId: rep.id,
          channel: 'phone',
          outcome,
          createdAt: aCreated,
          answeredAt: ansSec != null ? at(s.day, offset + ansSec) : null,
          completedAt: outcome === 'ringing' ? null : at(s.day, offset + (ansSec ?? 25)),
        },
      });
      await prisma.event.create({
        data: { orgId, type: 'alert.sent', leadId: lead.id, repId: rep.id, occurredAt: aCreated },
      });
      offset += (ansSec ?? 25) + 5;
    }

    if (s.status === 'accepted' && s.acceptSec != null) {
      const acceptedAt = at(s.day, s.acceptSec);
      const winner = s.attempts.at(-1)[0];
      await prisma.event.create({
        data: { orgId, type: 'alert.answered', leadId: lead.id, repId: winner.id, occurredAt: acceptedAt },
      });
      await prisma.event.create({
        data: { orgId, type: 'lead.accepted', leadId: lead.id, repId: winner.id, occurredAt: acceptedAt },
      });
    }
    if (s.status === 'dead_end') {
      await prisma.event.create({
        data: { orgId, type: 'lead.dead_end', leadId: lead.id, occurredAt: at(s.day, 60) },
      });
    }
    n += 1;
  }

  console.log(`✔ Seeded ${n} demo leads + attempts + events for ${ownerEmail} (org ${orgId})`);
}

main()
  .catch((e) => {
    console.error(e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
