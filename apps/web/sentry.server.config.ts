import * as Sentry from '@sentry/nextjs';

// Server (Node runtime) error tracking. Disabled when the DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
