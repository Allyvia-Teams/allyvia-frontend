import { AnalyticsAPI } from 'api/analytics.api';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import type { AnalyticsTab, AnalyticsTabLayout } from '../registry/types';
import { getLayoutWidgetRegistry, sanitizeLayouts } from './analyticsLayoutRules';
import { resetLayout, type LayoutV2 } from './layoutModel';

// Local cache key. The layout of record lives on the account
// (`/analytics/layout/`, ALL-144); this copy avoids a flash of the default
// layout while that request is in flight, and keeps the tab usable offline.
export const ANALYTICS_LAYOUT_STORAGE_KEY = 'allyvia_analytics_layout_v1';

/** How long to wait after the last change before writing to the server. */
export const SAVE_DEBOUNCE_MS = 600;

export type StoredAnalyticsLayouts = Record<AnalyticsTab, AnalyticsTabLayout>;

export type CachedLayoutEnvelope = {
  // Who the cache belongs to. Merchants share kiosk and back-office terminals,
  // so an un-owned cache would show the previous person's arrangement for the
  // moment before the account's real layout arrives from the server.
  owner: string | null;
  // LayoutV2 per tab (ALL-250). Older envelopes may still hold string[];
  // loadStoredLayouts runs them through sanitizeLayouts on read.
  layouts: StoredAnalyticsLayouts | Record<string, unknown>;
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

/**
 * Local cache only. Returns the defaults unless the cache was written by the
 * user who is signed in now. Always upgrades through sanitizeLayouts so v1
 * string[] and LayoutV2 both land as LayoutV2.
 */
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

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let pendingLayouts: StoredAnalyticsLayouts | null = null;

/** Test helper to clear the debounce timer between cases. */
export function resetRemoteSaveDebounce(): void {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  pendingLayouts = null;
}

/**
 * Debounced PUT via AnalyticsAPI.Layout.save (ALL-144). Coalesces rapid edits
 * (add three widgets → one request). Local cache is written by the caller.
 */
export function scheduleRemoteLayoutSave(layouts: StoredAnalyticsLayouts): void {
  pendingLayouts = layouts;

  if (saveTimer) {
    clearTimeout(saveTimer);
  }

  saveTimer = setTimeout(() => {
    const pending = pendingLayouts;
    pendingLayouts = null;
    saveTimer = null;
    if (!pending) return;

    AnalyticsAPI.Layout.save(pending).catch(() => {
      // Keep the local copy; the layout is a preference, not data the user
      // would lose work over, and a failed write should not interrupt them.
    });
  }, SAVE_DEBOUNCE_MS);
}

/** Build a LayoutV2 for a single tab from the default id list + registry sizes. */
export function defaultLayoutForTab(tab: AnalyticsTab): LayoutV2 {
  return resetLayout(getLayoutWidgetRegistry(), DEFAULT_LAYOUTS[tab]);
}
