// Open/closed memory for the collapsible sections on /insights, one key per
// section: allyvia.insights.section.<name>.open = "true" | "false".
//
// Every access is wrapped: storage can be missing (SSR, tests), blocked
// (Safari private mode throws on access), or full. Any failure reads as
// "collapsed" and a failed write is dropped, so the page never breaks over a
// remembered toggle.

export const sectionStorageKey = (name: string): string => `allyvia.insights.section.${name}.open`;

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const defaultStorage = (): StorageLike | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};

export const readSectionOpen = (name: string, storage: StorageLike | null = defaultStorage()): boolean => {
  try {
    return storage?.getItem(sectionStorageKey(name)) === 'true';
  } catch {
    return false;
  }
};

export const writeSectionOpen = (name: string, open: boolean, storage: StorageLike | null = defaultStorage()): void => {
  try {
    storage?.setItem(sectionStorageKey(name), open ? 'true' : 'false');
  } catch {
    // Storage blocked or full: the section still toggles, it just is not remembered.
  }
};
