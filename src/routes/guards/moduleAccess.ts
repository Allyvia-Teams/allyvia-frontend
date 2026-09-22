import { BASELINE_MODULES, isModuleKey, type ModuleKey, type ModulePermissions } from 'types/settings';

/**
 * Which screens a member may reach, given their module grants.
 *
 * Extracted from `memberGuard.tsx` so it can be unit-tested: that file pulls
 * in the kiosk API client and with it axios's browser-only init, which makes
 * the whole module uncollectable in a test. This decides who reaches the
 * screens that move money, so the rule is pinned rather than eyeballed.
 */

// Maps a module key to the URL path prefix(es) members reach when granted.
// Keep this in sync with the ModuleKey union in types/settings.ts.
const MODULE_PATHS: Record<ModuleKey, string[]> = {
  storefront: ['/storefront'],
  inventory: ['/inventory'],
  clock: ['/employees/clock'],
  employees: ['/employees'],
  'employees.manage': ['/employees'],
  'employees.approve': ['/employees/time-approval'],
  'employees.delete': [],
  // /refunds is POS, not a module of its own. The backend gates the refund
  // endpoints on ModulePermission('pos') plus the dotted ACTION key
  // 'pos.refund' inside that module's permissions — there is no 'refunds'
  // ModuleKey to key a new entry off, and inventing one here would grant a
  // path the server would still 403.
  pos: ['/pos', '/refunds'],
  finance: ['/finance'],
  crm: ['/crm'],
  calendar: ['/calendar'],
  documents: ['/documents'],
  analytics: ['/analytics'],
  insights: ['/insights'],
  scheduling: ['/scheduling'],
  // Data onboarding is now accessed via settings?tab=onboarding for admins.
  onboarding: ['/onboarding']
};

export const computeAllowedPrefixes = (permissions: ModulePermissions | undefined): string[] => {
  const granted: ModuleKey[] = [...BASELINE_MODULES];
  if (permissions) {
    // module_permissions also carries dotted ACTION keys ('pos.refund'). They
    // grant an action inside a module, never a screen, so they map to no
    // prefix here: filtered out rather than cast, so a new key can neither
    // crash this lookup nor widen access.
    Object.keys(permissions).forEach((k) => {
      if (isModuleKey(k) && permissions[k] === true && !granted.includes(k)) granted.push(k);
    });
  }
  return granted.flatMap((k) => MODULE_PATHS[k] || []);
};

export const matchesAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname.replace(/\/+$/, '') === p || (p !== '/employees' && pathname.startsWith(p + '/')));
