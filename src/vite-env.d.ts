/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Insights redesign: `off` | `mock` | `live`. Unset = `mock` under vite dev, `off` in builds. See src/features/insights/flag.ts. */
  readonly VITE_INSIGHTS_REDESIGN?: 'off' | 'mock' | 'live';
}
