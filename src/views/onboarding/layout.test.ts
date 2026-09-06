import { describe, expect, it } from 'vitest';
import type { ParsePreview } from 'api/onboarding.api';
import { headerChoice } from './layout';

const preview: ParsePreview = {
  id: 'table',
  delimiter: ',',
  limited: false,
  rows: [
    { row_number: 1, values: ['Report'], selectable: true, truncated: false },
    { row_number: 2, values: [], selectable: false, truncated: false },
    { row_number: 3, values: ['sku', 'name'], selectable: true, truncated: false }
  ]
};

describe('header selection', () => {
  it('selects the source row after a title and blank record', () => {
    expect(headerChoice('3', preview)).toEqual({ forceHeader: true, headerRow: 3 });
  });
  it('keeps all rows when the user explicitly chooses no headers', () => {
    expect(headerChoice('none', preview)).toEqual({ forceHeader: false });
  });
  it.each(['', '0', '2', '4', '-1', '3.0', 'NaN'])('rejects unavailable or blank row %s', (choice) => {
    expect(headerChoice(choice, preview)).toBeNull();
  });
  it('waits for a nonempty source preview', () => {
    expect(headerChoice('none', undefined)).toBeNull();
    expect(headerChoice('none', { ...preview, rows: [] })).toBeNull();
  });
});
