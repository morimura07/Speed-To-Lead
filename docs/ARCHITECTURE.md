# LeadArrow — Architecture & Tech-Stack Proposal

> Speed-to-lead platform for high-ticket sales teams. This document proposes the
> technology stack, system architecture, data model, and the design of the two
> highest-risk subsystems (routing engine + telephony). It is a blueprint for
> discussion, not yet an implementation.

---

## 1. Guiding constraints (from requirements)

1. **Latency-critical.** The lead → rep-ringing path must complete in *seconds*.
   This forces an async, queue-driven pipeline rather than synchronous request/response.
2. **Event-sourced analytics.** Almost every dashboard metric (time-to-first-answer,
   re-route frequency, timeout rate, dead-end rate) is only derivable if a structured
   event is emitted at **every** state transition. Must be designed in from day one.
3. **Concurrent + stateful routing.** Multiple leads and reps interact simultaneously;
   the routing engine is a distributed state machine and needs locking / atomic ops.
4. **Telephony must be invisible** to managers — a hidden abstraction layer over the
   provider (Telnyx/Twilio).
5. **Non-technical operators.** Everything configurable via UI with tooltips; no config files.
6. **Multi-tenant SaaS** with trials, license-key gating, and post-trial billing.

---

## 2. Recommended tech stack

| Layer | Choice | Why |
|-------|--------|-----|
| **Language** | TypeScript (end-to-end) | One language across backend, dashboard, and extension; best telephony SDK support; strong typing for the routing state machine. |
| **Backend framework** | **NestJS** (Node.js) | Modular DI architecture maps 1:1 to the "clean, modular" requirement; first-class WebSocket, queues, guards, and config. |
| **Database** | **PostgreSQL** | Transactions for routing concurrency; relational integrity for tenancy; strong analytics querying. |
| **ORM** | Prisma | Type-safe schema, migrations, readable. |
| **Queue / workers** | **BullMQ on Redis** | The async routing/dial pipeline, retries, and *delayed jobs* (follow-up reminders, timeouts). |
| **Cache / locks** | Redis | Distributed locks for rep on-call state + routing atomicity; real-time presence. |
| **Real-time** | WebSocket (Socket.IO) | Chrome softphone signaling + live dashboard updates. |
| **Telephony** | **Twilio Programmable Voice + Conference** (provider behind an interface; Telnyx as a swappable adapter later for cost) | Most mature voice/IVR/SDK + parallel-dial support; fastest path to a working build. |
| **Softphone (extension)** | Twilio Voice JS SDK (WebRTC), Manifest V3, React | Browser becomes a SIP/WebRTC endpoint without managers seeing telephony. |
| **Push** | Pushover API | Emergency/DND notifications. |
| **Frontend (dashboard + marketing)** | **Next.js + React + TypeScript**, Tailwind | Marketing site (SSR/SEO) + app dashboard in one deploy; tooltips/helper-text friendly. |
| **Auth** | JWT access + refresh, Argon2 hashes | Standard; license-key gate layered on signup. |
| **Payments** | **Stripe** (Checkout + Billing) | Trials, subscriptions, license-key issuance on success. |
| **Infra** | Docker; Postgres + Redis managed; deploy on Render/Railway/Fly.io (MVP) → AWS (scale) | Containerized, env-var driven, documented. |
| **Observability** | Pino structured logs + Sentry | Required comprehensive logging + error handling. |

### Why not a single monolith request/response?
The dial path involves waiting on humans (ring, "press 1") and external providers
(Twilio callbacks). Modeling that synchronously blocks threads and can't survive
restarts. A **queue + worker + webhook-callback** model is the correct shape.

---

## 3. High-level system architecture

