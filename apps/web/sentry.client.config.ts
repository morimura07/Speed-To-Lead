import * as Sentry from '@sentry/nextjs';

// Browser error tracking. Disabled automatically when the DSN is unset.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 0.1,
});
