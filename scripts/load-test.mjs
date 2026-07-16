// Load-test the ingestion pipeline: fire many signed leads at a CRM webhook with
// bounded concurrency and report throughput + latency percentiles + errors.
// Each accepted lead is enqueued for routing (processed async by the worker), so
// this measures the inbound ingestion path.
//
//   node scripts/load-test.mjs "<webhookUrl>" "<signingSecret>" [count=200] [concurrency=20]
import { createHmac, randomUUID } from 'node:crypto';

const [, , webhookUrl, secret, countArg, concArg] = process.argv;
if (!webhookUrl || !secret) {
  console.error('Usage: node scripts/load-test.mjs "<webhookUrl>" "<signingSecret>" [count] [concurrency]');
  process.exit(1);
}
const COUNT = Number(countArg) || 200;
const CONCURRENCY = Number(concArg) || 20;

function signedRequest(i) {
  const payload = JSON.stringify({
    event: { object_type: 'lead', action: 'created', data: { id: `load_${randomUUID().slice(0, 10)}`, display_name: `Load Test ${i}`, contacts: [{ name: `LT ${i}`, emails: [{ email: `lt${i}@example.com` }] }] } },
  });
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = createHmac('sha256', secret).update(`${ts}${payload}`).digest('hex');
  return { payload, headers: { 'Content-Type': 'application/json', 'close-sig-hash': sig, 'close-sig-timestamp': ts } };
}

const latencies = [];
let ok = 0;
let failed = 0;

async function worker(queue) {
  for (const i of queue) {
    const { payload, headers } = signedRequest(i);
    const t0 = performance.now();
    try {
      const res = await fetch(webhookUrl, { method: 'POST', headers, body: payload });
      const dt = performance.now() - t0;
      latencies.push(dt);
      if (res.ok) ok += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }
}

function pct(sorted, p) {
  if (!sorted.length) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

(async () => {
  console.log(`Firing ${COUNT} leads at concurrency ${CONCURRENCY} → ${webhookUrl}`);
  // Split work into N lanes for bounded concurrency.
  const lanes = Array.from({ length: CONCURRENCY }, () => []);
  for (let i = 0; i < COUNT; i += 1) lanes[i % CONCURRENCY].push(i);

  const start = performance.now();
  await Promise.all(lanes.map(worker));
  const wall = (performance.now() - start) / 1000;

  const sorted = [...latencies].sort((a, b) => a - b);
  const round = (n) => Math.round(n);
  console.log('─'.repeat(40));
  console.log(`Requests   : ${COUNT}  (ok ${ok}, failed ${failed})`);
  console.log(`Wall time  : ${wall.toFixed(2)}s`);
  console.log(`Throughput : ${round(COUNT / wall)} req/s`);
  console.log(`Latency ms : p50 ${round(pct(sorted, 50))} · p95 ${round(pct(sorted, 95))} · p99 ${round(pct(sorted, 99))} · max ${round(sorted.at(-1) ?? 0)}`);
  console.log('─'.repeat(40));
  process.exit(failed > 0 ? 1 : 0);
})();
