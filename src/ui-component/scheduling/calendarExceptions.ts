// Pure view-model for owner-declared calendar exceptions (ALL-150).
// No React, no store: everything here is testable under vitest's node runner,
// which is the only test runner the frontend has. Mirrors the validation the
// backend serializer enforces so the form fails fast instead of round-tripping.

import type { CalendarException, CalendarExceptionDriver, CalendarExceptionKind, DemandEffect } from 'types/scheduling';

export const KIND_LABELS: Record<CalendarExceptionKind, string> = {
  closed: 'Closed',
  inventory_count: 'Inventory count',
  private_event: 'Private event',
  custom: 'Custom'
};

export const EFFECT_LABELS: Record<DemandEffect, string> = {
  zero: 'Closed to the public — no demand',
  dampen: 'Reduced demand',
  boost: 'Increased demand',
  neutral: 'Demand as forecast (just note it)'
};

// Same table as the backend's DEFAULT_EFFECT.
export const DEFAULT_EFFECT: Record<CalendarExceptionKind, DemandEffect> = {
  closed: 'zero',
  inventory_count: 'zero',
  private_event: 'boost',
  custom: 'neutral'
};

export interface ExceptionDraft {
  date: string;
  location_id: string;
  kind: CalendarExceptionKind;
  demand_effect: DemandEffect;
  multiplier: string; // free text from the input; '' = none
  staff_headcount: string; // free text; '' = default
  note: string;
}

export const emptyDraft = (): ExceptionDraft => ({
  date: '',
  location_id: '',
  kind: 'closed',
  demand_effect: 'zero',
  multiplier: '',
  staff_headcount: '',
  note: ''
});

export const draftFromException = (row: CalendarException): ExceptionDraft => ({
  date: row.date,
  location_id: row.location_id,
  kind: row.kind,
  demand_effect: row.demand_effect,
  multiplier: row.multiplier ?? '',
  staff_headcount: row.staff_headcount == null ? '' : String(row.staff_headcount),
  note: row.note
});

/** Switching kind resets the effect to the kind's default, as the backend would. */
export const withKind = (draft: ExceptionDraft, kind: CalendarExceptionKind): ExceptionDraft => ({
  ...draft,
  kind,
  demand_effect: DEFAULT_EFFECT[kind],
  multiplier: DEFAULT_EFFECT[kind] === 'boost' || DEFAULT_EFFECT[kind] === 'dampen' ? draft.multiplier : '',
  staff_headcount: DEFAULT_EFFECT[kind] === 'zero' ? draft.staff_headcount : ''
});

export type DraftErrors = Partial<Record<keyof ExceptionDraft, string>>;

/** The backend serializer's rules, so the dialog can refuse before the POST. */
export const validateDraft = (draft: ExceptionDraft): DraftErrors => {
  const errors: DraftErrors = {};
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) errors.date = 'Pick a date';
  const needsMultiplier = draft.demand_effect === 'dampen' || draft.demand_effect === 'boost';
  if (needsMultiplier) {
    const value = Number(draft.multiplier);
    if (draft.multiplier.trim() === '' || Number.isNaN(value)) {
      errors.multiplier = 'A multiplier is required';
    } else if (value < 0 || value > 3) {
      errors.multiplier = 'Must be between 0 and 3';
    } else if (draft.demand_effect === 'dampen' && value >= 1) {
      errors.multiplier = 'Reduced demand needs a multiplier below 1.0';
    } else if (draft.demand_effect === 'boost' && value <= 1) {
      errors.multiplier = 'Increased demand needs a multiplier above 1.0';
    }
  }
  if (draft.staff_headcount.trim() !== '') {
    const count = Number(draft.staff_headcount);
    if (!Number.isInteger(count) || count < 0) errors.staff_headcount = 'Whole number, 0 or more';
    else if (draft.demand_effect !== 'zero') errors.staff_headcount = 'Only applies when the day has no demand';
  }
  return errors;
};

export const toPayload = (draft: ExceptionDraft) => {
  const needsMultiplier = draft.demand_effect === 'dampen' || draft.demand_effect === 'boost';
  return {
    date: draft.date,
    location_id: draft.location_id,
    kind: draft.kind,
    demand_effect: draft.demand_effect,
    multiplier: needsMultiplier && draft.multiplier.trim() !== '' ? draft.multiplier.trim() : null,
    staff_headcount: draft.demand_effect === 'zero' && draft.staff_headcount.trim() !== '' ? Number(draft.staff_headcount) : null,
    note: draft.note.trim()
  };
};

/** One-line human description, same wording the backend narrator uses. */
export const describeException = (
  row: Pick<CalendarException, 'kind' | 'demand_effect' | 'effective_multiplier' | 'staff_headcount' | 'note'>
): string => {
  const kind = KIND_LABELS[row.kind] ?? row.kind;
  let line: string;
  if (row.demand_effect === 'zero') {
    line = `${kind} — closed to the public`;
    if (row.staff_headcount != null) line += `, ${row.staff_headcount} scheduled`;
    else if (row.kind === 'inventory_count') line += ', minimum crew scheduled';
    else line += ', nobody scheduled';
  } else if (row.demand_effect === 'boost' || row.demand_effect === 'dampen') {
    line = `${kind} — demand ×${row.effective_multiplier}`;
  } else {
    line = `${kind} — noted, demand as forecast`;
  }
  return row.note ? `${line} (${row.note})` : line;
};

/** Chip copy for a forecast-day card from the driver the backend wrote. */
export const driverChipLabel = (driver: CalendarExceptionDriver): string => {
  const kind = KIND_LABELS[driver.kind] ?? driver.kind;
  if (driver.demand_effect === 'zero') return `${kind} — declared by you`;
  if (driver.demand_effect === 'neutral') return `${kind} — noted`;
  return `${kind} — demand ×${driver.multiplier}`;
};

/** The exception governing a date for a location: location row beats company-wide. */
export const exceptionForDay = (rows: CalendarException[], dateIso: string, locationId = ''): CalendarException | undefined => {
  const same = rows.filter((row) => row.date === dateIso && (row.location_id === '' || row.location_id === locationId));
  return same.find((row) => row.location_id !== '') ?? same[0];
};

/** Sort upcoming first, past last; each group by date. */
export const orderForList = (rows: CalendarException[], todayIso: string): CalendarException[] =>
  [...rows].sort((a, b) => {
    const aPast = a.date < todayIso;
    const bPast = b.date < todayIso;
    if (aPast !== bPast) return aPast ? 1 : -1;
    return aPast ? b.date.localeCompare(a.date) : a.date.localeCompare(b.date);
  });
