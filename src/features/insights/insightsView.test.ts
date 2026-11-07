import { describe, expect, it } from 'vitest';

import {
  categoryChips,
  effectiveFilter,
  emptyMessage,
  formatImpact,
  insightsSubtitle,
  listedRecommendations,
  metaDetails,
  rationaleLabel,
  shortTitle,
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

  it('keeps a category whose cards are all dismissed, at 0, while the payload has it', () => {
    const visible = visibleRecommendations(recs, ['rec-linen-markdown']);
    expect(categoryChips(recs, visible).map((c) => `${c.key} ${c.count}`)).toEqual([
      'all 4',
      'inventory 1',
      'pricing 0',
      'staffing 1',
      'inner_circle 1',
      'cash 1'
    ]);
  });

  it('omits categories the loaded payload never had', () => {
    const loaded = recs.filter((r) => r.category !== 'pricing');
    expect(categoryChips(loaded).map((c) => c.key)).toEqual(['all', 'inventory', 'staffing', 'inner_circle', 'cash']);
  });

  it('keeps a selected category at 0, and falls back to All only when the chip is gone', () => {
    const chips = categoryChips(recs, visibleRecommendations(recs, ['rec-linen-markdown']));
    expect(effectiveFilter('pricing', chips)).toBe('pricing');
    const reloaded = categoryChips(recs.filter((r) => r.category !== 'pricing'));
    expect(effectiveFilter('pricing', reloaded)).toBe('all');
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

describe('card text', () => {
  it('builds the meta line after the category, dropping an empty deadline', () => {
    expect(metaDetails({ deadline: 'Order by 5 PM today', confidence: 'high' })).toEqual(['Order by 5 PM today', 'High confidence']);
    expect(metaDetails({ deadline: '', confidence: 'medium' })).toEqual(['Medium confidence']);
  });

  it('counts facts on the rationale toggle', () => {
    expect(rationaleLabel(6)).toBe('See rationale and 6 facts');
    expect(rationaleLabel(1)).toBe('See rationale and 1 fact');
    expect(rationaleLabel(0)).toBe('See rationale');
  });

  it('shortens long titles at a word for the undo toast', () => {
    expect(shortTitle('Add shift')).toBe('Add shift');
    expect(shortTitle('Add a second associate Saturday, 11 AM to 3 PM')).toBe('Add a second associate Saturday, 11 AM…');
    expect(shortTitle('Invite 38 lapsed Inner Circle members to your holiday preview')).toBe('Invite 38 lapsed Inner Circle members…');
  });

  it('words the two empty states', () => {
    expect(emptyMessage(3, 'inventory')).toBe('Nothing left in Inventory this week.');
    expect(emptyMessage(0, 'inventory')).toBe('You are caught up. New recommendations arrive each morning.');
    expect(emptyMessage(0, 'all')).toBe('You are caught up. New recommendations arrive each morning.');
  });
});
