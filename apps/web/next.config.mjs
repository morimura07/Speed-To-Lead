import { withSentryConfig } from '@sentry/nextjs';

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Transpile the shared workspace package so its TypeScript is bundled directly.
  transpilePackages: ['@leadarrow/shared'],
};

// Sentry wraps the build for error tracking. It's inert at runtime without a DSN;
// source-map upload only runs when SENTRY_AUTH_TOKEN/org/project are set.
export default withSentryConfig(nextConfig, {
  silent: true,
  // Generate source maps for readable stack traces, but don't ship them to users.
  sourcemaps: { deleteSourcemapsAfterUpload: true },
});
