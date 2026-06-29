// Live E2E for the Phase 4 realtime ring (no phone needed):
// signup → add rep → pair → connect a browser socket → ingest a signed lead →
// expect the browser to ring → accept → expect open-crm.
import { createRequire } from 'node:module';
import { createHmac, randomUUID } from 'node:crypto';

const require = createRequire(new URL('../apps/extension/package.json', import.meta.url));
const { io } = require('socket.io-client');

const base = 'http://127.0.0.1:4000/v1';
const j = (r) => r.json();
const post = (path, body, token) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });

const wait = (socket, event, ms) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for "${event}"`)), ms);
    socket.once(event, (d) => {
      clearTimeout(t);
      resolve(d);
    });
  });

(async () => {
  const adminToken = (await post('/auth/admin/login', { email: 'admin@leadarrow.local', password: 'changeme-admin-123' }).then(j)).tokens.accessToken;
  const key = (await post('/admin/license-keys', { type: 'timed', trialDays: 30, count: 1 }, adminToken).then(j))[0].code;
  console.log('1) license key:', key);

  const email = `rt-${randomUUID().slice(0, 6)}@example.com`;
  const signup = await post('/auth/signup', { companyName: 'Realtime Test', fullName: 'RT', email, phone: '+15555550100', password: 'password123', smsConsent: true, licenseKey: key }).then(j);
  const token = signup.tokens.accessToken;
  console.log('2) signed up org', signup.user.organization.id);

  const rep = await post('/reps', { name: 'Browser Rep', phone: '+15555550199' }, token).then(j);
  console.log('3) rep created:', rep.id);

  const { pairingCode } = await post(`/reps/${rep.id}/pairing`, null, token).then(j);
  const pairing = JSON.parse(Buffer.from(pairingCode, 'base64url').toString('utf8'));
  console.log('4) pairing token issued (url:', pairing.url + ')');

  // Connect a simulated extension socket (use localhost rather than the tunnel).
  const socket = io('http://127.0.0.1:4000', { auth: { token: pairing.token }, transports: ['websocket'] });
  await wait(socket, 'connected', 8000);
  console.log('5) extension socket CONNECTED (presence registered)');

  const integ = await post('/integrations', { type: 'close' }, token).then(j);
  console.log('6) integration connected, webhook ready');

  // Send a signed Close webhook → ingest → route → ring.
  const payload = JSON.stringify({ event: { object_type: 'lead', action: 'created', data: { id: `lead_${randomUUID().slice(0, 8)}`, display_name: 'Realtime Acme', contacts: [{ name: 'RT', emails: [{ email: 'p@x.com' }], phones: [{ phone: '+15555550123' }] }] } } });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', integ.signingSecret).update(`${ts}${payload}`).digest('hex');
  const incomingP = wait(socket, 'incoming-lead', 20000);
  const res = await fetch(integ.webhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json', 'close-sig-hash': sig, 'close-sig-timestamp': ts }, body: payload });
  console.log('7) webhook posted ->', res.status);

  const lead = await incomingP;
  console.log('8) 🔔 BROWSER RANG: incoming-lead =', JSON.stringify(lead));

  const openCrmP = wait(socket, 'open-crm', 8000);
  socket.emit('accept', { attemptId: lead.attemptId });
  const crm = await openCrmP;
  console.log('9) ✅ accepted via extension -> open-crm =', JSON.stringify(crm));

  socket.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
