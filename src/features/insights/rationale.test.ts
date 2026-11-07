import { describe, expect, it, vi } from 'vitest';

import { factSourceTheme } from './categoryTheme';
import { INSIGHTS_MOCK } from './mock/insights.mock';
import {
  builtFromLine,
  closeRationale,
  createDetailCache,
  panelScrollDelta,
  panelTopOffScreen,
  rationaleCounts,
  toggleOpen
} from './rationale';
import { INSIGHT_CATEGORIES, type FactSource } from './types';

const mara = INSIGHTS_MOCK.recommendations[0];
const detail = { rationale: mara.rationale, facts: mara.facts, signalCount: mara.signalCount };

describe('open cards', () => {
  it('opens several cards at once and closes one without touching the others', () => {
    const both = toggleOpen(toggleOpen([], 'rec-mara-reorder'), 'rec-spring-deposit');
    expect(both).toEqual(['rec-mara-reorder', 'rec-spring-deposit']);
    expect(toggleOpen(both, 'rec-mara-reorder')).toEqual(['rec-spring-deposit']);
  });

  it('closes a card when it is dismissed, so undo brings it back collapsed', () => {
    expect(closeRationale(['a', 'b'], 'a')).toEqual(['b']);
    expect(closeRationale(['b'], 'a')).toEqual(['b']);
  });
});

describe('detail cache', () => {
  it('fetches each id once across collapse and re-expand', async () => {
    const fetch = vi.fn(() => Promise.resolve(detail));
    const cache = createDetailCache(fetch);
    await cache.get('rec-mara-reorder');
    await cache.get('rec-mara-reorder');
    await cache.get('rec-spring-deposit');
    expect(fetch.mock.calls).toEqual([['rec-mara-reorder'], ['rec-spring-deposit']]);
  });

  it('shares one request between calls made while it is pending', async () => {
    let resolve: (value: typeof detail) => void = () => undefined;
    const fetch = vi.fn(() => new Promise<typeof detail>((r) => (resolve = r)));
    const cache = createDetailCache(fetch);
    const first = cache.get('p1');
    const second = cache.get('p1');
    resolve(detail);
    expect(await first).toBe(await second);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('forgets a failed request, so Retry fetches again', async () => {
    const fetch = vi.fn().mockRejectedValueOnce(new Error('boom')).mockResolvedValueOnce(detail);
    const cache = createDetailCache(fetch);
    await expect(cache.get('p1')).rejects.toThrow('boom');
    await expect(cache.get('p1')).resolves.toBe(detail);
    expect(fetch).toHaveBeenCalledTimes(2);
  });
});

describe('rationale counts', () => {
  it('uses the card’s own counts until the detail loads, then the detail’s', () => {
    const live = { ...mara, facts: [], signalCount: 3 };
    expect(rationaleCounts(live, undefined)).toEqual({ factCount: 0, signalCount: 3 });
    expect(rationaleCounts(live, { status: 'loading' })).toEqual({ factCount: 0, signalCount: 3 });
    expect(rationaleCounts(live, { status: 'ready', detail: { ...detail, signalCount: 2 } })).toEqual({ factCount: 6, signalCount: 2 });
  });
});

describe('panel footer', () => {
  it('reads "Built from 6 signals · last checked 7:02 AM"', () => {
    expect(builtFromLine(6, '7:02 AM')).toBe('Built from 6 signals · last checked 7:02 AM');
    expect(builtFromLine(1, '7:02 AM')).toBe('Built from 1 signal · last checked 7:02 AM');
  });

  it('drops a part it has nothing for', () => {
    expect(builtFromLine(4, '')).toBe('Built from 4 signals');
    expect(builtFromLine(0, '7:02 AM')).toBe('Last checked 7:02 AM');
    expect(builtFromLine(0, '')).toBe('');
  });
});

describe('scrolling an opened panel into view', () => {
  it('scrolls only when the panel’s top is off screen', () => {
    expect(panelTopOffScreen(400, 800)).toBe(false);
    expect(panelTopOffScreen(0, 800)).toBe(false);
    expect(panelTopOffScreen(752, 800)).toBe(false);
    expect(panelTopOffScreen(800, 800)).toBe(true);
    expect(panelTopOffScreen(900, 800)).toBe(true);
    expect(panelTopOffScreen(-10, 800)).toBe(true);
  });

  it('scrolls an off-screen panel to a third of the way down, clear of the fixed header', () => {
    expect(panelScrollDelta(400, 900)).toBe(0);
    expect(panelScrollDelta(880, 900)).toBe(580);
    expect(panelScrollDelta(-60, 900)).toBe(-360);
  });

  it('counts a sliver at the bottom edge as off screen: less than 48px of the panel would show', () => {
    expect(panelTopOffScreen(753, 800)).toBe(true);
    expect(panelTopOffScreen(789, 800)).toBe(true);
  });
});

describe('fact source theme', () => {
  it('names and colors every fact source', () => {
    const sources: FactSource[] = [
      'sales_history',
      'inventory',
      'weather',
      'local_events',
      'staffing',
      'pricing',
      'inner_circle',
      'cash',
      'vendor_terms'
    ];
    expect(sources.map((s) => factSourceTheme[s].label)).toEqual([
      'Sales history',
      'Inventory',
      'Weather',
      'Local events',
      'Staffing',
      'Pricing',
      'Inner Circle',
      'Cash',
      'Vendor terms'
    ]);
    expect(Object.keys(factSourceTheme).sort()).toEqual([...sources].sort());
  });

  it('keeps every source label at 4.5:1 on white, as the category labels are', () => {
    const luminance = (hex: string) => {
      const [r, g, b] = [1, 3, 5]
        .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
        .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    for (const style of Object.values(factSourceTheme)) {
      expect(1.05 / (luminance(style.text) + 0.05)).toBeGreaterThanOrEqual(4.5);
    }
    expect(INSIGHT_CATEGORIES).toHaveLength(5);
  });
});
