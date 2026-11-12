// Whether the Verified savings card shows its by-type and by-signal lists.
// Closed by default and remembered per browser. Every storage read and write
// is inside try/catch: storage can be blocked, full or absent, and the card
// must then simply stay closed.

export const SAVINGS_DETAILS_KEY = 'allyvia.dashboard.savingsDetailsOpen';

export type DetailsStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const readDetailsOpen = (storage: DetailsStorage | null): boolean => {
  try {
    return storage?.getItem(SAVINGS_DETAILS_KEY) === 'open';
  } catch {
    return false;
  }
};

export const writeDetailsOpen = (storage: DetailsStorage | null, open: boolean): void => {
  try {
    storage?.setItem(SAVINGS_DETAILS_KEY, open ? 'open' : 'closed');
  } catch {
    // Not remembered; the card still works.
  }
};

export const toggleLabel = (open: boolean): string => (open ? 'Hide' : 'Show where this comes from');

/** window.localStorage, or null where even touching it throws. */
export const browserStorage = (): DetailsStorage | null => {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
};
