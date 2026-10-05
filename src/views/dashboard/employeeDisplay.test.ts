import { describe, expect, it } from 'vitest';
import { employeeInitials, formatHours, formatLaborCost } from './employeeDisplay';

describe('dashboard employee display', () => {
  it('keeps cents for small labor costs', () => {
    expect(formatLaborCost(2.51)).toBe('$2.51');
    expect(formatLaborCost(0)).toBe('$0.00');
    expect(formatLaborCost(100)).toBe('$100');
  });
  it('uses whole hours and minutes for clocked time', () => {
    expect(formatHours(452)).toBe('0h 7m');
    expect(formatHours(0)).toBe('0h 0m');
    expect(formatHours(3660)).toBe('1h 1m');
  });
  it('uses trimmed uppercase first and last initials', () => {
    expect(employeeInitials('Jaylen', 'Brooks')).toBe('JB');
    expect(employeeInitials(' meredith', 'hale ')).toBe('MH');
    expect(employeeInitials('', '')).toBe('—');
  });
});
