import { describe, expect, it } from 'vitest';
import { bankMoney } from './bankMoney';

describe('bank money display', () => {
  it('formats decimal amounts without treating missing values as zero', () => {
    expect(bankMoney('1234.56', 'USD')).toBe('$1,234.56');
    expect(bankMoney('1234.56', 'USD', 0)).toBe('$1,235');
    expect(bankMoney(null, 'USD')).toBe('—');
    expect(bankMoney('not a number', 'USD')).toBe('—');
  });

  it('preserves an unknown currency without throwing or assuming dollars', () => {
    expect(bankMoney('12.34', 'UNKNOWN')).toBe('12.34 UNKNOWN');
    expect(bankMoney('0', 'UNKNOWN')).toBe('0.00 UNKNOWN');
  });
});
