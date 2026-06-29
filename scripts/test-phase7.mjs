// Live checks for Phase 7: Slack URL verification, Slack booking alert, Slack
// lead source, and availability-aware reminder rescheduling.
const base = 'http://127.0.0.1:4000/v1';
const j = (r) => r.json();
const post = (path, body, token) =>
  fetch(base + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const token = (await post('/auth/login', { email: 'analytics-test@example.com', password: 'password123' }).then(j)).tokens.accessToken;
  const auth = (p, b) => post(p, b, token);
  const get = (p) => fetch(base + p, { headers: { Authorization: 'Bearer ' + token } }).then(j);

  // 1) Slack URL verification handshake.
  const ver = await post('/slack/events', { type: 'url_verification', challenge: 'live-xyz' }).then(j);
  console.log('1) url_verification ->', JSON.stringify(ver), ver.challenge === 'live-xyz' ? 'OK' : 'FAIL');

  // 2) Configure Slack (team + channels) and fire a booking + a lead message.
  await auth('/integrations/slack', {
    teamId: 'TLIVE', bookingMode: 'closer',
    channels: [{ id: 'CBOOK', purpose: 'bookings' }, { id: 'CLEAD', purpose: 'leads' }],
  });
  console.log('2) slack configured (team TLIVE, CBOOK=bookings, CLEAD=leads)');

  await post('/slack/events', { type: 'event_callback', team_id: 'TLIVE', event: { type: 'message', channel: 'CBOOK', text: 'Booking with Acme Corp\nCloser: nobody@x.com', ts: `b${Date.now()}` } });
  await post('/slack/events', { type: 'event_callback', team_id: 'TLIVE', event: { type: 'message', channel: 'CLEAD', text: `Jane SlackLead\njane${Date.now()}@lead.com`, ts: `l${Date.now()}` } });
  await sleep(1500);

  const bookings = await get('/bookings');
  console.log('3) booking alerts:', bookings.length, '| latest:', bookings[0]?.title, `(${bookings[0]?.status})`);
  const leads = await get('/leads');
  const slackLead = leads.items.find((l) => l.source === 'slack');
  console.log('4) slack lead ingested:', slackLead ? `"${slackLead.name}"` : 'NONE');

  // 5) Reminder reschedule: a rep who is off today should push the reminder out.
  const rep = await auth('/reps', { name: 'Reschedule Rep', phone: '+15555550144' }).then(j);
  const todayNY = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
  await auth(`/reps/${rep.id}/availability`, { availability: {}, daysOff: [todayNY] });

  const dueAt = new Date(Date.now() + 3000).toISOString();
  const reminder = await auth('/reminders', { repId: rep.id, note: 'Call Acme back', dueAt }).then(j);
  console.log('5) reminder scheduled for', dueAt, '(rep is OFF today', todayNY + ')');

  await sleep(8000);
  const reminders = await get('/reminders');
  const updated = reminders.find((r) => r.id === reminder.id);
  console.log('6) after due time -> status:', updated?.status, '| attempts:', updated?.attempts, '| new dueAt:', updated?.dueAt);
  console.log(updated?.status === 'rescheduled' ? '   ✅ rescheduled to next available block' : '   (status: ' + updated?.status + ')');

  process.exit(0);
})().catch((e) => {
  console.error('FAILED:', e.message);
  process.exit(1);
});
