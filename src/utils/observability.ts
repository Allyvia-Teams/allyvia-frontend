// Error tracking (ALL-44).
//
// There was no error tracker in the frontend at all: a render crash or a failed
// API call left a blank screen for the user and no record anywhere. The backend
// half of this lives in app/allyvia/observability.py; both report the same
// release string so a frontend error and a backend traceback from the same
// deploy line up.

import * as Sentry from '@sentry/react';

/**
 * The revision this bundle was built from.
 *
 * Vite substitutes `import.meta.env.*` at build time; the deploy workflows pass
 * the commit SHA. 'unknown' is the honest answer for a local build -- the old
 * hardcoded VITE_APP_VERSION=v1.0.0 was worse than unknown, because during an
 * incident it looked like information.
 */
export function releaseVersion(): string {
  return (import.meta.env.VITE_APP_COMMIT_SHA as string | undefined)?.trim() || 'unknown';
}

export function environmentName(): string {
  return (import.meta.env.VITE_APP_ENVIRONMENT as string | undefined)?.trim() || 'local';
}

/**
 * Initialise Sentry if a DSN is configured. Returns true when it did.
 *
 * No DSN means no initialisation: local development and the test run must not
 * need Sentry to exist. Never throws -- an observability tool that can stop the
 * app rendering is a liability.
 */
export function initSentry(): boolean {
  const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined)?.trim();
  if (!dsn) return false;

  try {
    Sentry.init({
      dsn,
      release: releaseVersion(),
      environment: environmentName(),
      // Off by default. Tracing every route change is the fastest way to burn
      // a quota on a product nobody is debugging yet.
      tracesSampleRate: Number(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? 0) || 0,
      // This app renders merchant financials and customer contact rows. Sentry
      // must not become a second, unaudited copy of them, so no request bodies
      // and no automatic user identification.
      sendDefaultPii: false
    });
    return true;
  } catch (err) {
    console.error('Sentry initialisation failed', err);
    return false;
  }
}
