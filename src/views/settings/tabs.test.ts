import { describe, expect, it } from 'vitest';

import { settingsTabsFor } from './tabs';

describe('which settings tabs a role may open', () => {
  it('gives an admin Registers, after Billing', () => {
    expect(settingsTabsFor(true)).toEqual(['general', 'audit', 'billing', 'registers']);
  });

  it('never offers Registers to a member', () => {
    // Pairing an iPad mints a credential for the till. The backend refuses a
    // member role with "Admin role required." — the tab must not be reachable
    // by typing ?tab=registers either, which is what validTabs decides.
    const tabs = settingsTabsFor(false);

    expect(tabs).toEqual(['general']);
    expect(tabs).not.toContain('registers');
  });
});
