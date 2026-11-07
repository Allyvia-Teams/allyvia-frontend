// The rationale panel's state (S4), pure so it is tested in node: which cards
// are open, the per-id detail cache, and the panel's small text helpers.
//
// Open state is local to the page and never persisted. A card's detail is
// fetched on its first expand and kept for the page's lifetime, so collapsing
// and re-expanding does not refetch; a failed fetch is forgotten so Retry can
// try again.

import type { Recommendation } from './types';

export type InsightDetail = Pick<Recommendation, 'rationale' | 'facts' | 'signalCount'>;

export type DetailLoad = { status: 'loading' } | { status: 'error' } | { status: 'ready'; detail: InsightDetail };

/** Open `id` if it is closed, close it if it is open. Other open cards stay open. */
export const toggleOpen = (openIds: readonly string[], id: string): string[] =>
  openIds.includes(id) ? openIds.filter((open) => open !== id) : [...openIds, id];

/** A dismissed card closes, so Undo brings it back collapsed. */
export const closeRationale = (openIds: readonly string[], id: string): string[] => openIds.filter((open) => open !== id);

export interface DetailCache {
  get: (id: string) => Promise<InsightDetail>;
}

/** One request per id for the cache's lifetime; concurrent calls share it, a failure is dropped. */
export function createDetailCache(fetchDetail: (id: string) => Promise<InsightDetail>): DetailCache {
  const requests = new Map<string, Promise<InsightDetail>>();
  return {
    get(id) {
      const known = requests.get(id);
      if (known) return known;
      const request = fetchDetail(id);
      requests.set(id, request);
      request.catch(() => {
        if (requests.get(id) === request) requests.delete(id);
      });
      return request;
    }
  };
}

/** What the toggle counts: the card's own numbers until its detail has loaded, then the detail's. */
export const rationaleCounts = (rec: Pick<Recommendation, 'facts' | 'signalCount'>, load: DetailLoad | undefined) =>
  load?.status === 'ready'
    ? { factCount: load.detail.facts.length, signalCount: load.detail.signalCount }
    : { factCount: rec.facts.length, signalCount: rec.signalCount };

/** "Built from 6 signals · last checked 7:02 AM"; a part with nothing behind it drops out. */
export const builtFromLine = (signalCount: number, lastChecked: string): string => {
  const checked = lastChecked.trim();
  if (signalCount > 0) {
    const built = `Built from ${signalCount} ${signalCount === 1 ? 'signal' : 'signals'}`;
    return checked ? `${built} · last checked ${checked}` : built;
  }
  return checked ? `Last checked ${checked}` : '';
};

/** Less than this much of a panel showing at the bottom edge is not "on screen": nothing in it is readable yet. */
export const PANEL_VISIBLE_MIN_PX = 48;

/** Scroll an opened panel into view only when its top edge is outside the viewport (or only a sliver shows). */
export const panelTopOffScreen = (panelTop: number, viewportHeight: number): boolean =>
  panelTop < 0 || panelTop > viewportHeight - PANEL_VISIBLE_MIN_PX;

/**
 * How far to scroll the window so an opened panel shows: 0 when its top is on
 * screen, else enough to put its top a third of the way down the viewport
 * (clear of the app's fixed header, with the card's footer still in view).
 */
export const panelScrollDelta = (panelTop: number, viewportHeight: number): number =>
  panelTopOffScreen(panelTop, viewportHeight) ? Math.round(panelTop - viewportHeight / 3) : 0;
