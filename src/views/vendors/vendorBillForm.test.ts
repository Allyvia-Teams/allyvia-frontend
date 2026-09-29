import { describe, expect, it } from 'vitest';
import { billAmount, validateBill, validatePayment } from './vendorBillForm';

describe('vendor bill input', () => {
  it('totals cents without binary rounding and rejects excess precision', () => {
    expect(billAmount(['0.10', '0.20'])).toBe('0.30');
    expect(billAmount(['1.001'])).toBeNull();
    expect(billAmount(['-1.00'])).toBeNull();
    expect(billAmount(['Infinity'])).toBeNull();
  });
  it('requires invoice identity, sensible dates and lines', () => {
    expect(validateBill('', '2026-09-01', '2026-09-30', ['1.00'])).not.toBeNull();
    expect(validateBill('INV-1', '2026-09-02', '2026-09-01', ['1.00'])).not.toBeNull();
    expect(validateBill('INV-1', '2026-09-01', '2026-09-30', ['500.00'])).toBeNull();
  });
  it('rejects payments larger than outstanding and future external-payment dates', () => {
    expect(validatePayment('500.01', '500.00', '2026-09-14', '2026-09-14')).not.toBeNull();
    expect(validatePayment('100.00', '500.00', '2026-09-15', '2026-09-14')).not.toBeNull();
    expect(validatePayment('100.00', '500.00', '2026-09-14', '2026-09-14')).toBeNull();
  });
});
