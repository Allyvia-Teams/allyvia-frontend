import { describe, expect, it } from 'vitest';

import type { SharedMemo } from 'api/buying.api';

import { SECTION_ORDER } from './memo';
import { sharedMemoView } from './sharedMemo';

const BASE = 'http://127.0.0.1:8069/api/v1/';

const shared = (): SharedMemo => ({
  version: 1,
  audience: 'shared',
  as_of: '2027-02-28',
  plan: {
    name: 'Spring 27',
    season_label: 'SS27',
    store: 'Main',
    target_date: '2027-03-01',
    window_start: '2027-04-05',
    window_end: '2027-06-27'
  },
  cover: 'Spring 27 for Main: order by 1 Mar 2027.',
  basis: 'The forecast is measured but unproven here.',
  totals: {
    units: { amount: '88', unit: 'units', low: null, high: null },
    expected_revenue: { amount: '8400.00', unit: 'usd', low: '7100.00', high: '9800.00' }
  },
  months: {
    sentence: 'The window, month by month.',
    value: { amount: '45000.00', unit: 'usd', low: null, high: null },
    rows: [
      {
        sentence: 'April: about $14,000.00 expected.',
        value: { amount: '14000.00', unit: 'usd', low: null, high: null },
        details: ['Dresses were 20%.', null]
      }
    ]
  },
  items: [
    {
      name: 'Wrap Dress',
      brand: 'Meadow',
      picture: '/api/v1/buy/shared/tok/pictures/33333333-3333-4333-8333-333333333333.webp',
      chips: { taxonomy: ['clothing', 'dresses'], attributes: {}, colours: [] },
      sizes: ['S', 'M', 'L'],
      number: { amount: '40', unit: 'units', low: null, high: null },
      split: { L: 10, M: 20, S: 10 },
      why: 'Buy 40 units: S 10, M 20, L 10.',
      status: 'recommended',
      flags: ['wide'],
      fit: 'fits'
    },
    {
      name: 'Cable Crew',
      brand: '',
      picture: null,
      chips: { taxonomy: [], attributes: {}, colours: [] },
      sizes: [],
      number: null,
      split: null,
      why: null,
      status: null,
      flags: [],
      fit: null
    }
  ],
  carried: [],
  caveats: ['The forecast is unproven here.', null]
});

describe("sharedMemoView: the share link's projection in the same view", () => {
  it("keeps the section order and the plan's facts", () => {
    const v = sharedMemoView(shared(), BASE);
    expect(v.audience).toBe('shared');
    expect(v.order).toEqual(SECTION_ORDER);
    expect(v.title).toBe('Spring 27');
    expect(v.store).toBe('Main');
    expect(v.cover?.sentence).toBe('Spring 27 for Main: order by 1 Mar 2027.');
  });

  it('labels the two totals it carries, nothing more', () => {
    const v = sharedMemoView(shared(), BASE);
    expect(v.totals.map((t) => t.label)).toEqual(['Units', 'Expected revenue']);
  });

  it('keys cards by position, says its own why, the fit word as a chip, and is never citable', () => {
    const v = sharedMemoView(shared(), BASE);
    const dress = v.items[0];
    expect(dress.key).toBe('shared-items-0');
    expect(dress.lineId).toBeNull();
    expect(dress.figure).toEqual({ amount: '40', unit: 'units', low: null, high: null });
    expect(dress.why?.sentence).toBe('Buy 40 units: S 10, M 20, L 10.');
    expect(dress.fitWord).toBe('Fits');
    expect(dress.flagWords).toEqual(['wide range']);
    expect(dress.picture).toBe('http://127.0.0.1:8069/api/v1/buy/shared/tok/pictures/33333333-3333-4333-8333-333333333333.webp');
    expect(Object.values(v.anchors).every((a) => a.citable === null)).toBe(true);
    expect(v.items.every((c) => c.why?.citable == null)).toBe(true);
  });

  it('a card with no number and no status renders no figure and raises no caveat (nothing is invented)', () => {
    const v = sharedMemoView(shared(), BASE);
    expect(v.items[1].figure).toBeNull();
    expect(v.items[1].missing).toBe(false);
    expect(v.missingCaveat).toBe(false);
  });

  it('drops the gaps in the caveats and the month details', () => {
    const v = sharedMemoView(shared(), BASE);
    expect(v.caveats.map((c) => c.sentence)).toEqual(['The forecast is unproven here.']);
    expect(v.months.rows[0].details.map((d) => d.sentence)).toEqual(['Dresses were 20%.']);
    expect(v.excluded).toEqual([]);
    expect(v.notes).toEqual({ planNote: '', lines: [] });
  });
});
