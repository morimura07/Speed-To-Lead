# LeadArrow — Deploy Runbook (Render + Vercel)

Single-instance production deploy: **API on Render** (HTTP + WebSocket +
in-process workers), **web on Vercel**, **Neon** Postgres, **Upstash** Redis.

## 0. Prerequisites
- Push the repo to GitHub (Render + Vercel deploy from it).
- Neon Postgres + Upstash Redis (already provisioned). Set Upstash eviction to **`noeviction`**.
- A domain (e.g. `leadarrow.io`).

## 1. DNS (after the services exist — you'll get target hosts from Render/Vercel)
| Record | Host | Points to |
| --- | --- | --- |
| CNAME | `app` | your Vercel deployment (`cname.vercel-dns.com`) |
| CNAME | `api` | your Render service (`<svc>.onrender.com`) |

Both get automatic HTTPS (Render + Vercel manage certs).

## 2. Baseline the existing database (one time)
The current Neon DB was created with `db push`. Adopt migrations without data loss:
```bash
pnpm --filter @leadarrow/api exec prisma migrate resolve --applied 0_init
```
From then on, every deploy runs `prisma migrate deploy` (wired in `render.yaml`).

## 3. API on Render
1. **New → Blueprint** → point at the repo. Render reads [`render.yaml`](../render.yaml)
   and creates the `leadarrow-api` Docker service.
2. Fill the `sync: false` env vars in the dashboard:
   - `DATABASE_URL`, `REDIS_URL`
   - `APP_URL=https://app.<domain>`, `API_PUBLIC_URL=https://api.<domain>`, `CORS_ORIGINS=https://app.<domain>`
   - `PLATFORM_ADMIN_EMAIL`, `PLATFORM_ADMIN_PASSWORD` (real values)
   - Providers as you activate them (Twilio/Stripe/Slack/SMTP/Pushover)
3. Deploy. `preDeployCommand` runs migrations; health check is `/health/live`.
4. Add the custom domain `api.<domain>` in the service settings.
5. Seed the platform admin once (Render Shell): `pnpm --filter @leadarrow/api db:seed`.

## 4. Web on Vercel
1. **New Project** → import the repo → set **Root Directory = `apps/web`**.
   (Vercel reads [`apps/web/vercel.json`](../apps/web/vercel.json) for the monorepo build.)
2. Env var: `NEXT_PUBLIC_API_URL=https://api.<domain>`.
3. Deploy → add the custom domain `app.<domain>`.

## 5. Point providers at production URLs
- **Stripe** webhook → `https://api.<domain>/v1/billing/webhook` (copy the signing secret to `STRIPE_WEBHOOK_SECRET`).
- **Slack** Events Request URL → `https://api.<domain>/v1/slack/events`.
- **Twilio** uses `API_PUBLIC_URL` automatically for call/status callbacks — no console change needed.
- **CRM webhooks** are shown per-integration in the dashboard (already built off `API_PUBLIC_URL`).

## 6. Production notes
- With `NODE_ENV=production`, auth cookies are `SameSite=None; Secure` — works because
  everything is HTTPS. `app.<domain>` and `api.<domain>` are same-site under `<domain>`.
- **Scaling out later:** set web/API replicas `ROUTING_WORKER_ENABLED=false` and add one
  worker service with it `=true`; then add the Redis throttler + Socket.IO Redis adapter
  (Workstream C2) so rate limits and softphone presence work across instances.

## 7. Smoke test after deploy
`https://app.<domain>` loads → admin console → generate key → signup → connect a CRM →
send a signed lead → it appears in Leads → (with a real rep phone) the ring works →
subscribe via Stripe test mode.
