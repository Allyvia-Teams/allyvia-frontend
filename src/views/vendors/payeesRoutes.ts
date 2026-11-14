// views/vendors/payeesRoutes.ts
//
// Where the payables list lives (owner trust T5). The page and its API keep their code names
// (`views/vendors`, `/vendors/` on the backend); only the URL and the title the owner reads move.

/** Bills and payees: the old Vendors page, under Finance & accounting. */
export const PAYEES_PATH = '/finance/payees';

/** The old sidebar URL; it still answers, as a redirect. */
export const LEGACY_VENDORS_PATH = '/vendors';

export const PAYEES_TITLE = 'Bills and payees';

/** The new URL for an old /vendors link: the query string and the hash are carried through. */
export const payeesRedirectTarget = (search: string = '', hash: string = ''): string => {
  const query = search && search !== '?' ? (search.startsWith('?') ? search : `?${search}`) : '';
  const fragment = hash && hash !== '#' ? (hash.startsWith('#') ? hash : `#${hash}`) : '';
  return `${PAYEES_PATH}${query}${fragment}`;
};
