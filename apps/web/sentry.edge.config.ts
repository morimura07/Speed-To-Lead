import * as Sentry from '@sentry/nextjs';

// Edge runtime error tracking. Disabled when the DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
});
