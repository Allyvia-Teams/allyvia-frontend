import { describe, expect, it } from 'vitest';

import {
  customersToggleOptions,
  effectiveCustomersView,
  prospectsAvailable,
  resolveCustomersView,
  resolveProspectsCanShow
} from './customersProspects';

describe('prospectsAvailable', () => {
  it('hides Prospects when there are no leads and no deals', () => {
    expect(prospectsAvailable({ leads: 0, deals: 0 })).toBe(false);
    expect(prospectsAvailable({ leads: 1, deals: 0 })).toBe(true);
    expect(prospectsAvailable(undefined)).toBe(false); // unknown = hidden, never a flash of a tab that vanishes
  });

  it('shows Prospects when only deals exist', () => {
    // Deleting `|| counts.deals > 0` from prospectsAvailable must turn this red.
    expect(prospectsAvailable({ leads: 0, deals: 1 })).toBe(true);
  });
});

describe('resolveProspectsCanShow', () => {
  it('treats a failed count as available, never as none', () => {
    expect(resolveProspectsCanShow(undefined, { isError: true })).toBe(true);
    expect(resolveProspectsCanShow({ leads: 0, deals: 0 }, { isError: true })).toBe(true);
  });

  it('delegates to prospectsAvailable when there is no error', () => {
    expect(resolveProspectsCanShow(undefined, { isError: false })).toBe(false);
    expect(resolveProspectsCanShow({ leads: 0, deals: 0 }, { isError: false })).toBe(false);
    expect(resolveProspectsCanShow({ leads: 1, deals: 0 }, { isError: false })).toBe(true);
  });
});

describe('customersToggleOptions', () => {
  it('toggle options follow availability', () => {
    expect(customersToggleOptions(false).map((o) => o.value)).toEqual(['leaderboard', 'all']);
    expect(customersToggleOptions(true).map((o) => o.value)).toEqual(['leaderboard', 'all', 'prospects']);
  });

  it('returns a fresh array on both branches', () => {
    // Deleting the spread on the false branch (`[...BASE_OPTIONS]`) would make
    // this alias the shared BASE_OPTIONS array across calls.
    expect(customersToggleOptions(false)).not.toBe(customersToggleOptions(false));
    expect(customersToggleOptions(true)).not.toBe(customersToggleOptions(true));
  });
});

describe('effectiveCustomersView', () => {
  it('a prospects URL on a company with none falls back to leaderboard', () => {
    expect(effectiveCustomersView('prospects', false)).toBe('leaderboard');
  });

  it('passes every other combination through unchanged', () => {
    // Deleting the `!available` check from effectiveCustomersView must turn these red.
    expect(effectiveCustomersView('prospects', true)).toBe('prospects');
    expect(effectiveCustomersView('all', false)).toBe('all');
    expect(effectiveCustomersView('leaderboard', true)).toBe('leaderboard');
  });
});

describe('resolveCustomersView', () => {
  it('honours the requested view while the count query is pending', () => {
    expect(resolveCustomersView('prospects', { settled: false, available: false })).toBe('prospects');
  });

  it('applies the gate once settled and unavailable', () => {
    expect(resolveCustomersView('prospects', { settled: true, available: false })).toBe('leaderboard');
  });

  it('keeps prospects once settled and available', () => {
    expect(resolveCustomersView('prospects', { settled: true, available: true })).toBe('prospects');
  });

  it('leaves leaderboard/all unchanged regardless of settled or availability', () => {
    expect(resolveCustomersView('leaderboard', { settled: false, available: false })).toBe('leaderboard');
    expect(resolveCustomersView('leaderboard', { settled: true, available: true })).toBe('leaderboard');
    expect(resolveCustomersView('all', { settled: false, available: true })).toBe('all');
    expect(resolveCustomersView('all', { settled: true, available: false })).toBe('all');
  });
});
