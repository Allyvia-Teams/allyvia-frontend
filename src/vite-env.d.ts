/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Insights redesign: `off` | `mock` | `live`. Unset = `mock` under vite dev, `off` in builds. See src/features/insights/flag.ts. */
  readonly VITE_INSIGHTS_REDESIGN?: 'off' | 'mock' | 'live';
  /** Stripe publishable key (pk_test_/pk_live_) for Financial Connections. Must match the backend's STRIPE_SECRET_KEY mode. */
  readonly VITE_STRIPE_PUBLISHABLE_KEY?: string;
}