```
                          ┌─────────────────────────────────────────────┐
   CRMs (Close, GHL,      │                  LeadArrow                    │
   Salesforce, HubSpot)   │                                              │
        │  webhooks        │   ┌──────────────┐      ┌─────────────────┐ │
        └────────────────► │   │  Ingestion    │─────►│  Lead Queue     │ │
   Slack (channels)  ────► │   │  (adapters →  │      │  (BullMQ/Redis) │ │
                          │   │   normalized) │      └────────┬────────┘ │
                          │   └──────────────┘               │          │
                          │                          ┌────────▼────────┐ │
   Twilio  ◄── voice ───► │   ┌──────────────┐       │ Routing Engine  │ │
   (calls/SMS/IVR)        │   │ Telephony     │◄──────│ (state machine, │ │
        ▲  webhooks       │   │ Service (iface)│       │  eligibility,   │ │
        └──────────────── │   └──────────────┘       │  RR / %-based)  │ │
                          │          │                └────────┬────────┘ │
   Pushover ◄──────────── │          │                         │          │
                          │          ▼                ┌────────▼────────┐ │
   Chrome Ext  ◄─WSS────► │   ┌──────────────┐        │  Event Store    │ │
   (softphone)            │   │  Realtime GW  │◄───────│ (every transition)│
                          │   └──────────────┘        └────────┬────────┘ │
   Dashboard   ◄─HTTPS──► │   ┌──────────────┐                 │          │
   (Next.js)              │   │ Analytics /   │◄────────────────┘          │
                          │   │ Aggregation   │                            │
                          │   └──────────────┘                            │
                          │   Auth · Licensing · Billing · Admin          │
                          └─────────────────────────────────────────────┘
                                         │
                                    PostgreSQL
```

### NestJS module map (mirrors subsystems)
```
src/
  ingestion/        # CRM adapters + Slack listener → normalized LeadCreated event
    adapters/       #   close/ ghl/ salesforce/ hubspot/  (one per CRM)
  routing/          # routing engine: eligibility, RR/%-based, state machine
  telephony/        # provider-agnostic interface + twilio adapter; IVR flows
  realtime/         # WebSocket gateway (extension softphone + dashboard live)
  alerts/           # fan-out: phone + extension + pushover; press-1/2 handling
  booking/          # booking alerts (triage / closer modes)
  followups/        # CRM follow-up reminder calls (delayed jobs)
  events/           # event store (write) — source of truth for analytics
  analytics/        # aggregation + query API for dashboard
  reps/             # reps, availability windows, days off, working days
  integrations/     # CRM/Slack/Calendar OAuth connections per org
  auth/             # login/signup/recovery, JWT
  licensing/        # license keys, trials, admin key management
  billing/          # Stripe checkout, subscriptions, key issuance
  org/              # multi-tenant: organizations, members, roles
  common/           # config, logging, guards, errors
```

---

## 4. Data model (core tables)

```
organizations        id, name, trial_ends_at, subscription_status, ...
users                id, org_id, email, password_hash, role(admin|manager)
reps                 id, org_id, name, phone, ext_paired, status(idle|on_call|off)
availability         id, rep_id, weekday, start, end                # working windows
days_off             id, rep_id, date
integrations         id, org_id, type(close|ghl|sf|hubspot|slack|gcal), oauth_tokens, config
routing_rules        id, org_id, method(round_robin|percentage), config(json), order/weights
leads                id, org_id, source, crm_record_url, name, raw(json), status, created_at
lead_attempts        id, lead_id, rep_id, channel, outcome(accept|decline|timeout|fail), ts
calls                id, attempt_id, provider_call_sid, direction, duration, keypad
events               id, org_id, lead_id?, rep_id?, type, payload(json), ts   # ← analytics source
booking_alerts       id, org_id, mode(triage|closer), slack_msg, host_email, status
followups            id, org_id, rep_id, crm_task_id, due_at, status
license_keys         id, code, type(timed|unlimited), trial_days, status, redeemed_by, conv_metrics
subscriptions        id, org_id, stripe_ids, status, started_at
```

`events` is the immutable spine. Dashboard metrics are **aggregations over `events`**,
not separately-maintained counters — this keeps every metric in the requirements derivable.

---

