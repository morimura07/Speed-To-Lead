// Verify the client's softphone experience over the public IP: pair rep "Jordan
// Rivera", connect a simulated extension socket to http://103.179.45.26:4000,
// route a lead to Jordan, and confirm the browser rings + accept opens the CRM.
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';

const require = createRequire(new URL('../apps/api/package.json', import.meta.url));
const { PrismaClient } = require('@prisma/client');
const extReq = createRequire(new URL('../apps/extension/package.json', import.meta.url));
const { io } = extReq('socket.io-client');
const prisma = new PrismaClient();

const IP = 'http://103.179.45.26:4000';
const base = `${IP}/v1`;
const j = (r) => r.json();
const post = (p, b, t) => fetch(base + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: 'Bearer ' + t } : {}) }, body: b ? JSON.stringify(b) : undefined });
const patch = (p, b, t) => fetch(base + p, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + t }, body: JSON.stringify(b) });
const wait = (s, ev, ms) => new Promise((res, rej) => { const to = setTimeout(() => rej(new Error('timeout ' + ev)), ms); s.once(ev, (d) => { clearTimeout(to); res(d); }); });

(async () => {
  const token = (await post('/auth/login', { email: 'demo@leadarrow.com', password: 'demo1234' }).then(j)).accessToken;
  const org = (await prisma.user.findUnique({ where: { email: 'demo@leadarrow.com' }, select: { orgId: true } })).orgId;

  const reps = await fetch(base + '/reps', { headers: { Authorization: 'Bearer ' + token } }).then(j);
  const jordan = reps.find((r) => r.name === 'Jordan Rivera');
  const others = reps.filter((r) => r.name !== 'Jordan Rivera');

  // Pair Jordan → pairing code embeds the IP URL + token.
  const { pairingCode } = await post(`/reps/${jordan.id}/pairing`, null, token).then(j);
  const pairing = JSON.parse(Buffer.from(pairingCode, 'base64url').toString('utf8'));
  console.log('1) pairing URL embedded:', pairing.url);

  const socket = io(IP, { auth: { token: pairing.token }, transports: ['polling', 'websocket'] });
  await wait(socket, 'connected', 8000);
  console.log('2) extension socket CONNECTED to the IP');

  // Route to Jordan only: pause the others.
  for (const r of others) await patch(`/reps/${r.id}`, { active: false }, token);
  console.log('3) paused other reps so the lead routes to Jordan');

  // Signed Close webhook to the demo org.
  const integ = await prisma.integration.findFirst({ where: { orgId: org, type: 'close' } });
  const url = `${IP}/v1/ingest/close/${integ.webhookToken}`;
  const payload = JSON.stringify({ event: { object_type: 'lead', action: 'created', data: { id: `lead_${randomUUID().slice(0, 8)}`, display_name: 'Live Demo Lead', contacts: [{ name: 'Client', emails: [{ email: 'client@x.com' }] }] } } });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', integ.signingSecret).update(`${ts}${payload}`).digest('hex');
  const incoming = wait(socket, 'incoming-lead', 20000);
  await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'close-sig-hash': sig, 'close-sig-timestamp': ts }, body: payload });

  const lead = await incoming;
  console.log('4) 🔔 BROWSER RANG:', JSON.stringify(lead));
  const openCrm = wait(socket, 'open-crm', 8000);
  socket.emit('accept', { attemptId: lead.attemptId });
  console.log('5) ✅ accepted → open-crm:', JSON.stringify(await openCrm));

  // Restore: reactivate all reps for a clean demo.
  for (const r of others) await patch(`/reps/${r.id}`, { active: true }, token);
  console.log('6) reactivated all reps (demo state clean)');
  socket.disconnect();
  await prisma.$disconnect();
  process.exit(0);
})().catch(async (e) => { console.error('FAILED:', e.message); await prisma.$disconnect(); process.exit(1); });
