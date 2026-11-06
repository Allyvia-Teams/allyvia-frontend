import { describe, expect, it } from 'vitest';

import { meter } from './meter';

describe('meter: the number and its range on one track', () => {
  it('draws the band from low to high and the mark at the number, on a track to 1.3 times the top', () => {
    const m = meter({ amount: '40', low: '36', high: '45' });
    expect(m).not.toBeNull();
    // track 0..58.5
    expect(m!.band!.left).toBeCloseTo((36 / 58.5) * 100, 5);
    expect(m!.band!.width).toBeCloseTo((9 / 58.5) * 100, 5);
    expect(m!.mark).toBeCloseTo((40 / 58.5) * 100, 5);
  });

  it('never draws a mark outside [low, high]: no meter at all rather than a clamped figure the payload does not carry', () => {
    expect(meter({ amount: '50', low: '36', high: '45' })).toBeNull();
    expect(meter({ amount: '30', low: '36', high: '45' })).toBeNull();
  });

  it('draws nothing for an insufficient line (no number) and no meter on a cut line', () => {
    expect(meter({ amount: null, low: null, high: null })).toBeNull();
    expect(meter(null)).toBeNull();
    expect(meter({ amount: '30', low: '24', high: '36' }, { cut: true })).toBeNull();
  });

  it('a number with no range gets a mark and no band', () => {
    const m = meter({ amount: '12', low: null, high: null });
    expect(m!.band).toBeNull();
    expect(m!.mark).toBeCloseTo((12 / 15.6) * 100, 5);
  });

  it('refuses what is not a number', () => {
    expect(meter({ amount: 'abc', low: '1', high: '2' })).toBeNull();
    expect(meter({ amount: '0', low: '0', high: '0' })).toBeNull();
  });
});
