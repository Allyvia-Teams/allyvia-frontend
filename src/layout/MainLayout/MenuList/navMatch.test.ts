import { describe, expect, it } from 'vitest';

import { isNavItemSelected } from './navMatch';

const inv = {
  url: '/inventory',
  exact: true,
  also: [
    '/inventory/update',
    '/inventory/plan',
    '/inventory/purchase-orders',
    '/inventory/transfers',
    '/inventory/stock-counts',
    '/inventory/quickbooks',
    '/inventory/locations',
    '/inventory/size-scales'
  ]
};
const find = { url: '/inventory/find' };

describe('isNavItemSelected', () => {
  it('selects the workspace only on its own path', () => {
    expect(isNavItemSelected(inv, '/inventory')).toBe(true);
    expect(isNavItemSelected(find, '/inventory')).toBe(false);
  });

  it('leaves the workspace unselected on Find a size', () => {
    expect(isNavItemSelected(inv, '/inventory/find')).toBe(false);
    expect(isNavItemSelected(find, '/inventory/find')).toBe(true);
  });

  it('keeps the workspace lit on every page that lives under its tabs', () => {
    expect(isNavItemSelected(inv, '/inventory/plan/abc')).toBe(true);
    expect(isNavItemSelected(inv, '/inventory/purchase-orders/new')).toBe(true);
    expect(isNavItemSelected(inv, '/inventory/update')).toBe(true);
  });

  it('selects nothing elsewhere', () => {
    expect(isNavItemSelected(inv, '/dashboard')).toBe(false);
    expect(isNavItemSelected(find, '/dashboard')).toBe(false);
  });

  it('keeps prefix behaviour without exact', () => {
    expect(isNavItemSelected({ url: '/employees' }, '/employees/clock')).toBe(true);
  });

  it('never selects an item with no destination', () => {
    expect(isNavItemSelected({}, '/inventory')).toBe(false);
  });
});
