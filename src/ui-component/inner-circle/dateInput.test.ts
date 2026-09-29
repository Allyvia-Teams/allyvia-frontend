import { describe, expect, it } from 'vitest';

import { isoToLocalInput } from './dateInput';

// TZ-independent: the returned `YYYY-MM-DDTHH:mm` string is interpreted as
// LOCAL time by `Date.parse`, so asserting against a fixed literal (e.g.
// "2026-09-30T18:00") would only pass in one timezone. Instead we assert the
// round trip: parsing the output lands on the same instant as the input,
// rounded down to the minute (the input format drops seconds).
describe('isoToLocalInput', () => {
  it('round-trips a valid ISO instant to the minute, in whatever local zone the test runs under', () => {
    const iso = '2026-09-30T18:00:00Z';
    const out = isoToLocalInput(iso);
    const flooredToMinute = Math.floor(Date.parse(iso) / 60000) * 60000;
    expect(Date.parse(out)).toBe(flooredToMinute);
  });

  it('round-trips an instant with non-zero seconds, still floored to the minute', () => {
    const iso = '2026-01-15T09:30:45Z';
    const out = isoToLocalInput(iso);
    const flooredToMinute = Math.floor(Date.parse(iso) / 60000) * 60000;
    expect(Date.parse(out)).toBe(flooredToMinute);
  });

  it('returns empty string for null', () => {
    expect(isoToLocalInput(null)).toBe('');
  });

  it('returns empty string for an empty string', () => {
    expect(isoToLocalInput('')).toBe('');
  });

  it('returns empty string for a garbage string that is not a valid date', () => {
    expect(isoToLocalInput('not-a-date')).toBe('');
  });
});
