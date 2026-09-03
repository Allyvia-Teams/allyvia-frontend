import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';
import { sanitizeLayouts } from './analyticsLayoutRules';

export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v1';

export type StoredAnalyticsLayouts = Record<AnalyticsTab, AnalyticsTabLayout>;

export type CachedLayoutEnvelope = {
  // Who the cache belongs to. Merchants share kiosk and back-office terminals,
  // so an un-owned cache would show the previous person's arrangement for the
  // moment before the account's real layout arrives from the server.
  owner: string | null;
  layouts: StoredAnalyticsLayouts;
};

export function getDefaultLayouts(): StoredAnalyticsLayouts {
  return sanitizeLayouts(DEFAULT_LAYOUTS);
}

// The signed-in identity as the auth context records it. Read defensively:
// storage throws in some privacy modes rather than returning null.
export function currentLayoutOwner(): string | null {
  try {
    return localStorage.getItem('email');
  } catch {
    return null;
  }
}

// Local cache only. The layout of record lives on the account
// (`/analytics/layout/`, ALL-144); this copy just avoids a flash of the default
// layout while that request is in flight, and keeps the tab usable offline.
//
// Returns the defaults unless the cache was written by the user who is signed
// in now.
export function loadStoredLayouts(): StoredAnalyticsLayouts {
  try {
    const raw = localStorage.getItem(ANALYTICS_LAYOUT_STORAGE_KEY);
    if (!raw) return getDefaultLayouts();

    const parsed = JSON.parse(raw) as Partial<CachedLayoutEnvelope>;
    if (!parsed || typeof parsed !== 'object' || !('layouts' in parsed)) {
      // Pre-envelope cache from an earlier build: no owner recorded, so it
      // cannot be attributed to this user. Discard rather than guess.
      return getDefaultLayouts();
    }

    if (parsed.owner !== currentLayoutOwner()) return getDefaultLayouts();

    return sanitizeLayouts(parsed.layouts);
  } catch {
    // Malformed JSON, or storage blocked in private mode.
    return getDefaultLayouts();
  }
}

export function saveStoredLayouts(layouts: StoredAnalyticsLayouts): void {
  try {
    const envelope: CachedLayoutEnvelope = { owner: currentLayoutOwner(), layouts };
    localStorage.setItem(ANALYTICS_LAYOUT_STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Ignore quota or privacy mode errors.
  }
}
