# LeadArrow — Phased Build Roadmap

> Stack locked: **TypeScript + NestJS · Twilio · PostgreSQL/Prisma · BullMQ/Redis ·
> Next.js · Stripe.** Build order is sequenced by *risk* and *dependency*, not by feature
> visibility — the riskiest plumbing (routing + telephony) comes early, while it's cheap
> to change. Each phase lists deliverables + an exit criterion ("done when…").

Legend: 🔴 high risk · 🟡 medium · 🟢 low. Estimates are rough relative sizing, not commitments.

---

## Phase 0 — Foundation & scaffolding  🟢  *(prerequisite for everything)*

**Goal:** a running, deployable empty skeleton with the spine in place.

- Monorepo (Turborepo): `apps/api` (NestJS), `apps/web` (Next.js), `apps/extension`, `packages/shared` (types).
- Docker Compose: Postgres + Redis for local dev.
- NestJS bootstrap: config module (env vars), Pino logging, global error handling, health check.
- Prisma init + **`organizations`, `users`, `events`** tables (multi-tenancy + event spine first).
- CI: lint, typecheck, test, build.
- `README` with setup/run/deploy steps (required by spec).

**Done when:** `docker compose up` runs api + web + db + redis locally, and a smoke test passes through to Postgres.

---

## Phase 1 — Multi-tenant auth, licensing & trials  🟡

**Goal:** a company owner can redeem a key, sign up, and get a 30-day trial.

- Org + user model, roles (`admin`, `manager`), JWT access/refresh, Argon2 hashes.
- Login / signup / password recovery.
- **License-key gate** on signup (key required to create an account).
- Trial logic: 30-day `trial_ends_at`, signup collects phone + email + consent.
- **Admin panel (backend)**: generate timed/unlimited keys, disable/revoke, track redemption + status.

**Done when:** an admin generates a key; an owner redeems it, signs up, and lands in an empty dashboard on an active trial. Without a valid key, signup is blocked.

---

## Phase 2 — Event store + ingestion (first CRM)  🟡  *(unblocks routing + analytics)*

**Goal:** a real lead from one CRM lands as a normalized record and emits `lead.received`.

- Normalized internal `Lead` model + `events` append helper used everywhere.
- **Ingestion adapter interface**; implement **one** CRM first (HubSpot or Close — whichever you have sandbox access to).
- Webhook receiver: verify signature → adapter normalizes → persist lead → emit `lead.received` → enqueue to routing.
- Slack channel listener (optional trigger source) — can defer to Phase 6 if needed.

**Done when:** a test lead posted to the CRM appears in `leads`, with a `lead.received` event, queued for routing.

---

## Phase 3 — Routing engine + telephony  🔴  *(the heart — highest risk, done early on purpose)*

**Goal:** a queued lead actually rings a rep, who presses 1/2, with correct re-routing.

- `TelephonyProvider` interface + **TwilioProvider**: outbound call, IVR ("press 1/2"), DTMF capture, SMS, cancel-call.
- Routing state machine (see ARCHITECTURE §5): build eligible set → order (RR / %) → ring → accept/decline/timeout → re-route → dead-end.
- Concurrency safeguards: per-lead Redis lock, atomic RR cursor, rep on-call TTL flag (>30s check), idempotent Twilio webhooks.
- Reps minimal model + phone numbers (full availability UI comes in Phase 5).
- Emit events at every transition (`alert.sent`, `alert.answered`, `lead.accepted`, `lead.rerouted`, `lead.timeout`, `lead.dead_end`).
- Accept-by-phone → SMS with CRM link.

**Done when:** a lead rings a real phone; pressing 1 marks accepted + sends SMS link; pressing 2 (or timeout) re-routes to the next rep; exhausting reps logs a dead-end. All transitions are in `events`.

> This phase is where most bugs live. Budget extra time and write integration tests
> against Twilio's test credentials / a mocked provider.

---

## Phase 4 — Chrome extension softphone + realtime  🔴

**Goal:** the rep can be rung and accept *in the browser*, opening the CRM record.

- WebSocket gateway (Socket.IO): presence + call signaling.
- Manifest V3 extension (React) with Twilio Voice JS SDK (WebRTC) as a lightweight softphone.
- Pairing flow: link an extension instance to a rep account.
- Simultaneous ring across phone + extension (+ Pushover if enabled); first accept wins, cancel the rest.
- Accept-via-extension → open CRM record URL.

**Done when:** a single lead rings phone *and* extension at once; accepting in the extension opens the CRM record and cancels the phone leg.

---

## Phase 5 — Manager dashboard (configuration UI)  🟡

**Goal:** a non-technical manager controls everything from the UI (tooltips + helper text).

- Reps CRUD (add/edit/remove + phone), extension pairing status.
- Integrations: connect CRM (OAuth + type select), Slack workspace/channel, Google Calendar; toggle calendar busy-checking.
- Availability: working days, windows, days off per rep.
- Routing rules UI: round-robin order vs percentage allocations.
- Historical logs + lead-outcome tracking views.

**Done when:** a manager can, with zero code/config files, onboard reps, connect a CRM, set availability, and define routing rules that the Phase 3 engine honors.

---

## Phase 6 — Analytics dashboard  🟡  *(reads events emitted since Phase 2)*

**Goal:** the six metric families from the spec, with filters + drill-down.

- Rollup workers (per-rep / per-source / per-hour) + on-demand drill-down queries.
- Dashboards: speed, volume, rep performance, routing health, availability, system reliability.
- Filters: date range, rep, source, CRM, routing method, outcome → drill into underlying lead histories.

**Done when:** every metric listed in the requirements renders from real `events`, and filters + drill-down work.

---

## Phase 7 — Booking alerts & follow-up reminders  🟢

**Goal:** the two adjacent call-flows.

- Booking alerts off Slack appointments: **Triage mode** (call setter to confirm) + **Closer mode** (alert assigned closer via host email / rep-assignment field).
- Follow-up reminders: CRM follow-up task → BullMQ *delayed job* → call rep at due time; if calendar-busy, retry at next free block.

**Done when:** a Slack booking triggers the correct mode's call, and a scheduled CRM follow-up calls the rep at the right time.

---

## Phase 8 — Billing & marketing site  🟡

**Goal:** trial → paid conversion and a public front door.

- Stripe Checkout + Billing; on payment, issue + email license key, show on success page.
- Trial-expiry gating → require subscription.
- Marketing site (Next.js): clean/modern, "Plans start at $750/mo", Calendly CTA.
- Conversion metrics surfaced in the admin panel.

**Done when:** an expired trial can pay via Stripe, receives a key by email + on-screen, and regains access.

---

## Phase 9 — Breadth & hardening  🟢

**Goal:** finish the matrix and future enhancements.

- Remaining CRM adapters (the other three) against the Phase 2 interface.
- Pushover polish, Google Calendar checks fully wired.
- Future: calendar sync for bookings, scheduled email reports, daily/weekly summaries, rep scorecards, leaderboards, auto-alerts on connection-rate drops / excessive misses.
- Load test the routing engine; finalize deploy docs + scaling notes.

---

## Critical-path summary

```
Phase 0 → 1 → 2 → 3 (routing+telephony) ─┬→ 4 (extension)
                                          ├→ 5 (dashboard)
                                          └→ 6 (analytics)   → 7 → 8 → 9
```
Phases 4, 5, 6 can partly parallelize once Phase 3 exists and is emitting events.

## Recommended first move
Start **Phase 0 scaffolding** — it's a prerequisite for all real work and lets us
validate the monorepo + NestJS + Prisma + Docker wiring before any feature logic.
