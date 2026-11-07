import { describe, expect, it } from 'vitest';

import { readSectionOpen, sectionStorageKey, writeSectionOpen } from './sectionState';

const memoryStorage = () => {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => void data.set(key, value)
  };
};

const throwingStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  }
};

describe('section open state', () => {
  it('uses allyvia.insights.section.<name>.open', () => {
    expect(sectionStorageKey('business-profile')).toBe('allyvia.insights.section.business-profile.open');
  });

  it('is collapsed when nothing is stored (cleared storage)', () => {
    expect(readSectionOpen('analytics', memoryStorage())).toBe(false);
  });

  it('remembers open and closed', () => {
    const storage = memoryStorage();
    writeSectionOpen('business-profile', true, storage);
    expect(storage.data.get('allyvia.insights.section.business-profile.open')).toBe('true');
    expect(readSectionOpen('business-profile', storage)).toBe(true);
    expect(readSectionOpen('analytics', storage)).toBe(false);
    writeSectionOpen('business-profile', false, storage);
    expect(readSectionOpen('business-profile', storage)).toBe(false);
  });

  it('reads blocked or missing storage as collapsed and never throws', () => {
    expect(readSectionOpen('analytics', throwingStorage)).toBe(false);
    expect(() => writeSectionOpen('analytics', true, throwingStorage)).not.toThrow();
    expect(readSectionOpen('analytics', null)).toBe(false);
  });
});
