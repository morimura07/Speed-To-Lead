'use client';

import * as Sentry from '@sentry/nextjs';
import { useEffect } from 'react';

/** Catches React render errors app-wide and reports them to Sentry. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0a0b0e',
          color: '#f3f4f1',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
        }}
      >
        <div style={{ textAlign: 'center', padding: 24 }}>
          <p style={{ fontFamily: 'ui-monospace, monospace', letterSpacing: '0.3em', color: '#ff5a1f', fontSize: 12 }}>
            SOMETHING WENT WRONG
          </p>
          <h1 style={{ marginTop: 12, fontSize: 24, fontWeight: 600 }}>An unexpected error occurred</h1>
          <p style={{ marginTop: 8, color: '#8a8e9a', fontSize: 14 }}>Our team has been notified. Please try again.</p>
          <button
            onClick={() => window.location.reload()}
            style={{ marginTop: 24, height: 44, padding: '0 24px', borderRadius: 12, border: 'none', background: '#ff5a1f', color: '#0a0b0e', fontWeight: 600, cursor: 'pointer' }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