## 5. Routing engine — the technical heart (state machine)

This is the riskiest subsystem. Modeled explicitly:

```
LEAD_RECEIVED
   → build eligible rep set:
        - within availability window? (weekday/working-day/day-off check)
        - not on active call > 30s? (Redis on-call flag)
        - calendar free?  (only if org toggle ON → Google Calendar check)
   → order reps by routing method:
        - ROUND_ROBIN: next in rotation (persisted cursor, atomic increment)
        - PERCENTAGE:  weighted pick honoring long-run allocation
   → RING current rep(s): phone + extension + (pushover if enabled), in parallel
        → ACCEPT (press 1):
              ext  → open CRM record
              phone→ SMS with CRM link
              → ASSIGNED  (cancel other channels)
        → DECLINE (press 2) / TIMEOUT / FAIL:
              → advance to next eligible rep (RE_ROUTE)
   → if rep set exhausted → DEAD_END (logged, alertable to manager)
```

**Concurrency safeguards**
- **Distributed lock per lead** while selecting/advancing reps (Redis `SETNX`), so two
  workers never double-route.
- **Atomic round-robin cursor** (Redis `INCR` mod N) to avoid skew under load.
- **Rep "on-call" flag** with TTL set when a call connects; the >30s check reads it.
- **Idempotent Twilio webhooks** (dedupe on call SID) — callbacks can arrive twice.

Every arrow above emits an `events` row (e.g. `lead.received`, `alert.sent`,
`alert.answered`, `lead.accepted`, `lead.rerouted`, `lead.dead_end`) — that is what
powers speed/volume/routing-health analytics.

---

## 6. Telephony abstraction (provider-invisible)

```ts
interface TelephonyProvider {
  ringRep(opts): Promise<CallHandle>;        // outbound call w/ IVR "press 1/2"
  sendSms(to, body): Promise<void>;
  cancelCall(handle): Promise<void>;         // cancel losers when another accepts
  onKeypad(handle, cb): void;                // DTMF detection
}
```
`TwilioProvider implements TelephonyProvider`. The routing/alerts modules depend on
the **interface only**; managers never see Twilio. A `TelnyxProvider` can be added later
for cost without touching routing logic. Parallel ring + "first to accept wins, cancel
the rest" is implemented with Twilio Conference or simultaneous dials.

---

## 7. Analytics approach

- **Write path:** every state transition → one `events` row (cheap append).
- **Read path:** pre-aggregated rollups (per-rep, per-source, per-hour) refreshed by a
  worker, plus on-demand queries for drill-down. Filters (date, rep, source, CRM, method,
  outcome) become `WHERE` clauses over events + rollups.
- This single design covers all six metric families in the spec (speed, volume, rep
  performance, routing health, availability, reliability).

---

## 8. Suggested build order (MVP → full)

1. **Foundation:** org/auth/licensing + Postgres + one CRM adapter (HubSpot or Close) + event store.
2. **Routing core + telephony:** state machine, Twilio ring, press-1/2, SMS, re-route. *(highest risk — do early)*
3. **Chrome extension softphone** + realtime gateway.
4. **Manager dashboard CRUD:** reps, availability, integrations, routing rules.
5. **Analytics** dashboard over the events already being emitted.
6. **Booking alerts + follow-up reminders.**
7. **Billing (Stripe) + admin key panel + marketing site.**
8. Remaining CRM adapters, Calendar toggle, Pushover, future enhancements.

---

## 9. Open decisions (need your input)

| Decision | Default I'd recommend | Alternatives |
|----------|----------------------|--------------|
| Backend language/framework | TypeScript + NestJS | Python/Django, Go |
| Telephony provider | Twilio (build) | Telnyx (cost) |
| Database | PostgreSQL | — |
| Payments | Stripe | Paddle |
| Hosting (MVP) | Render/Railway | Fly.io, AWS |
| Monorepo? | Yes (Turborepo: api + web + extension + shared types) | separate repos |
```
