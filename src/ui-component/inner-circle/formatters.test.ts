import { describe, expect, it } from 'vitest';

import { lastValidMoment } from './formatters';

describe('lastValidMoment — the last instant a code works, for a "Valid through" line', () => {
  it('an event code expires at the midnight AFTER its last day; the last valid moment is the day before', () => {
    // Built from LOCAL parts, so the midnight is this zone's midnight wherever the suite runs.
    const exclusiveEnd = new Date(2026, 9, 30, 0, 0, 0).toISOString();
    const last = lastValidMoment(exclusiveEnd);
    expect(last?.getDate()).toBe(29);
    expect(last?.getMonth()).toBe(9);
  });

  it('an ordinary code (issued + N days, mid-afternoon) keeps its day', () => {
    const last = lastValidMoment(new Date(2026, 9, 30, 15, 42, 0).toISOString());
    expect(last?.getDate()).toBe(30);
  });

  it('null for a missing or unparseable value', () => {
    expect(lastValidMoment(null)).toBeNull();
    expect(lastValidMoment(undefined)).toBeNull();
    expect(lastValidMoment('soon')).toBeNull();
  });
});
