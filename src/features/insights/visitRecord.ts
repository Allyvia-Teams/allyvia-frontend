// This visit's record of what was done on /insights (S5): which cards were
// acted on and which dismissals went final, with times and reasons. It lives
// in sessionStorage under one key and belongs to one payload, named by its
// refreshedAt: a record for an older payload reads as empty, so a new morning's
// list starts clean.
//
// It does two jobs. Returning to /insights after an action navigated away
// restores the same dismissed and acted-on cards, and /insights/history lists
// its rows. Nothing here is sent anywhere; the outcome ledger replaces it.
//
// Every read and write goes through try/catch: storage can be missing
// (private mode, SSR, tests), full, or hold something this code did not write.

import type { DismissReason } from './dismissals';
import { DISMISS_REASONS } from './dismissals';

export const VISIT_RECORD_KEY = 'allyvia.insights.visit';

export interface ActedEntry {
  id: string;
  /** ms since epoch, first time the action ran. */
  at: number;
}

export interface DismissedEntry {
  id: string;
  reason: DismissReason | null;
  /** ms since epoch, when the dismissal went final. */
  at: number;
}

export interface VisitRecord {
  refreshedAt: string;
  acted: ActedEntry[];
  dismissed: DismissedEntry[];
}

/** The slice of the Storage API this file uses, so tests can pass a Map-backed fake. */
export type RecordStorage = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyRecord = (refreshedAt: string): VisitRecord => ({ refreshedAt, acted: [], dismissed: [] });

/** window.sessionStorage, or null where touching it throws or it does not exist. */
export function sessionStore(): RecordStorage | null {
  try {
    return typeof window !== 'undefined' && window.sessionStorage ? window.sessionStorage : null;
  } catch {
    return null;
  }
}

const REASON_CODES: readonly string[] = DISMISS_REASONS.map((r) => r.code);

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
const isTime = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);

const actedFrom = (value: unknown): ActedEntry | null =>
  isObject(value) && typeof value.id === 'string' && isTime(value.at) ? { id: value.id, at: value.at } : null;

const dismissedFrom = (value: unknown): DismissedEntry | null => {
  if (!isObject(value) || typeof value.id !== 'string' || !isTime(value.at)) return null;
  const reason = typeof value.reason === 'string' && REASON_CODES.includes(value.reason) ? (value.reason as DismissReason) : null;
  return { id: value.id, reason, at: value.at };
};

const entries = <T>(value: unknown, from: (item: unknown) => T | null): T[] =>
  Array.isArray(value) ? value.map(from).filter((item): item is T => item !== null) : [];

/**
 * The record for this payload. Missing, unreadable, corrupt or for another
 * refreshedAt: an empty one. Malformed entries are dropped, the rest kept.
 */
export function readVisitRecord(storage: RecordStorage | null, refreshedAt: string): VisitRecord {
  if (!storage) return emptyRecord(refreshedAt);
  try {
    const raw = storage.getItem(VISIT_RECORD_KEY);
    if (!raw) return emptyRecord(refreshedAt);
    const parsed: unknown = JSON.parse(raw);
    if (!isObject(parsed) || parsed.refreshedAt !== refreshedAt) return emptyRecord(refreshedAt);
    return { refreshedAt, acted: entries(parsed.acted, actedFrom), dismissed: entries(parsed.dismissed, dismissedFrom) };
  } catch {
    return emptyRecord(refreshedAt);
  }
}

function update(storage: RecordStorage | null, refreshedAt: string, change: (record: VisitRecord) => VisitRecord): VisitRecord {
  const next = change(readVisitRecord(storage, refreshedAt));
  if (storage) {
    try {
      storage.setItem(VISIT_RECORD_KEY, JSON.stringify(next));
    } catch (error) {
      console.warn('[insights-redesign] could not save the visit record', error);
    }
  }
  return next;
}

/** A card's primary action ran. Running it again keeps the first time. */
export const recordActed = (storage: RecordStorage | null, refreshedAt: string, id: string, at: number = Date.now()): VisitRecord =>
  update(storage, refreshedAt, (record) =>
    record.acted.some((entry) => entry.id === id) ? record : { ...record, acted: [...record.acted, { id, at }] }
  );

/** A dismissal went final (toast timed out, was closed, or the page was left with it open). */
export const recordDismissed = (
  storage: RecordStorage | null,
  refreshedAt: string,
  dismissal: { id: string; reason: DismissReason | null },
  at: number = Date.now()
): VisitRecord =>
  update(storage, refreshedAt, (record) => ({
    ...record,
    dismissed: [...record.dismissed.filter((entry) => entry.id !== dismissal.id), { id: dismissal.id, reason: dismissal.reason, at }]
  }));
