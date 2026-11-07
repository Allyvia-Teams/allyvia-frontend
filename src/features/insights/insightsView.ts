// Pure view model for the top of the redesigned /insights page: what the
// subtitle says, which category chips exist and their counts, and the list the
// page renders under them. No React, so vitest can test it in node.

import { countByCategory, sortByImpact } from './adapter';
import { INSIGHT_CATEGORIES, type Confidence, type InsightCategory, type Recommendation } from './types';

export const CATEGORY_LABELS: Record<InsightCategory, string> = {
  inventory: 'Inventory',
  pricing: 'Pricing',
  staffing: 'Staffing',
  inner_circle: 'Inner Circle',
  cash: 'Cash'
};

/** 'all' or one category. */
export type CategoryFilter = 'all' | InsightCategory;

export interface CategoryChip {
  key: CategoryFilter;
  label: string;
  count: number;
}

/** The recs still on the page: everything not dismissed. */
export const visibleRecommendations = (recs: readonly Recommendation[], dismissedIds: readonly string[]): Recommendation[] => {
  const dismissed = new Set(dismissedIds);
  return recs.filter((rec) => !dismissed.has(rec.id));
};

/** "5 recommendations for this week · refreshed today at 7:02 AM". */
export const insightsSubtitle = (count: number, refreshedAt: string): string => {
  const noun = count === 1 ? 'recommendation' : 'recommendations';
  const head = `${count} ${noun} for this week`;
  return refreshedAt ? `${head} · refreshed ${refreshedAt}` : head;
};

/**
 * "All <n>" first, then one chip per category the loaded payload has, in the
 * fixed category order. Counts come from `visible` (what is not dismissed), so
 * a category whose last card is dismissed keeps its chip at 0 until the next
 * load re-derives the set from a fresh payload.
 */
export const categoryChips = (loaded: readonly Recommendation[], visible: readonly Recommendation[] = loaded): CategoryChip[] => {
  const present = countByCategory(loaded);
  const counts = countByCategory(visible);
  return [
    { key: 'all', label: 'All', count: visible.length },
    ...INSIGHT_CATEGORIES.filter((c) => present[c] > 0).map((c) => ({ key: c, label: CATEGORY_LABELS[c], count: counts[c] }))
  ];
};

/** A selected category that is not among the chips (a reload dropped it) falls back to All. */
export const effectiveFilter = (selected: CategoryFilter, chips: readonly CategoryChip[]): CategoryFilter =>
  chips.some((chip) => chip.key === selected) ? selected : 'all';

/**
 * The list under the chips: filtered, largest impact first, then every card
 * acted on (S5) moved after the ones not yet acted on, still by impact among
 * themselves.
 */
export const listedRecommendations = (
  recs: readonly Recommendation[],
  filter: CategoryFilter,
  actedIds: readonly string[] = []
): Recommendation[] => {
  const sorted = sortByImpact(filter === 'all' ? recs : recs.filter((rec) => rec.category === filter));
  const acted = new Set(actedIds);
  return [...sorted.filter((rec) => !acted.has(rec.id)), ...sorted.filter((rec) => acted.has(rec.id))];
};

/** "+$1,140" for signed impacts, "$4,200" otherwise, "" for none. */
export const formatImpact = ({ amount, signed }: Recommendation['impact']): string => {
  if (!amount) return '';
  return `${signed ? '+' : ''}$${amount.toLocaleString('en-US')}`;
};

export const CONFIDENCE_LABELS: Record<Confidence, string> = { high: 'High', medium: 'Medium', low: 'Low' };

/** The card's meta line after the category: "Order by 5 PM today · High confidence". Empty parts drop out. */
export const metaDetails = (rec: Pick<Recommendation, 'deadline' | 'confidence'>): string[] =>
  [rec.deadline.trim(), `${CONFIDENCE_LABELS[rec.confidence]} confidence`].filter(Boolean);

const counted = (n: number, noun: string) => `See rationale and ${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * "See rationale and 6 facts". Live cards carry no facts until
 * getInsightDetail(id) resolves, so until then they count signals ("See
 * rationale and 3 signals"); with neither it is just "See rationale".
 */
export const rationaleLabel = (factCount: number, signalCount: number): string => {
  if (factCount > 0) return counted(factCount, 'fact');
  if (signalCount > 0) return counted(signalCount, 'signal');
  return 'See rationale';
};

/**
 * A title short enough for the undo toast: cut at the last word boundary
 * before `max` characters, with an ellipsis. Short titles pass through.
 */
export const shortTitle = (title: string, max = 40): string => {
  const clean = title.trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > max / 2 ? cut.slice(0, lastSpace) : cut).replace(/[\s,.;:·-]+$/, '')}…`;
};

/** What the empty list says: everything dismissed, or nothing left under the selected chip. */
export const emptyMessage = (visibleCount: number, filter: CategoryFilter): string =>
  visibleCount === 0 || filter === 'all'
    ? 'You are caught up. New recommendations arrive each morning.'
    : `Nothing left in ${CATEGORY_LABELS[filter]} this week.`;
