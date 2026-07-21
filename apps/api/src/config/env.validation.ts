import { z } from 'zod';

/**
 * Boolean parsed from an environment string. Anything but "false"/"0"/"no"
 * (case-insensitive) is treated as true; an absent value uses `defaultValue`.
 */
function zBool(defaultValue: boolean) {
  return z
    .string()
    .optional()
    .transform((v) => {
      if (v === undefined) return defaultValue;
      return !['false', '0', 'no'].includes(v.trim().toLowerCase());
    });
}

/**
 * Strict environment schema. The application refuses to boot if required
 * variables are missing or malformed — failing fast is safer than running
 * a half-configured server.
 */
export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  // Comma-separated list of allowed CORS origins (e.g. the web dashboard).
  CORS_ORIGINS: z
    .string()
    .default('http://localhost:3000')
    .transform((value) =>
      value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),

  // Datastores — wired up in Phase 0 (Prisma) and used from Phase 2 onward.
  // Optional for now so the skeleton boots before infra exists locally.
  DATABASE_URL: z.string().url().optional(),
  REDIS_URL: z.string().url().optional(),

  // Public base URL of the web app (used to build password-reset links).
  APP_URL: z.string().url().default('http://localhost:3000'),

  // ── Email (optional) ────────────────────────────────────────────────────────
  // SMTP transport for transactional mail (password resets, license keys, billing
  // confirmations). Works with any provider (SES, Postmark, Mailgun, …). When
  // SMTP_HOST is unset, mail is logged to the console instead of sent.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: zBool(false), // true for port 465 (implicit TLS)
  MAIL_FROM: z.string().default('LeadArrow <noreply@leadarrow.local>'),

  // Public base URL of this API (used to build inbound CRM webhook URLs).
  API_PUBLIC_URL: z.string().url().default('http://localhost:4000'),

  // ── Auth (Phase 1) ─────────────────────────────────────────────────────────
  // Separate secrets for access vs refresh tokens so leaking one is contained.
  JWT_ACCESS_SECRET: z.string().min(16).default('dev-access-secret-change-me-please'),
  JWT_REFRESH_SECRET: z.string().min(16).default('dev-refresh-secret-change-me-please'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('30d'),

  // Platform admin seeded by `prisma db seed` / the seed script.
  PLATFORM_ADMIN_EMAIL: z.string().email().default('admin@leadarrow.local'),
  PLATFORM_ADMIN_PASSWORD: z.string().min(8).default('changeme-admin-123'),
  PLATFORM_ADMIN_NAME: z.string().default('LeadArrow Admin'),

  // ── Telephony (Phase 3) ─────────────────────────────────────────────────────
  // Optional so the app boots without Twilio; outbound calls/SMS no-op until set.
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  // A2P 10DLC: the Messaging Service the approved campaign is attached to. When
  // set, SMS is sent through this service (not the bare from-number) so messages
  // are associated with the campaign and Twilio's Advanced Opt-Out (STOP/HELP
  // auto-replies) applies. Falls back to TWILIO_FROM_NUMBER when unset.
  TWILIO_MESSAGING_SERVICE_SID: z.string().optional(),
  // Validate inbound Twilio webhook signatures. Auto-skips when no auth token
  // is configured (local dev). Set to "false" to force-disable.
  TWILIO_VALIDATE_SIGNATURE: zBool(true),
  // Seconds a rep's phone rings before the call is treated as no-answer.
  RING_TIMEOUT_SECONDS: z.coerce.number().int().min(5).max(120).default(25),

  // Pushover (Phase 4) — optional emergency push channel. App token from
  // https://pushover.net. Per-rep user keys are stored on the rep.
  PUSHOVER_APP_TOKEN: z.string().optional(),

  // Slack (Phase 7) — one app installed across workspaces. Signing secret
  // verifies inbound Events API requests; team_id maps an event to an org.
  SLACK_SIGNING_SECRET: z.string().optional(),
  SLACK_BOT_TOKEN: z.string().optional(),

  // Billing (Phase 8) — Stripe. Optional so the app boots without billing;
  // checkout/subscription flows are unavailable until configured.
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  STRIPE_PRICE_ID: z.string().optional(),

  // Error tracking (optional). Read directly by instrument.ts before this runs;
  // declared here so it isn't stripped as an unknown var.
  SENTRY_DSN: z.string().optional(),

  // ── Routing worker (Phase 3) ────────────────────────────────────────────────
  // The BullMQ worker that consumes the lead-routing queue. Disable on
  // web-only/processes without Redis (and in tests).
  ROUTING_WORKER_ENABLED: zBool(true),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validator passed to `@nestjs/config`. Throws a readable, aggregated error
 * when the environment is invalid.
 */
export function validateEnv(config: Record<string, unknown>): Env {
  const parsed = envSchema.safeParse(config);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => `  - ${issue.path.join('.') || '(root)'}: ${issue.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }

  return parsed.data;
}
