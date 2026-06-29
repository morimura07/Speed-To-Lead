// Dev helper: POST a correctly-signed Close-style lead to your ingestion webhook.
// Lets you exercise the full pipeline (ingest → route → ring) without a real CRM.
//
// Usage:
//   node scripts/send-test-lead.mjs "<webhookUrl>" "<signingSecret>" ["Lead Name"]
//
// Get <webhookUrl> and <signingSecret> from the dashboard:
//   Dashboard → Integrations → connect Close → copy the Webhook URL + Signing secret.
import { createHmac, randomUUID } from 'node:crypto';

const [, , webhookUrl, signingSecret, leadName = 'Acme Corp'] = process.argv;

if (!webhookUrl || !signingSecret) {
  console.error('Usage: node scripts/send-test-lead.mjs "<webhookUrl>" "<signingSecret>" ["Lead Name"]');
  process.exit(1);
}

const payload = {
  event: {
    object_type: 'lead',
    action: 'created',
    data: {
      id: `lead_${randomUUID().slice(0, 8)}`,
      display_name: leadName,
      contacts: [
        {
          name: leadName,
          emails: [{ email: 'prospect@example.com' }],
          phones: [{ phone: '+15555550123' }],
        },
      ],
    },
  },
};

const rawBody = JSON.stringify(payload);
const timestamp = Math.floor(Date.now() / 1000).toString();
const signature = createHmac('sha256', signingSecret).update(`${timestamp}${rawBody}`).digest('hex');

const res = await fetch(webhookUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'close-sig-hash': signature,
    'close-sig-timestamp': timestamp,
  },
  body: rawBody,
});

console.log(`→ POST ${webhookUrl}`);
console.log(`← ${res.status} ${res.statusText}`);
console.log(await res.text());
