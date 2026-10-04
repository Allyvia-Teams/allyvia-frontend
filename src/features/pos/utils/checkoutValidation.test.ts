import { describe, expect, it } from 'vitest';
import { isValidCheckoutProduct } from './checkoutValidation';
import { createManualCharge } from './manualCharge';

describe('checkout accepts generated manual charges', () => {
  it('allows the manual charge dialog output through cash and card validation', () => {
    const product = createManualCharge({ price: '12.50', name: '', description: '', isTaxable: true }, 0.07);
    expect(isValidCheckoutProduct(product)).toBe(true);
  });
  it('requires a UUID in the manual namespace and an explicit manual kind', () => {
    expect(isValidCheckoutProduct({ id: 'manual:bad', kind: 'manual' })).toBe(false);
    expect(isValidCheckoutProduct({ id: 'manual:8ed5928c-f026-4f0a-b8d7-19e50421b960' })).toBe(false);
    expect(isValidCheckoutProduct({ id: '8ed5928c-f026-4f0a-b8d7-19e50421b960', kind: 'manual' })).toBe(false);
  });
  it('keeps accepting catalog UUIDs and legacy numeric IDs', () => {
    expect(isValidCheckoutProduct({ id: '8ed5928c-f026-4f0a-b8d7-19e50421b960' })).toBe(true);
    expect(isValidCheckoutProduct({ id: '12' })).toBe(true);
  });
});
