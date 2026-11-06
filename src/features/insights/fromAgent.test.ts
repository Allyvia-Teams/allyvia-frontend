import { describe, expect, it } from 'vitest';

import { categoryFor, confidenceFor, relativeStamp } from './fromAgent';
import type { PendingRecommendation } from 'api/agent.api';

const row = (fields: Partial<PendingRecommendation> & { sector?: string }) => fields as PendingRecommendation & { sector?: string };

describe('relativeStamp', () => {
  // Local-time constructors, so the test holds in any timezone.
  const now = new Date(2026, 10, 6, 15, 0);

  it('says today, yesterday, or the date', () => {
    expect(relativeStamp(new Date(2026, 10, 6, 7, 2).toISOString(), now)).toBe('today at 7:02 AM');
    expect(relativeStamp(new Date(2026, 10, 5, 18, 40).toISOString(), now)).toBe('yesterday at 6:40 PM');
    expect(relativeStamp(new Date(2026, 10, 3, 7, 0).toISOString(), now)).toBe('Nov 3 at 7:00 AM');
  });

  it('is empty for a missing or broken timestamp', () => {
    expect(relativeStamp(null, now)).toBe('');
    expect(relativeStamp('not a date', now)).toBe('');
  });
});

describe('categoryFor', () => {
  it('prefers rec_type, then sector, then inventory', () => {
    expect(categoryFor(row({ rec_type: 'overstock_markdown', sector: 'inventory' }))).toBe('pricing');
    expect(categoryFor(row({ rec_type: null, sector: 'finance' }))).toBe('cash');
    expect(categoryFor(row({ sector: 'general' }))).toBe('inventory');
  });
});

describe('confidenceFor', () => {
  it('bands the 0..1 score', () => {
    expect(confidenceFor(0.75)).toBe('high');
    expect(confidenceFor(0.5)).toBe('medium');
    expect(confidenceFor(0.49)).toBe('low');
    expect(confidenceFor(Number.NaN)).toBe('low');
  });
});
