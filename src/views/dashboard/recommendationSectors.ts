// The one caption under the dashboard's single recommendation: where the rest
// of them live. Pure, and kept out of RecommendationCard on purpose — a
// counting/wording rule inside JSX is untestable in this repo (no jsdom), the
// same reason innerCircleHandoffLabel lives in a .ts file.
//
// `import type` only: importing api/agent.api for real would drag utils/axios
// into the test, which dies on sessionStorage under vitest.

import type { Sector } from 'api/agent.api';

/** The Inventory Insights tab that lists every inventory-sector recommendation. */
export const INVENTORY_RECOMMENDATIONS_HREF = '/inventory/insights?tab=recommendations';

/**
 * The sectors that have a page to send the reader to, in caption order.
 * `general` is absent: its rows (weather prep, category promotions, untyped
 * onboarding rows) have no home but the dashboard slot itself, so there is no
 * link to write for them.
 *
 * staffing and finance link to their sector's page. Neither page lists agent
 * recommendations yet (audit C4), so the link is to the sector, not to a list.
 */
export const SECTOR_DESTINATIONS: ReadonlyArray<{ sector: Exclude<Sector, 'general'>; label: string; href: string }> = [
  { sector: 'inventory', label: 'Inventory', href: INVENTORY_RECOMMENDATIONS_HREF },
  { sector: 'staffing', label: 'Scheduling', href: '/scheduling' },
  { sector: 'finance', label: 'Finance', href: '/finance' }
];

export interface SectorCaptionPart {
  sector: Sector;
  count: number;
  /** "3 more in Inventory" for the first part, "1 in Scheduling" after it. */
  text: string;
  href: string;
}

const countOf = (value: unknown): number => {
  const n = typeof value === 'number' ? value : Number.NaN;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
};

/**
 * The parts of "3 more in Inventory · 1 in Scheduling".
 *
 * `remaining` is the backend's `remaining_by_sector`, which counts the FULL
 * live set regardless of surface — so the row the dashboard is showing is in
 * its own sector's count. `shownSector` takes that one back out, because
 * "more" means "besides this one". Sectors left at 0 are omitted; a missing,
 * negative or non-numeric count reads as 0, never as a broken caption. An
 * absent `remaining` (a backend without the field) yields no parts at all.
 */
export function remainingSectorParts(
  remaining: Partial<Record<Sector, number>> | null | undefined,
  shownSector?: string | null
): SectorCaptionPart[] {
  if (!remaining) return [];
  const parts: SectorCaptionPart[] = [];
  for (const { sector, label, href } of SECTOR_DESTINATIONS) {
    const count = Math.max(0, countOf(remaining[sector]) - (shownSector === sector ? 1 : 0));
    if (count === 0) continue;
    const text = parts.length === 0 ? `${count} more in ${label}` : `${count} in ${label}`;
    parts.push({ sector, count, text, href });
  }
  return parts;
}

/** The whole caption as one string ("" when nothing remains); the card renders the parts as links. */
export function remainingSectorCaption(remaining: Partial<Record<Sector, number>> | null | undefined, shownSector?: string | null): string {
  return remainingSectorParts(remaining, shownSector)
    .map((part) => part.text)
    .join(' · ');
}
