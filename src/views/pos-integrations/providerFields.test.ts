import { describe, expect, it } from 'vitest';

import { isValidShopDomain, normalizeShopDomain, pendingShopDomain, PROVIDER_FIELDS } from './providerFields';

describe('PROVIDER_FIELDS', () => {
  it('keeps Shopify’s shop-domain field in a map, not an inline branch', () => {
    expect(PROVIDER_FIELDS.shopify?.[0].key).toBe('shop_domain');
    expect(PROVIDER_FIELDS.square).toBeUndefined();
    expect(PROVIDER_FIELDS.csv).toBeUndefined();
  });
});

describe('normalizeShopDomain', () => {
  it('accepts a bare store name', () => {
    expect(normalizeShopDomain('mystore')).toBe('mystore.myshopify.com');
  });

  it('accepts the full myshopify domain', () => {
    expect(normalizeShopDomain('MyStore.myshopify.com')).toBe('mystore.myshopify.com');
  });

  it('accepts a pasted admin URL', () => {
    expect(normalizeShopDomain('https://mystore.myshopify.com/admin/orders')).toBe('mystore.myshopify.com');
  });

  it('rejects a vanity domain', () => {
    expect(isValidShopDomain('shop.example.com')).toBe(false);
    expect(isValidShopDomain('mystore.myshopify.com')).toBe(true);
    expect(isValidShopDomain('mystore')).toBe(true);
    expect(isValidShopDomain('')).toBe(false);
  });
});

describe('pendingShopDomain', () => {
  it('moves a reused connection to the store the merchant typed', () => {
    // The bug this pins: a connection left over from an earlier attempt kept
    // its old store, and the typed domain never reached the backend.
    expect(pendingShopDomain('123591-2.myshopify.com', 'merths.myshopify.com')).toBe('merths.myshopify.com');
    expect(pendingShopDomain('123591-2.myshopify.com', 'merths')).toBe('merths.myshopify.com');
  });

  it('is a no-op when the typed store already matches', () => {
    expect(pendingShopDomain('merths.myshopify.com', 'merths.myshopify.com')).toBeNull();
    expect(pendingShopDomain('merths.myshopify.com', 'MERTHS')).toBeNull();
  });

  it('never patches an empty or invalid domain', () => {
    expect(pendingShopDomain('merths.myshopify.com', '')).toBeNull();
    expect(pendingShopDomain('merths.myshopify.com', 'shop.example.com')).toBeNull();
    expect(pendingShopDomain(undefined, '')).toBeNull();
  });

  it('fills in a connection that never had a store', () => {
    expect(pendingShopDomain('', 'merths')).toBe('merths.myshopify.com');
    expect(pendingShopDomain(null, 'merths')).toBe('merths.myshopify.com');
  });
});
