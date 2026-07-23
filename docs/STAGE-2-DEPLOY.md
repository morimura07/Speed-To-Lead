# Stage-2 Deploy — Backend (API + worker) on Render + wire providers

Goal: take the finished backend live on a public URL, point the already-deployed
web app at it, and wire the provider webhooks. A2P is **approved**, so SMS works
once the Twilio env is set and the number is attached to the Messaging Service.

**No secrets live in this doc** — every value is a placeholder you paste into the
host's env UI. Statuses: ✅ in hand · ⏳ comes later · ❌ still needed.

---

## Prerequisites (still needed before deploy)

1. ✅ **Production Redis** — Upstash `rediss://…@<host>.upstash.io`
   received (held for the Render env). *Confirm the DB is on Pay-as-You-Go (not
   Free) and eviction is disabled (`noeviction`) so delayed jobs aren't dropped.*
2. ❌ **Render account** — to host the API + in-process worker (Starter plan,
   always-on). → to be created on the client's account. **(last blocker)**
3. ✅ **Stripe Product + Price** — `(Stripe price ID)` (test).
4. ✅ **Resend domain** — `send.getleadarrow.com` **verified** (DKIM/SPF/MX/DMARC);
   from-address `no-reply@send.getleadarrow.com`.
5. ✅ **Twilio** — auth token in hand for account `(Twilio account)`; sending number
   **(10DLC sending number)** (Local · 10DLC) attached to Messaging Service `(Messaging Service)`.

---

## Step 1 — Provision the API service on Render

- New **Web Service** from the GitHub repo (`morimura07/Speed-To-Lead`), branch
  `manage-panel` (or `main` if merged). The repo already has `apps/api/Dockerfile`
  and `render.yaml`.
- Render builds the Docker image; start command runs `dist/main.js`.
- **Pre-deploy command:** `pnpm --filter @leadarrow/api prisma:deploy`
  (applies the `0_init` baseline migration).
- Single instance to start, with `ROUTING_WORKER_ENABLED=true` (worker runs
  in-process — matches the locked single-instance decision).

## Step 2 — API environment variables (Render)

| Key | Value | Status |
|---|---|---|
| `NODE_ENV` | `production` *(flips cookies to SameSite=None; Secure)* | set |
| `DATABASE_URL` | Neon production `postgres://…` | ✅ |
| `REDIS_URL` | new Upstash `rediss://…` | ❌ |
| `APP_URL` | `https://getleadarrow.com` | set |
| `API_PUBLIC_URL` | `https://api.getleadarrow.com` | decide domain |
| `CORS_ORIGINS` | `https://getleadarrow.com,https://www.getleadarrow.com` | set |
| `JWT_ACCESS_SECRET` | generate: `openssl rand -hex 32` | generate |
| `JWT_REFRESH_SECRET` | generate: `openssl rand -hex 32` (different) | generate |
| `PLATFORM_ADMIN_EMAIL` | Eliot's admin login email | ⏳ |
| `PLATFORM_ADMIN_PASSWORD` | strong password (not the dev default) | generate |
| `PLATFORM_ADMIN_NAME` | e.g. `LeadArrow Admin` | set |
| `TWILIO_ACCOUNT_SID` | `(set in Render env)` | ✅ |
| `TWILIO_AUTH_TOKEN` | auth token for that account | ✅ (in hand) |
| `TWILIO_FROM_NUMBER` | `(10DLC sending number)` (Local · 10DLC, attached to MG) | ✅ |
| `TWILIO_MESSAGING_SERVICE_SID` | `(Messaging Service SID)` | ✅ |
| `TWILIO_VALIDATE_SIGNATURE` | `true` | set |
| `STRIPE_SECRET_KEY` | `sk_test_…` now → `sk_live_…` at launch | ✅ (test) |
| `STRIPE_PRICE_ID` | `(Stripe price ID)` | ✅ |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` — from Step 4 | ⏳ |
| `SENTRY_DSN` | leadarrow-api DSN | ✅ |
| `SMTP_HOST` | `smtp.resend.com` | set |
| `SMTP_PORT` | `587` | set |
| `SMTP_USER` | `resend` | set |
| `SMTP_PASS` | Resend API key (`re_…`) | ✅ |
| `SMTP_SECURE` | `false` | set |
| `MAIL_FROM` | `LeadArrow <no-reply@send.getleadarrow.com>` | ✅ (domain verified) |
| `PUSHOVER_APP_TOKEN` | Pushover app token | ✅ |
| `ROUTING_WORKER_ENABLED` | `true` | set |
| `SLACK_SIGNING_SECRET` / `SLACK_BOT_TOKEN` | only if Slack is in launch scope | optional |

## Step 3 — Point the web app at the live API (Vercel)

Add/update in the Vercel project env, then redeploy:

| Key | Value | Status |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://api.getleadarrow.com` | after API domain live |
| `NEXT_PUBLIC_SENTRY_DSN` | leadarrow-web DSN | ✅ |
| `NEXT_PUBLIC_CALENDLY_URL` | real booking link (optional) | ⏳ |

Then map `api.getleadarrow.com` (Render) via a CNAME at the registrar, alongside
the existing web records.

## Step 4 — Wire provider webhooks (after the API has a public URL)

- **Twilio → number config** (or the Messaging Service):
  - Voice "A call comes in" → `https://api.getleadarrow.com/v1/telephony/voice/*`
    (the ring answer/gather URLs the app already builds from `API_PUBLIC_URL`).
  - Messaging → `https://api.getleadarrow.com/v1/telephony/sms` (STOP/START record).
- **Stripe** → Developers → Webhooks → add endpoint
  `https://api.getleadarrow.com/v1/billing/webhook` → copy the signing secret into
  `STRIPE_WEBHOOK_SECRET` → redeploy. Test a checkout → subscription activation.
- **Slack** (if in scope) → Event Subscriptions request URL → the app's Slack
  events endpoint; install to workspace.

## Step 5 — Production QA (end-to-end on the live stack)

- Signup with an issued license key → account created, cookie set (Secure).
- Ingest a test lead → rep phone **rings** → press **1** → **accept SMS** arrives
  (through the Messaging Service; confirm STOP/HELP auto-reply works).
- Stripe test checkout → subscription active → gated features unlock.
- Password-reset email delivers (Resend).
- Admin dashboard loads; Sentry receives a test error.

## Step 6 — Go-live switches

- Swap Stripe **test → live** keys (and live Price ID); rotate Pushover + Resend
  keys (they traveled through chat).
- Set a strong admin password; confirm `noeviction` on Redis.
- Issue the first real customer's license key.
