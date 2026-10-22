import { describe, expect, it } from 'vitest';

import { codeExpiryLabel } from './formatters';

/**
 * "Valid until" with the TIME, for every code (review round 2, C10/S2). A day
 * alone was wrong both ways: an event code expires at the store's midnight
 * after its last day (so its own day named a day it does not work), and an
 * ordinary code expires at whatever time it was minted (so "through" that day
 * over-claimed). The instant with its time is true for both, in any zone.
 */
describe('codeExpiryLabel', () => {
  it('names the expiring instant with its time, in the reader’s zone', () => {
    // Built from LOCAL parts so the expectation holds under any TZ.
    expect(codeExpiryLabel(new Date(2026, 9, 30, 15, 42, 0).toISOString())).toBe('Valid until Oct 30, 2026, 3:42 PM');
    expect(codeExpiryLabel(new Date(2026, 9, 30, 0, 0, 1).toISOString())).toBe('Valid until Oct 30, 2026, 12:00 AM');
  });

  // Review round 3 (S1-S3): an event code expires at the store's midnight
  // after its last day, and "Valid until Oct 30, 12:00 AM" leads with a day it
  // does not work and the most misread time there is. A LOCAL midnight is the
  // end of the day before.
  it('a local midnight reads as the end of the day before', () => {
    expect(codeExpiryLabel(new Date(2026, 9, 30, 0, 0, 0).toISOString())).toBe('Valid through Oct 29, 2026');
    expect(codeExpiryLabel(new Date(2026, 10, 1, 0, 0, 0).toISOString())).toBe('Valid through Oct 31, 2026');
  });

  it('null for a missing or unparseable value', () => {
    expect(codeExpiryLabel(null)).toBeNull();
    expect(codeExpiryLabel(undefined)).toBeNull();
    expect(codeExpiryLabel('soon')).toBeNull();
  });
});
