import { describe, expect, it } from 'vitest';
import { fieldValue, integerOrNull, numberOrNull } from './numericField';

// ALL-108. The bug these replace was `parseFloat(x) || 0`: an emptied price
// field became £0.00 rather than an empty box, and `|| 0` could not tell an
// empty field from a typed zero.
describe('numberOrNull', () => {
  it('keeps a cleared field distinct from zero', () => {
    expect(numberOrNull('')).toBeNull();
    expect(numberOrNull('   ')).toBeNull();
    expect(numberOrNull('0')).toBe(0);
  });

  it('reads a typed number', () => {
    expect(numberOrNull('12.50')).toBe(12.5);
    expect(numberOrNull('-3')).toBe(-3);
  });

  it('treats half-typed input as unanswered rather than zero', () => {
    expect(numberOrNull('-')).toBeNull();
    expect(numberOrNull('abc')).toBeNull();
    expect(numberOrNull('1.2.3')).toBeNull();
  });
});

describe('integerOrNull', () => {
  it('truncates toward zero and keeps empty empty', () => {
    expect(integerOrNull('7.9')).toBe(7);
    expect(integerOrNull('-7.9')).toBe(-7);
    expect(integerOrNull('')).toBeNull();
    expect(integerOrNull('0')).toBe(0);
  });
});

describe('fieldValue', () => {
  it('renders an unanswered field as an empty box, and zero as zero', () => {
    expect(fieldValue(null)).toBe('');
    expect(fieldValue(undefined)).toBe('');
    expect(fieldValue(NaN)).toBe('');
    expect(fieldValue(0)).toBe(0);
    expect(fieldValue(4.5)).toBe(4.5);
  });
});
