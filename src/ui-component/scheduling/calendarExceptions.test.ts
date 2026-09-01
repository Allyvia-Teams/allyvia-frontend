import { describe, expect, it } from 'vitest';
import type { CalendarException } from 'types/scheduling';
import {
  describeException,
  driverChipLabel,
  emptyDraft,
  exceptionForDay,
  orderForList,
  toPayload,
  validateDraft,
  withKind
} from './calendarExceptions';

const row = (over: Partial<CalendarException>): CalendarException => ({
  id: 1,
  date: '2026-09-14',
  location_id: '',
  kind: 'closed',
  demand_effect: 'zero',
  multiplier: null,
  effective_multiplier: 0,
  staff_headcount: null,
  note: '',
  created_by_email: '',
  created_at: null,
  updated_at: null,
  ...over
});

describe('withKind', () => {
  it('resets the effect to the kind default and drops fields that no longer apply', () => {
    const draft = { ...emptyDraft(), date: '2026-09-14', multiplier: '0.5', staff_headcount: '2' };
    expect(withKind(draft, 'private_event')).toMatchObject({ demand_effect: 'boost', multiplier: '0.5', staff_headcount: '' });
    expect(withKind(draft, 'inventory_count')).toMatchObject({ demand_effect: 'zero', multiplier: '', staff_headcount: '2' });
    expect(withKind(draft, 'custom')).toMatchObject({ demand_effect: 'neutral', multiplier: '', staff_headcount: '' });
  });
});

describe('validateDraft — mirrors the backend serializer', () => {
  it('requires a date', () => {
    expect(validateDraft(emptyDraft()).date).toBeDefined();
  });
  it('requires a multiplier pointing the way the effect says', () => {
    const base = { ...emptyDraft(), date: '2026-09-14', kind: 'private_event' as const, demand_effect: 'boost' as const };
    expect(validateDraft({ ...base, multiplier: '' }).multiplier).toMatch(/required/);
    expect(validateDraft({ ...base, multiplier: '0.9' }).multiplier).toMatch(/above 1/);
    expect(validateDraft({ ...base, multiplier: '3.5' }).multiplier).toMatch(/between/);
    expect(validateDraft({ ...base, multiplier: '1.5' })).toEqual({});
    expect(validateDraft({ ...base, demand_effect: 'dampen', multiplier: '1.2' }).multiplier).toMatch(/below 1/);
  });
  it('allows a count crew only on a zero-demand day', () => {
    const base = { ...emptyDraft(), date: '2026-09-14' };
    expect(validateDraft({ ...base, staff_headcount: '3' })).toEqual({});
    expect(validateDraft({ ...base, kind: 'custom', demand_effect: 'neutral', staff_headcount: '3' }).staff_headcount).toMatch(/no demand/);
    expect(validateDraft({ ...base, staff_headcount: '1.5' }).staff_headcount).toMatch(/Whole number/);
  });
});

describe('toPayload', () => {
  it('never sends a multiplier for a zero day nor a crew for a boost day', () => {
    expect(toPayload({ ...emptyDraft(), date: '2026-09-14', multiplier: '0.5', staff_headcount: '2' })).toEqual({
      date: '2026-09-14',
      location_id: '',
      kind: 'closed',
      demand_effect: 'zero',
      multiplier: null,
      staff_headcount: 2,
      note: ''
    });
    expect(
      toPayload({ ...emptyDraft(), date: '2026-09-14', kind: 'private_event', demand_effect: 'boost', multiplier: ' 1.8 ', staff_headcount: '2' })
    ).toMatchObject({ multiplier: '1.8', staff_headcount: null });
  });
});

describe('describeException / driverChipLabel', () => {
  it('says who scheduled what on a zero day', () => {
    expect(describeException(row({}))).toBe('Closed — closed to the public, nobody scheduled');
    expect(describeException(row({ kind: 'inventory_count' }))).toBe('Inventory count — closed to the public, minimum crew scheduled');
    expect(describeException(row({ kind: 'inventory_count', staff_headcount: 3, note: 'annual' }))).toBe(
      'Inventory count — closed to the public, 3 scheduled (annual)'
    );
    expect(describeException(row({ kind: 'private_event', demand_effect: 'boost', effective_multiplier: 1.8 }))).toBe(
      'Private event — demand ×1.8'
    );
  });
  it('labels the day card from the driver the backend wrote', () => {
    expect(driverChipLabel({ kind: 'closed', demand_effect: 'zero', multiplier: 0, note: '', location_scope: 'company' })).toBe(
      'Closed — declared by you'
    );
    expect(driverChipLabel({ kind: 'private_event', demand_effect: 'boost', multiplier: 2, note: '', location_scope: 'company' })).toBe(
      'Private event — demand ×2'
    );
  });
});

describe('exceptionForDay / orderForList', () => {
  it('lets a location row beat the company-wide one', () => {
    const rows = [row({ id: 1 }), row({ id: 2, location_id: 'LOC1', kind: 'private_event', demand_effect: 'boost' })];
    expect(exceptionForDay(rows, '2026-09-14', 'LOC1')?.id).toBe(2);
    expect(exceptionForDay(rows, '2026-09-14', 'LOC2')?.id).toBe(1);
    expect(exceptionForDay(rows, '2026-09-15', 'LOC1')).toBeUndefined();
  });
  it('lists upcoming first, then the past most-recent-first', () => {
    const rows = [row({ id: 1, date: '2026-08-01' }), row({ id: 2, date: '2026-10-01' }), row({ id: 3, date: '2026-09-20' }), row({ id: 4, date: '2026-08-20' })];
    expect(orderForList(rows, '2026-09-01').map((r) => r.id)).toEqual([3, 2, 4, 1]);
  });
});
