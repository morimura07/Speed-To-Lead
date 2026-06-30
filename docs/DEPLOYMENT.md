# LeadArrow — Deployment & Scaling

This covers taking LeadArrow from local dev to a production deployment. The
architecture is async and queue-driven, so it scales horizontally with a couple
of caveats noted below.

## Components to run

| Component | What | Notes |
| --- | --- | --- |
| **API** (`apps/api`) | NestJS HTTP + WebSocket + (optionally) the BullMQ workers | `node dist/main.js` |
| **Web** (`apps/web`) | Next.js dashboard + marketing site | `next start` or a static/SSR host (Vercel) |
| **Postgres** | Primary datastore | Managed (Neon, RDS, Cloud SQL) |
| **Redis** | BullMQ queues (routing + reminders) | Managed (Upstash, ElastiCache). **Must be `noeviction`** |

## Environment

Set the variables from [`apps/api/.env.example`](../apps/api/.env.example). The
required ones in production:

- `DATABASE_URL`, `REDIS_URL`
- `APP_URL` (web origin), `API_PUBLIC_URL` (public API origin — used to build CRM
  webhook URLs and Twilio callback URLs), `CORS_ORIGINS`
- Strong `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET`
- Provider credentials as needed: `TWILIO_*`, `STRIPE_*`, `SLACK_*`, `PUSHOVER_APP_TOKEN`,
  Google Calendar (when wired).

Every external provider is **gated**: the app boots and runs without it; the
corresponding feature is simply unavailable until its keys are set.

## Database migrations

Local prototyping uses `prisma db push`. Production uses a migration history:

```bash
# Fresh database — apply the baseline (and any later) migrations:
pnpm --filter @leadarrow/api prisma:deploy        # prisma migrate deploy

# Existing database already created via db push (e.g. the current Neon DB) —
# baseline it once so future migrations apply cleanly:
pnpm --filter @leadarrow/api exec prisma migrate resolve --applied 0_init
```

New schema changes: `prisma migrate dev --name <change>` in development (commits a
new folder under `prisma/migrations/`), then `prisma:deploy` on release.

## Build & run

```bash
pnpm install --frozen-lockfile
pnpm --filter @leadarrow/api prisma:generate
pnpm build                                  # builds api + web + shared
node apps/api/dist/main.js                  # API
pnpm --filter @leadarrow/web start          # web
```

A `Dockerfile` per app (multi-stage: install → build → run `dist`) is the
recommended packaging; both are plain Node services.

## Scaling notes

- **Separate the workers (recommended at scale).** The routing + reminder workers
  run in-process when `ROUTING_WORKER_ENABLED=true`. For independent scaling, run
  the **web/API replicas with `ROUTING_WORKER_ENABLED=false`** and a **dedicated
  worker deployment with it `=true`**. The producers (queue `add`) work from any
  replica; BullMQ guarantees a job runs once across all workers.
- **Redis must be `noeviction`.** BullMQ relies on its keys not being evicted;
  delayed jobs (follow-up reminders) silently fail to fire otherwise. On Upstash:
  Database → Configuration → Eviction → `noeviction`.
- **WebSocket presence is per-instance.** Rep extension connections are tracked in
  memory on the instance they connect to, and the routing engine emits to the
  Socket.IO room. Behind multiple API instances, enable the Socket.IO Redis
  adapter so room emits fan out across instances (single instance needs nothing).
- **Rate limiting is in-memory.** The global throttler uses per-instance memory.
  For correct limits across replicas, configure the throttler's Redis storage.
- **Idempotency is built in.** CRM webhooks dedupe on `(orgId, source, externalId)`;
  the routing state machine claims attempt transitions atomically; Stripe/Twilio/
  Slack webhooks are signature-verified. Retries and duplicates are safe.

## Health checks

- `GET /health/live` — liveness (process up).
- `GET /health` — readiness (database reachable).
