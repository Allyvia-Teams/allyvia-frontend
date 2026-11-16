import { describe, expect, it } from 'vitest';

import { LEGACY_VENDORS_PATH, PAYEES_PATH, PAYEES_TITLE, payeesRedirectTarget } from './payeesRoutes';

describe('payeesRoutes', () => {
  it('names the page and its place under Finance', () => {
    expect(PAYEES_PATH).toBe('/finance/payees');
    expect(PAYEES_TITLE).toBe('Bills and payees');
    expect(LEGACY_VENDORS_PATH).toBe('/vendors');
  });

  it('redirects to the bare path when there is nothing to carry', () => {
    expect(payeesRedirectTarget()).toBe('/finance/payees');
    expect(payeesRedirectTarget('', '')).toBe('/finance/payees');
    expect(payeesRedirectTarget('?', '#')).toBe('/finance/payees');
  });

  it('keeps the query string', () => {
    expect(payeesRedirectTarget('?search=acme&page=2')).toBe('/finance/payees?search=acme&page=2');
    expect(payeesRedirectTarget('search=acme')).toBe('/finance/payees?search=acme');
  });

  it('keeps the hash after the query', () => {
    expect(payeesRedirectTarget('?a=1', '#row-7')).toBe('/finance/payees?a=1#row-7');
    expect(payeesRedirectTarget('', '#row-7')).toBe('/finance/payees#row-7');
  });
});
