import { describe, expect, it } from 'vitest';

import { isValidShopDomain, normalizeShopDomain, PROVIDER_FIELDS } from './providerFields';

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
