# LeadArrow — Completion Plan (to Production Launch)

**Where we are:** feature-complete (Phases 0–9) + email + cookie-auth hardening,
running in dev on real cloud data (Neon/Upstash/Twilio), demoed and approved.

**Definition of done (launch):** deployed on real infrastructure behind a domain
with HTTPS, all *needed* providers live, monitored + backed up, able to onboard
and charge real customers, with SMS compliance in progress.

## Decisions (locked)
- **Hosting:** API + in-process worker on **Render**; web on **Vercel**; keep **Neon + Upstash**.
- **Domain:** to be purchased — DNS records provided in the deploy runbook.
- **Google Calendar:** **deferred** to post-launch (toggle stays inert).
- **Scale:** **single instance** at launch (in-process worker; in-memory throttler/presence).
  → Workstream C2 (Redis throttler + Socket.IO adapter) is deferred until we scale out.

---

## Critical path first: start the long-lead item TODAY

**Twilio A2P 10DLC registration** (required to send SMS to US numbers) is
carrier-approved and can take **days to ~2 weeks**. Nothing else blocks on it, but
it blocks SMS at launch. → **Submit brand + campaign registration on day 0.**
Voice (the ring) and the browser softphone work without it.

---

## Workstream A — Deployment & Infrastructure  *(foundation, do first)*

| # | Task | Owner |
| --- | --- | --- |
| A1 | Pick hosting (recommended: **API+worker on Render/Railway**, **web on Vercel**, keep **Neon + Upstash**) | You (decide) |
| A2 | **Dockerfiles** for `api` + `web` (multi-stage) | Me |
| A3 | Domain + DNS: `app.<domain>` (web), `api.<domain>` (API) + **HTTPS** | You (buy) / Me (config) |
| A4 | Production env + **secrets** (strong `JWT_*`, change admin password) | Me + You (values) |
| A5 | **Migrations**: baseline the current DB (`migrate resolve --applied 0_init`), `migrate deploy` in CI | Me |
| A6 | Worker split: web/API replicas `ROUTING_WORKER_ENABLED=false` + one worker `=true` (or single instance to start) | Me |
| A7 | **CI/CD deploy** pipeline (extend existing GitHub Actions) | Me |
| A8 | Set `NODE_ENV=production` → cookies become `SameSite=None; Secure` (already coded; needs HTTPS) | Me |
| A9 | Upstash → **`noeviction`** (so delayed reminders fire) | You (console) |

## Workstream B — Provider activation  *(parallel with A)*

| # | Task | Owner |
| --- | --- | --- |
| B1 | **Twilio**: production account, buy number(s), **A2P 10DLC (start day 0)**, live phone test | You (account) / Me (config) |
| B2 | **Stripe**: account, $750 product/price, webhook endpoint, test checkout→activation | You (account) / Me (config + test) |
| B3 | **Slack**: create app, Events Request URL, signing secret, install flow | You (account) / Me (config) |
| B4 | **Email/SMTP**: pick ESP (SES / Postmark / Resend-SMTP), configure, test reset + key + billing mails | You (account) / Me (config) |
| B5 | **Pushover** app token (optional) | You / Me |
| B6 | **Google Calendar** busy-check (OAuth + FreeBusy) — the one unbuilt feature | **Decide: defer** (recommended) or build |

## Workstream C — Security & reliability hardening

| # | Task | Owner |
| --- | --- | --- |
| C1 | **Per-attempt timeout job** (routing robustness beyond Twilio's callback) | Me |
| C2 | Multi-instance readiness *(only if scaling >1 instance at launch)*: **Redis throttler + Socket.IO Redis adapter** | Me |
| C3 | Remove dev defaults, rotate secrets, review helmet/CORS for prod origins | Me |
| C4 | SMS **opt-out (STOP) handling** + consent audit trail | Me |

## Workstream D — Observability & ops

| # | Task | Owner |
| --- | --- | --- |
| D1 | **Sentry** error tracking (api + web) | Me + You (DSN) |
| D2 | **Uptime monitoring + alerts** on `/health` | You (tool) / Me (endpoints ready) |
| D3 | **Postgres backups** (Neon PITR) + a restore test | Me + You |

## Workstream E — Compliance, QA & launch

| # | Task | Owner |
| --- | --- | --- |
| E1 | Legal: **privacy policy, terms**, real **Calendly** link | You (content) / Me (pages) |
| E2 | **Full production QA**: signup → ingest → ring → accept → SMS → billing → admin | Me + You |
| E3 | **Load-test** the routing engine under concurrency | Me |
| E4 | Launch checklist sign-off → **soft launch** | Both |

---

## Suggested timeline (aggressive / "speedy")

- **Day 0:** submit **A2P 10DLC** (B1); buy domain (A3); create Stripe/Slack/ESP/Sentry accounts.
- **Days 1–5:** Dockerfiles + deploy to a **staging** env (A2–A8), Sentry + uptime (D1–D2), activate Stripe/Slack/Email (B2–B4), per-attempt timeout (C1).
- **Days 6–9:** security/compliance (C3–C4), backups (D3), legal pages (E1), full QA + load test (E2–E3).
- **~Day 10:** **soft launch** (voice + browser ring live; SMS switches on when A2P is approved).

Realistic: **~1.5–2 weeks to soft launch**, with A2P approval the main external variable.

---

## What I can start on immediately (no accounts needed)
Dockerfiles + compose, CI/CD deploy workflow, migration baseline, per-attempt
timeout job, prod cookie/secrets config, SMS opt-out handling, load-test scripts,
legal-page scaffolding, and the Redis throttler/adapter (if we scale). Provider
wiring lands as you create each account.

## Decisions needed to kick off
1. **Hosting** — Render/Railway + Vercel (recommended) or a single VPS/AWS?
2. **Domain** — do you have one? (needed for HTTPS + prod cookies)
3. **Google Calendar** — defer (recommended) or build now?
4. **Scale at launch** — single instance (simpler) or multi-instance (needs C2)?
