import { describe, expect, it } from 'vitest';

import { settingsTabsFor, shouldStripTabParam } from './tabs';

describe('which settings tabs a role may open', () => {
  it('gives an admin Registers and Data Onboarding, after Billing', () => {
    expect(settingsTabsFor(true)).toEqual(['general', 'brand', 'integrations', 'audit', 'billing', 'registers', 'onboarding']);
  });

  it('never offers Registers or Data Onboarding to a member', () => {
    // Pairing an iPad mints a credential for the till. The backend refuses a
    // member role with "Admin role required." — the tab must not be reachable
    // by typing ?tab=registers either, which is what validTabs decides.
    const tabs = settingsTabsFor(false);

    expect(tabs).toEqual(['general']);
    expect(tabs).not.toContain('registers');
    expect(tabs).not.toContain('onboarding');
    expect(tabs).not.toContain('integrations');
    expect(tabs).not.toContain('brand');
  });
});

describe('stripping an unusable ?tab= from the URL', () => {
  const adminTabs = settingsTabsFor(true);
  const memberTabs = settingsTabsFor(false);

  it('waits for auth before judging a tab', () => {
    // The regression: currentRole is null on the first render after a reload,
    // so every admin tab reads as unauthorised. Stripping then wiped
    // ?tab=onboarding out of the URL before the role arrived, and the page
    // settled on General with no way back but clicking the tab again.
    expect(shouldStripTabParam('onboarding', false, memberTabs)).toBe(false);
    expect(shouldStripTabParam('registers', false, memberTabs)).toBe(false);
  });

  it('leaves a tab the role may open', () => {
    expect(shouldStripTabParam('onboarding', true, adminTabs)).toBe(false);
    expect(shouldStripTabParam('general', true, memberTabs)).toBe(false);
  });

  it('strips an admin-only tab once we know the role is a member', () => {
    expect(shouldStripTabParam('onboarding', true, memberTabs)).toBe(true);
    expect(shouldStripTabParam('registers', true, memberTabs)).toBe(true);
  });

  it('strips a tab that does not exist at all', () => {
    expect(shouldStripTabParam('nonsense', true, adminTabs)).toBe(true);
  });

  it('has nothing to strip when there is no tab param', () => {
    expect(shouldStripTabParam(null, true, memberTabs)).toBe(false);
  });
});
