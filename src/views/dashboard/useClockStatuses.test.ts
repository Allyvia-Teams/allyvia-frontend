import { describe, expect, it } from 'vitest';
import { isOpenTimeEntry } from './useClockStatuses';

describe('isOpenTimeEntry', () => {
  it('treats the empty body DRF sends for Response(None) as not clocked in', () => {
    expect(isOpenTimeEntry('')).toBe(false);
  });

  it('treats null / undefined as not clocked in', () => {
    expect(isOpenTimeEntry(null)).toBe(false);
    expect(isOpenTimeEntry(undefined)).toBe(false);
  });

  it('treats an error-shaped object as not clocked in', () => {
    expect(isOpenTimeEntry({ detail: 'Valid X-Role-ID required.' })).toBe(false);
  });

  it('treats an open entry as working', () => {
    expect(isOpenTimeEntry({ id: 1, clock_in: '2026-09-23T14:00:00Z', clock_out: null })).toBe(true);
  });

  it('treats a closed entry as not working', () => {
    expect(isOpenTimeEntry({ id: 1, clock_in: '2026-09-23T14:00:00Z', clock_out: '2026-09-23T18:00:00Z' })).toBe(false);
  });
});
