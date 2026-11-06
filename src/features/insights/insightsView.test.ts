import { describe, expect, it } from 'vitest';

import {
  categoryChips,
  effectiveFilter,
  formatImpact,
  insightsSubtitle,
  listedRecommendations,
  visibleRecommendations
} from './insightsView';
import { INSIGHTS_MOCK } from './mock/insights.mock';

const recs = INSIGHTS_MOCK.recommendations;

describe('insightsSubtitle', () => {
  it('reads the count of recs and the refresh time, joined by a middle dot', () => {
    expect(insightsSubtitle(5, 'today at 7:02 AM')).toBe('5 recommendations for this week · refreshed today at 7:02 AM');
  });

  it('is singular for one and drops the refresh part when unknown', () => {
    expect(insightsSubtitle(1, 'today at 7:02 AM')).toBe('1 recommendation for this week · refreshed today at 7:02 AM');
    expect(insightsSubtitle(0, '')).toBe('0 recommendations for this week');
  });

  it('counts only recs that are not dismissed', () => {
    const visible = visibleRecommendations(recs, ['rec-mara-reorder', 'rec-spring-deposit']);
    expect(insightsSubtitle(visible.length, INSIGHTS_MOCK.refreshedAt)).toBe(
      '3 recommendations for this week · refreshed today at 7:02 AM'
    );
  });
});

describe('categoryChips', () => {
  it('is All 5 then one chip per category in the fixed order', () => {
    expect(categoryChips(recs).map((c) => `${c.label} ${c.count}`)).toEqual([
      'All 5',
      'Inventory 1',
      'Pricing 1',
      'Staffing 1',
      'Inner Circle 1',
      'Cash 1'
    ]);
  });

  it('omits categories with no recs left', () => {
    const visible = visibleRecommendations(recs, ['rec-linen-markdown']);
    expect(categoryChips(visible).map((c) => c.key)).toEqual(['all', 'inventory', 'staffing', 'inner_circle', 'cash']);
  });

  it('falls back to All when the selected category is gone', () => {
    const chips = categoryChips(visibleRecommendations(recs, ['rec-linen-markdown']));
    expect(effectiveFilter('pricing', chips)).toBe('all');
    expect(effectiveFilter('cash', chips)).toBe('cash');
  });
});

describe('listedRecommendations', () => {
  it('lists all five by impact under All', () => {
    expect(listedRecommendations(recs, 'all').map((r) => r.id)).toEqual([
      'rec-spring-deposit',
      'rec-linen-markdown',
      'rec-inner-circle-invite',
      'rec-mara-reorder',
      'rec-saturday-shift'
    ]);
  });

  it('shows only the linen dresses under Pricing', () => {
    expect(listedRecommendations(recs, 'pricing').map((r) => r.title)).toEqual(['Mark down 42 summer linen dresses by 30%']);
  });
});

describe('formatImpact', () => {
  it('signs gains and leaves held cash unsigned', () => {
    expect(formatImpact({ amount: 1140, label: '', signed: true })).toBe('+$1,140');
    expect(formatImpact({ amount: 4200, label: '', signed: false })).toBe('$4,200');
    expect(formatImpact({ amount: 0, label: '', signed: false })).toBe('');
  });
});
