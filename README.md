# LeadArrow

**Speed-to-lead platform for high-ticket sales teams.** The instant a lead enters a
CRM (Close, GoHighLevel, Salesforce, HubSpot) or a Slack channel, LeadArrow rings the
right sales rep — across mobile, a Chrome softphone, and push — and connects them in
seconds. Reps press **1 to accept / 2 to decline**; declines and timeouts cascade to the
next eligible rep.

> **Status:** Phase 7 — Slack booking alerts (triage/closer) + Slack lead source +
> availability-aware follow-up reminder calls. **Phases 0–7 complete.**
> See [`docs/ROADMAP.md`](docs/ROADMAP.md)
>
> Note: follow-up reminders use BullMQ **delayed** jobs, which require Redis
> `noeviction`. On Upstash set Configuration → Eviction → `noeviction`.
> for the phased build plan and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
> system design.

## Tech stack

| Layer | Technology |
| --- | --- |
| Backend API | NestJS (TypeScript) |
| Database | PostgreSQL + Prisma |
| Queue / cache | Redis + BullMQ *(added in Phase 3)* |
| Web dashboard | Next.js 15 + React 19 + Tailwind v4 |
| Browser softphone | Chrome extension (Manifest V3) + Twilio Voice SDK *(Phase 4)* |
| Telephony | Twilio *(Phase 3)* |
| Payments | Stripe *(Phase 8)* |
| Monorepo | pnpm workspaces + Turborepo |

## Repository layout

```
leadarrow/
├── apps/
│   ├── api/         # NestJS backend (config, logging, health, Prisma)
│   ├── web/         # Next.js dashboard + marketing site
│   └── extension/   # Chrome MV3 softphone (skeleton)
├── packages/
│   └── shared/      # Cross-cutting TypeScript types (enums, event catalog)
├── docs/            # ARCHITECTURE.md, ROADMAP.md
├── docker-compose.yml  # local Postgres + Redis
└── turbo.json       # task orchestration
```

## Prerequisites

- **Node.js** ≥ 22  (`.nvmrc` pins 22)
- **pnpm** ≥ 11  (`npm i -g pnpm`)
- **Docker** (for local Postgres + Redis) — or your own Postgres/Redis instances

## Setup

```bash
# 1. Install all workspace dependencies (also generates the Prisma client)
pnpm install

# 2. Create env files from templates
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local

# 3. Start local datastores
docker compose up -d        # Postgres :5432, Redis :6379

# 4. Apply the database schema
pnpm --filter @leadarrow/api prisma:migrate

# 5. Seed the platform admin (reads PLATFORM_ADMIN_* from apps/api/.env)
pnpm --filter @leadarrow/api db:seed
```

After seeding, sign in to the admin console at `http://localhost:3000/admin/login`
(default `admin@leadarrow.local` / `changeme-admin-123` — change these in `.env`),
generate a license key, then use it to create a company account at `/signup`.

## Run (development)

```bash
pnpm dev                    # runs every app via Turborepo
```

Individual apps:

```bash
pnpm --filter @leadarrow/api dev    # API  → http://localhost:4000  (health: /health)
pnpm --filter @leadarrow/web dev    # Web  → http://localhost:3000
```

Load the extension: `pnpm --filter @leadarrow/extension build`, then **Load unpacked**
(`apps/extension/dist`) at `chrome://extensions` with Developer mode on.

## Quality gates

```bash
pnpm lint          # ESLint across all packages
pnpm typecheck     # tsc --noEmit across all packages
pnpm test          # unit tests
pnpm build         # production build of every app/package
pnpm format        # Prettier write
```

These are the same checks CI runs (`.github/workflows/ci.yml`).

## Environment variables

| Variable | Used by | Description |
| --- | --- | --- |
| `NODE_ENV` | all | `development` \| `test` \| `production` |
| `PORT` | api | API port (default `4000`) |
| `LOG_LEVEL` | api | Pino log level |
| `CORS_ORIGINS` | api | Comma-separated allowed origins |
| `DATABASE_URL` | api | Postgres connection string |
| `REDIS_URL` | api | Redis connection string |
| `NEXT_PUBLIC_API_URL` | web | Base URL of the API |

The API validates its environment on boot (`apps/api/src/config/env.validation.ts`)
and refuses to start if configuration is invalid.

## Deployment (outline)

- **API** — container image (`node dist/main.js`); run `pnpm --filter @leadarrow/api prisma:deploy`
  on release to apply migrations. Provide `DATABASE_URL`, `REDIS_URL`, and `CORS_ORIGINS`.
- **Web** — `pnpm --filter @leadarrow/web build` → deploy to any Next.js host (Vercel, or
  a Node container via `next start`).
- **Datastores** — managed Postgres + Redis.

Detailed, provider-specific deployment docs are added as the platform matures.

## License

Proprietary — © LeadArrow. All rights reserved.
