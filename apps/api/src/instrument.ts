import * as Sentry from '@sentry/node';

// Initialize Sentry as early as possible (imported first in main.ts). Gated on
// SENTRY_DSN — a no-op in dev / when unconfigured.
const dsn = process.env.SENTRY_DSN;
if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV ?? 'development',
    tracesSampleRate: 0.1,
  });
}
