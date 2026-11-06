// Pure view model for the top of the redesigned /insights page: what the
// subtitle says, which category chips exist and their counts, and the list the
// page renders under them. No React, so vitest can test it in node.

import { countByCategory, sortByImpact } from './adapter';
import { INSIGHT_CATEGORIES, type InsightCategory, type Recommendation } from './types';

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

/** "All <n>" first, then one chip per category that has at least one rec, in the fixed category order. */
export const categoryChips = (recs: readonly Recommendation[]): CategoryChip[] => {
  const counts = countByCategory(recs);
  return [
    { key: 'all', label: 'All', count: recs.length },
    ...INSIGHT_CATEGORIES.filter((c) => counts[c] > 0).map((c) => ({ key: c, label: CATEGORY_LABELS[c], count: counts[c] }))
  ];
};

/** A selected category with no recs left (all dismissed) falls back to All. */
export const effectiveFilter = (selected: CategoryFilter, chips: readonly CategoryChip[]): CategoryFilter =>
  chips.some((chip) => chip.key === selected) ? selected : 'all';

/** The list under the chips: filtered, then largest impact first. */
export const listedRecommendations = (recs: readonly Recommendation[], filter: CategoryFilter): Recommendation[] =>
  sortByImpact(filter === 'all' ? recs : recs.filter((rec) => rec.category === filter));

/** "+$1,140" for signed impacts, "$4,200" otherwise, "" for none. */
export const formatImpact = ({ amount, signed }: Recommendation['impact']): string => {
  if (!amount) return '';
  return `${signed ? '+' : ''}$${amount.toLocaleString('en-US')}`;
};
