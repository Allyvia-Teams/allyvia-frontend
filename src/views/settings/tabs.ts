export type TabValue = 'general' | 'integrations' | 'audit' | 'billing' | 'registers' | 'excluded-days' | 'onboarding';

/**
 * The tabs a role is allowed to open, in the order they are shown.
 *
 * Extracted from the page so the gate can be tested on its own: `?tab=` is
 * user-supplied, and everything past General manages company-wide settings.
 * Registers mints pairing credentials for a till, which the backend refuses to
 * anyone but an admin ("Admin role required."). Excluded days is admin-only for
 * the same reason: removing one silently changes what every forecast and
 * reorder figure is computed from.
 */
export const settingsTabsFor = (isAdmin: boolean): TabValue[] =>
  isAdmin ? ['general', 'integrations', 'audit', 'billing', 'registers', 'excluded-days', 'onboarding'] : ['general'];
