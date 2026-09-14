export type TabValue = 'general' | 'brand' | 'integrations' | 'audit' | 'billing' | 'registers' | 'onboarding';

/**
 * The tabs a role is allowed to open, in the order they are shown.
 *
 * Extracted from the page so the gate can be tested on its own: `?tab=` is
 * user-supplied, and everything past General manages company-wide settings.
 * Registers mints pairing credentials for a till, which the backend refuses to
 * anyone but an admin ("Admin role required.").
 */
export const settingsTabsFor = (isAdmin: boolean): TabValue[] =>
  isAdmin ? ['general', 'brand', 'integrations', 'audit', 'billing', 'registers', 'onboarding'] : ['general'];

/**
 * Whether an unusable `?tab=` should be stripped from the URL.
 *
 * Only once auth has settled. `currentRole` is null on the first render after
 * a reload, which made every admin tab look unauthorised for a tick — long
 * enough for the effect to erase `?tab=onboarding` from a pasted link or a
 * refresh and drop the page back to General.
 */
export const shouldStripTabParam = (requestedTab: string | null, authReady: boolean, validTabs: TabValue[]): boolean =>
  authReady && !!requestedTab && !validTabs.includes(requestedTab as TabValue);
