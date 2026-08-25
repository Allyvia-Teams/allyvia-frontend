import { describe, expect, it } from 'vitest';

import { getBucketValueByLabel } from './analyticsBuckets';

describe('getBucketValueByLabel (ALL-58)', () => {
  const labels = ['Due This Week', 'Next Week', 'This Month', 'Overdue'];
  const data = [500, 1200, 3000, 800];

  it('reads the correct bucket by label in normal order', () => {
    expect(getBucketValueByLabel(labels, data, 'Due This Week')).toBe(500);
  });

  it('still reads the correct bucket when buckets arrive reordered', () => {
    const reorderedLabels = ['Overdue', 'Due This Week', 'This Month', 'Next Week'];
    const reorderedData = [800, 500, 3000, 1200];
    expect(getBucketValueByLabel(reorderedLabels, reorderedData, 'Due This Week')).toBe(500);
  });

  it('returns 0, never a neighboring bucket, when the bucket is missing', () => {
    const partialLabels = ['Next Week', 'This Month', 'Overdue']; // "Due This Week" absent
    const partialData = [1200, 3000, 800];
    expect(getBucketValueByLabel(partialLabels, partialData, 'Due This Week')).toBe(0);
  });

  it('handles an empty bucket list without throwing', () => {
    expect(getBucketValueByLabel([], [], 'Due This Week')).toBe(0);
  });
});

// ALL-58: read an AP-aging bucket by its label, never by array position.
