import { describe, expect, it } from 'vitest';

import { customersToggleOptions, effectiveCustomersView, prospectsAvailable } from './customersProspects';

describe('prospectsAvailable', () => {
  it('hides Prospects when there are no leads and no deals', () => {
    expect(prospectsAvailable({ leads: 0, deals: 0 })).toBe(false);
    expect(prospectsAvailable({ leads: 1, deals: 0 })).toBe(true);
    expect(prospectsAvailable(undefined)).toBe(false); // unknown = hidden, never a flash of a tab that vanishes
  });
});

describe('customersToggleOptions', () => {
  it('toggle options follow availability', () => {
    expect(customersToggleOptions(false).map((o) => o.value)).toEqual(['leaderboard', 'all']);
    expect(customersToggleOptions(true).map((o) => o.value)).toEqual(['leaderboard', 'all', 'prospects']);
  });
});

describe('effectiveCustomersView', () => {
  it('a prospects URL on a company with none falls back to leaderboard', () => {
    expect(effectiveCustomersView('prospects', false)).toBe('leaderboard');
  });
});
