import { describe, expect, it } from 'vitest';
import { expenseRecognitionRows, formatRecognitionMoney } from './expenseRecognitionView';

describe('expense recognition presentation', () => {
  it('keeps currencies separate and sorted without summing them', () => {
    const rows = expenseRecognitionRows({
      CAD: { recognized_expenses: '25.00', cash_paid: '10.00', outstanding: '15.00' },
      USD: { recognized_expenses: '100.00', cash_paid: '50.00', outstanding: '50.00' }
    });
    expect(rows.map((row) => row.currency)).toEqual(['CAD', 'USD']);
    expect(rows[0].recognized).toContain('25.00');
    expect(rows[1].recognized).toContain('100.00');
    expect(rows[0].unclassified).toBe('—');
  });
  it('keeps missing or invalid values unknown rather than zero', () => {
    for (const value of [undefined, null, '', 'oops', 'Infinity', 'NaN', '0x10']) {
      expect(formatRecognitionMoney(value, 'USD')).toBe('—');
    }
    expect(formatRecognitionMoney('0.00', 'USD')).toBe('$0.00');
    expect(formatRecognitionMoney('-25.50', 'USD')).toBe('-$25.50');
  });
  it('does not silently label an unknown currency USD', () => {
    expect(formatRecognitionMoney('25.00', 'unknown')).toBe('25.00 unknown');
  });
  it('renders no fabricated rows when recognition is absent', () => {
    expect(expenseRecognitionRows(undefined)).toEqual([]);
  });
});
