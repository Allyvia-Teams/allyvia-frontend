import { describe, expect, it } from 'vitest';

import { SAVINGS_DETAILS_KEY, readDetailsOpen, toggleLabel, writeDetailsOpen, type DetailsStorage } from './savingsDetails';

const fake = (initial: Record<string, string> = {}): DetailsStorage & { data: Record<string, string> } => {
  const data = { ...initial };
  return { data, getItem: (k) => data[k] ?? null, setItem: (k, v) => void (data[k] = v) };
};
const throwing: DetailsStorage = {
  getItem: () => {
    throw new Error('blocked');
  },
  setItem: () => {
    throw new Error('blocked');
  }
};

describe('savings details open/closed', () => {
  it('is closed by default, with nothing stored or no storage', () => {
    expect(readDetailsOpen(fake())).toBe(false);
    expect(readDetailsOpen(null)).toBe(false);
  });
  it('is closed when storage throws or holds something else', () => {
    expect(readDetailsOpen(throwing)).toBe(false);
    expect(readDetailsOpen(fake({ [SAVINGS_DETAILS_KEY]: 'maybe' }))).toBe(false);
  });
  it('remembers open and closed per browser', () => {
    const storage = fake();
    writeDetailsOpen(storage, true);
    expect(readDetailsOpen(storage)).toBe(true);
    writeDetailsOpen(storage, false);
    expect(readDetailsOpen(storage)).toBe(false);
  });
  it('never throws when it cannot write', () => {
    expect(() => writeDetailsOpen(throwing, true)).not.toThrow();
    expect(() => writeDetailsOpen(null, true)).not.toThrow();
  });
  it('words the toggle', () => {
    expect(toggleLabel(false)).toBe('Show where this comes from');
    expect(toggleLabel(true)).toBe('Hide');
  });
});
