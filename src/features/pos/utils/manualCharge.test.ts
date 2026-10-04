import { describe, expect, it } from 'vitest';
import { createManualCharge, manualChargePriceError } from './manualCharge';
import { registerSettingsDirty, registerSettingsForm, registerSettingsPayload } from 'ui-component/settings/registerHelpers';

describe('manual charges', () => {
  it('creates separate lines with optional details and explicit tax treatment', () => {
    const form = { price: '12.50', name: ' ', description: '  Shorten sleeves  ', isTaxable: true };
    const first = createManualCharge(form, 0.07);
    const second = createManualCharge({ ...form, isTaxable: false }, 0.07);
    expect(first).toMatchObject({
      kind: 'manual',
      price: 12.5,
      name: 'Manual charge',
      description: 'Shorten sleeves',
      taxRate: 0.07,
      isTaxable: true
    });
    expect(first.id).not.toBe(second.id);
    expect(second.taxRate).toBe(0);
  });

  it.each(['', '0', '-1', 'NaN', 'Infinity', '1.001', '1e2', '10000000000'])('rejects invalid price %s before adding to cart', (price) => {
    expect(manualChargePriceError(price)).toBeTruthy();
  });

  it.each(['0.01', '12', '12.50', '.50', '9999999999.99'])('accepts valid price %s', (price) => {
    expect(manualChargePriceError(price)).toBeNull();
  });

  it('saves enabling and disabling as a boolean without rewriting other settings', () => {
    const source = { register_idle_timeout_seconds: 90, register_low_stock_threshold: 4, register_discount_limit_pct: 20 };
    const disabled = registerSettingsForm(source);
    const enabled = registerSettingsForm({ ...source, pos_manual_charges_enabled: true });
    expect(registerSettingsDirty(enabled, disabled)).toBe(true);
    expect(registerSettingsPayload(enabled, disabled)).toEqual({ pos_manual_charges_enabled: true });
    expect(registerSettingsPayload(disabled, enabled)).toEqual({ pos_manual_charges_enabled: false });
  });
});
