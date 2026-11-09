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

/** Module keys granted to a member (baseline + explicit grants). Same rule as the sidebar limited menu. */
export function grantedModuleKeys(permissions: ModulePermissions | undefined): ModuleKey[] {
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
  return granted;
}

export function isModuleGranted(moduleKey: ModuleKey, permissions: ModulePermissions | undefined): boolean {
  return grantedModuleKeys(permissions).includes(moduleKey);
}

export const computeAllowedPrefixes = (permissions: ModulePermissions | undefined): string[] =>
  grantedModuleKeys(permissions).flatMap((k) => MODULE_PATHS[k] || []);

export const matchesAny = (pathname: string, prefixes: string[]) =>
  prefixes.some((p) => pathname.replace(/\/+$/, '') === p || (p !== '/employees' && pathname.startsWith(p + '/')));

/** Kiosk URLs an unlocked kiosk session may always reach (prefix match). */
export const KIOSK_PREFIXES = ['/kiosk', '/kiosk/clock', '/kiosk/inventory', '/kiosk/find-size'];
export const KIOSK_LOGIN_PATH = '/kiosk/login';

export type GuardInput = {
  pathname: string;
  /** role_type of the EFFECTIVE role: the kiosk role while a kiosk session is active, else the signed-in role. */
  effectiveRoleType?: string | null;
  /** module_permissions of the effective role. */
  modulePermissions?: ModulePermissions;
  kioskActive: boolean;
  /** This browser is the store's shared kiosk (utils/kioskDevice). */
  kioskDevice: boolean;
  userEmail?: string | null;
};

const isAdminRank = (roleType: string | null | undefined) => ['admin', 'owner'].includes(String(roleType || '').toLowerCase());

/**
 * Where the member guard sends a request, or null to let it through.
 *
 * - The PIN screen is always reachable.
 * - A locked kiosk device sends every route to the PIN screen: the owner's web
 *   session is still signed in underneath and must not be reachable by URL.
 * - Kiosk URLs need an unlocked kiosk session.
 * - Any role below admin (kiosk or not) is confined to its granted modules;
 *   an unlocked kiosk may also use the kiosk URLs.
 * - A member's own web login must unlock the kiosk with a PIN first.
 */
export function guardRedirect(input: GuardInput): string | null {
  const { pathname, effectiveRoleType, modulePermissions, kioskActive, kioskDevice, userEmail } = input;
  if (pathname === KIOSK_LOGIN_PATH) return null;

  if (!kioskActive) {
    if (kioskDevice || pathname.startsWith('/kiosk')) return KIOSK_LOGIN_PATH;
    if (String(effectiveRoleType || '').toLowerCase() === 'member') {
      return userEmail ? `${KIOSK_LOGIN_PATH}?identifier=${encodeURIComponent(userEmail)}` : KIOSK_LOGIN_PATH;
    }
  }

  // No role yet (first render after sign-in, a brand-new account): nothing to confine against.
  if (!effectiveRoleType || isAdminRank(effectiveRoleType)) return null;

  const allowed = matchesAny(pathname, computeAllowedPrefixes(modulePermissions));
  const kioskAllowed = kioskActive && KIOSK_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
  if (allowed || kioskAllowed) return null;
  // Default landing: clock-in is a baseline grant.
  return kioskActive ? '/kiosk/clock' : '/employees/clock';
}

/** Where a kiosk unlock lands: a member on their clock, admin-or-above on the dashboard. */
export const kioskLandingPath = (roleType: string | null | undefined): string => (isAdminRank(roleType) ? '/dashboard' : '/kiosk/clock');
