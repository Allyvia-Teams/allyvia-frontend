import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { employeeInitials, entrySeconds, formatHours, formatLaborCost, formatPhone, localDayBounds } from './employeeDisplay';

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
  it('reads "<1m" for a sub-minute entry so it does not sit at 0h 0m beside a cost', () => {
    expect(formatHours(50)).toBe('<1m');
    expect(formatHours(59.9)).toBe('<1m');
    expect(formatHours(60)).toBe('0h 1m');
  });
  it('uses trimmed uppercase first and last initials', () => {
    expect(employeeInitials('Jaylen', 'Brooks')).toBe('JB');
    expect(employeeInitials(' meredith', 'hale ')).toBe('MH');
    expect(employeeInitials('', '')).toBe('—');
  });
});

describe('formatPhone', () => {
  it('formats raw and already-dashed 10-digit numbers the same way', () => {
    expect(formatPhone('8125550185')).toBe('812-555-0185');
    expect(formatPhone('812-555-0185')).toBe('812-555-0185');
    expect(formatPhone('(812) 555-0185')).toBe('812-555-0185');
    expect(formatPhone('+1 812 555 0185')).toBe('812-555-0185');
  });
  it('leaves anything that is not a 10-digit number as entered', () => {
    expect(formatPhone('555-0185')).toBe('555-0185');
    expect(formatPhone('+44 20 7946 0958')).toBe('+44 20 7946 0958');
    expect(formatPhone('')).toBe('');
  });
});

describe('entrySeconds', () => {
  const now = Date.parse('2026-11-08T20:00:00Z');
  it('uses the stored duration for closed entries', () => {
    expect(entrySeconds({ clock_in: '2026-11-07T00:46:43Z', clock_out: '2026-11-07T00:48:32Z', duration_seconds: 109 }, now)).toBe(109);
  });
  it('counts time since clock-in for an open entry', () => {
    expect(entrySeconds({ clock_in: '2026-11-08T18:00:00Z', clock_out: null, duration_seconds: null }, now)).toBe(7200);
  });
  it('never goes negative or counts an entry with nothing to measure', () => {
    expect(entrySeconds({ clock_in: '2026-11-08T21:00:00Z', clock_out: null, duration_seconds: null }, now)).toBe(0);
    expect(entrySeconds({ clock_in: '', clock_out: null, duration_seconds: null }, now)).toBe(0);
    expect(entrySeconds({ clock_in: 'not a date', clock_out: null, duration_seconds: null }, now)).toBe(0);
    expect(entrySeconds({ clock_in: '2026-11-08T18:00:00Z', clock_out: '2026-11-08T19:00:00Z', duration_seconds: null }, now)).toBe(0);
  });
});

describe('localDayBounds', () => {
  beforeEach(() => {
    vi.stubEnv('TZ', 'America/Indiana/Indianapolis');
  });
  afterEach(() => {
    vi.unstubAllEnvs();
  });
  it('bounds the window by the viewer’s local midnight and end of day', () => {
    const { start, end } = localDayBounds({ startDate: '2026-11-06', endDate: '2026-11-06' });
    const startLocal = new Date(start);
    const endLocal = new Date(end);
    expect([startLocal.getFullYear(), startLocal.getMonth() + 1, startLocal.getDate()]).toEqual([2026, 11, 6]);
    expect([startLocal.getHours(), startLocal.getMinutes()]).toEqual([0, 0]);
    expect([endLocal.getFullYear(), endLocal.getMonth() + 1, endLocal.getDate()]).toEqual([2026, 11, 6]);
    expect([endLocal.getHours(), endLocal.getMinutes(), endLocal.getSeconds()]).toEqual([23, 59, 59]);
    // A 7:53 pm local clock-in (00:53Z next day) falls inside the local day.
    const eveningShift = new Date(2026, 10, 6, 19, 53).getTime();
    expect(eveningShift).toBeGreaterThanOrEqual(startLocal.getTime());
    expect(eveningShift).toBeLessThanOrEqual(endLocal.getTime());
  });
  it('returns ISO instants the backend parses as aware datetimes', () => {
    const { start, end } = localDayBounds({ startDate: '2026-10-10', endDate: '2026-11-08' });
    expect(start).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(end).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(Date.parse(start)).toBeLessThan(Date.parse(end));
  });
});
