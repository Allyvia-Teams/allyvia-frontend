import { describe, expect, it } from 'vitest';

import { monthWords, statusWords, EVIDENCE_WORDS } from './wording';

describe('monthWords', () => {
  it('says an ISO month as its name and year', () => {
    expect(monthWords('Store revenue 2026-11')).toBe('Store revenue November 2026');
    expect(monthWords('Dresses 2027_04 and 2027-05')).toBe('Dresses April 2027 and May 2027');
  });

  it('leaves full dates, longer numbers and impossible months alone', () => {
    expect(monthWords('Ordered 2026-11-14')).toBe('Ordered 2026-11-14');
    expect(monthWords('Code 12026-11')).toBe('Code 12026-11');
    expect(monthWords('2026-13 and 2026-00')).toBe('2026-13 and 2026-00');
    expect(monthWords('$4,200.00 over 30 days')).toBe('$4,200.00 over 30 days');
  });
});

describe('statusWords', () => {
  it('says each status in words, and nothing for one it does not know', () => {
    expect(statusWords('measured')).toBe('from your own sales');
    expect(statusWords('unproven')).toBe('measured, not yet proven');
    expect(statusWords('owner_stated')).toBe('you told us');
    expect(statusWords('policy')).toBe('a set rule');
    expect(statusWords('insufficient')).toBe('not enough history');
    expect(statusWords('something_new')).toBe('');
    expect(statusWords(null)).toBe('');
  });

  it('never says a raw status word or a snake_case word', () => {
    Object.entries(EVIDENCE_WORDS).forEach(([status, words]) => {
      expect(words).not.toMatch(/_/);
      if (status !== 'assumed' && status !== 'estimated') expect(words).not.toBe(status);
    });
  });
});
