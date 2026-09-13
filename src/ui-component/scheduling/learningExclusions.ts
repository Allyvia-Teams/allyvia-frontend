/**
 * Pure view-model for learning exclusions and the agent's anomaly prompts.
 *
 * No React, no store. vitest runs in the NODE environment here — there is no
 * jsdom and no testing-library — so nothing rendered can be asserted on. Every
 * rule worth protecting has to live in a function like these.
 *
 * The owner-facing framing, which the copy below is built around:
 *   "If something outside your control throws off a day — road closed, power
 *    out, renovating — tell Allyvia to ignore it so it doesn't think your
 *    business changed."
 */

import type { CalendarException, CalendarExceptionKind, DemandEffect, LearningAnomalyPrompt } from 'types/scheduling';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Parse an ISO date as a CALENDAR date, not an instant.
 *
 * `new Date('2026-03-06')` is midnight UTC, so `getDay()` west of Greenwich
 * reports the day before and the card says "Thursday ran 40% under" about a
 * Friday. Splitting the string keeps it a date.
 */
export const parseIsoDate = (iso: string): { year: number; month: number; day: number } | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const year = Number(y);
  const month = Number(m);
  const day = Number(d);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};

export const weekdayOf = (iso: string): string => {
  const parsed = parseIsoDate(iso);
  if (!parsed) return '';
  // Construct in UTC and read in UTC — both halves in the same frame.
  return WEEKDAYS[new Date(Date.UTC(parsed.year, parsed.month - 1, parsed.day)).getUTCDay()];
};

export const formatDay = (iso: string): string => {
  const parsed = parseIsoDate(iso);
  if (!parsed) return iso;
  return `${parsed.day} ${MONTHS[parsed.month - 1]}`;
};

export const daysBetween = (startIso: string, endIso: string): number | null => {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) return null;
  const a = Date.UTC(start.year, start.month - 1, start.day);
  const b = Date.UTC(end.year, end.month - 1, end.day);
  return Math.round((b - a) / 86_400_000) + 1;
};

// ---------------------------------------------------------------------------
// The agent's prompt card
// ---------------------------------------------------------------------------

/**
 * "Friday ran 40% under what I expected."
 *
 * Rounded to whole percent: the row carries two decimals because the detector
 * computes them, but "39.62% under" invites the owner to interrogate a figure
 * whose precision means nothing to the decision they are being asked to make.
 */
export const promptHeadline = (prompt: LearningAnomalyPrompt): string => {
  const magnitude = Math.abs(Math.round(Number(prompt.deviation_pct)));
  const weekday = weekdayOf(prompt.date);
  const subject = weekday ? weekday : formatDay(prompt.date);
  return `${subject} ran ${magnitude}% ${prompt.direction} what I expected.`;
};

export const PROMPT_QUESTION = 'Anything going on I should ignore?';

/** The card's own heading. Counts, because "a couple of days" over one day is
 *  the kind of small wrongness that makes the whole panel feel automated. */
export const promptPanelTitle = (count: number): string =>
  count === 1 ? 'A day that looked unusual' : `${count} days that looked unusual`;

/**
 * The two answers, in a FIXED order with FIXED emphasis.
 *
 * "Yes, ignore it" leads because it is the answer that needs the owner's
 * knowledge — Allyvia cannot find out about a road closure any other way.
 * Emphasis is fixed here rather than derived from anything, so a future change
 * cannot make "primary" drift into meaning "the one most people pick".
 */
export const promptActions = () => [
  { key: 'exclude' as const, label: 'Yes, ignore it', emphasis: 'primary' as const },
  { key: 'keep' as const, label: "No, that's real", emphasis: 'plain' as const }
];

/** The line under the card once answered, so the outcome is visible. */
export const promptOutcome = (prompt: LearningAnomalyPrompt): string => {
  if (prompt.status === 'excluded') {
    return `${formatDay(prompt.date)} is left out of what Allyvia learns from.`;
  }
  if (prompt.status === 'kept') {
    return `${formatDay(prompt.date)} counts as a normal day.`;
  }
  return '';
};

// ---------------------------------------------------------------------------
// "Flag a day" — the range declaration
// ---------------------------------------------------------------------------

export interface RangeDraft {
  start_date: string;
  end_date: string;
  location_id: string;
  kind: CalendarExceptionKind;
  note: string;
}

export const emptyRangeDraft = (today: string): RangeDraft => ({
  // Defaults to today → today, so the commonest case is one tap.
  start_date: today,
  end_date: today,
  location_id: '',
  kind: 'disruption',
  note: ''
});

/** Matches the backend's MAX_RANGE_DAYS. A year is a typo, not a closure. */
export const MAX_RANGE_DAYS = 366;

export const rangeDraftErrors = (draft: RangeDraft): Record<string, string> => {
  const errors: Record<string, string> = {};
  if (!draft.start_date) errors.start_date = 'Pick a start date.';
  if (!draft.end_date) errors.end_date = 'Pick an end date.';
  if (draft.start_date && draft.end_date) {
    const span = daysBetween(draft.start_date, draft.end_date);
    if (span === null) {
      errors.start_date = 'Those dates are not valid.';
    } else if (span < 1) {
      errors.end_date = 'The end date cannot be before the start date.';
    } else if (span > MAX_RANGE_DAYS) {
      errors.end_date = `That is ${span} days. Check the year.`;
    }
  }
  if (draft.note.length > 255) errors.note = 'Keep the note under 255 characters.';
  return errors;
};

export const isRangeDraftValid = (draft: RangeDraft): boolean => Object.keys(rangeDraftErrors(draft)).length === 0;

/**
 * "9 days · 2 – 10 March". One day reads "6 March" with no count: "1 day" is
 * noise, and the whole point of the default is that one day is the common case.
 */
export const rangeSummary = (startIso: string, endIso: string): string => {
  const span = daysBetween(startIso, endIso);
  if (span === null || span < 1) return '';
  if (span === 1) return formatDay(startIso);
  return `${span} days · ${formatDay(startIso)} – ${formatDay(endIso)}`;
};

export const payloadFromRangeDraft = (draft: RangeDraft) => {
  const span = daysBetween(draft.start_date, draft.end_date);
  const base = {
    kind: draft.kind,
    location_id: draft.location_id,
    note: draft.note.trim()
  };
  // A single day posts the `date` shape the backend and the existing Calendar
  // tab have always used; only a real span uses start/end. Sending a
  // one-day range would work, but it would stamp a group_id on a lone day and
  // the settings list would then offer "remove these 1 days".
  return span === 1 ? { ...base, date: draft.start_date } : { ...base, start_date: draft.start_date, end_date: draft.end_date };
};

/** The 409 body names the days that clashed; say which, not just that. */
export const clashMessage = (clashing: string[] | undefined): string => {
  if (!clashing || clashing.length === 0) {
    return 'Part of that range is already flagged.';
  }
  if (clashing.length === 1) {
    return `${formatDay(clashing[0])} is already flagged. Nothing was changed.`;
  }
  const named = clashing.slice(0, 3).map(formatDay).join(', ');
  const rest = clashing.length > 3 ? ` and ${clashing.length - 3} more` : '';
  return `${named}${rest} are already flagged. Nothing was changed.`;
};

// ---------------------------------------------------------------------------
// Settings — the read-only list of what is excluded
// ---------------------------------------------------------------------------

export interface ExclusionGroup {
  key: string;
  /** Null for a lone day; the shared id for a declared range. */
  groupId: string | null;
  start: string;
  end: string;
  days: number;
  kind: CalendarExceptionKind;
  demand_effect: DemandEffect;
  note: string;
  source: CalendarException['source'];
  created_by_email: string;
  /** Every row in the group — what a remove has to delete. */
  ids: number[];
}

/**
 * Collapse rows into what the owner declared.
 *
 * A nine-day closure is nine rows in the database and ONE thing the owner did.
 * Listing nine lines makes the settings page unreadable and makes "remove"
 * ambiguous — remove which of the nine? Rows without a group_id stay their own
 * entry, which is correct: they were declared on their own.
 */
export const groupExclusions = (rows: CalendarException[]): ExclusionGroup[] => {
  const byGroup = new Map<string, CalendarException[]>();
  rows.forEach((row) => {
    // A lone row keys on its own id so two undated singles never merge.
    const key = row.group_id ?? `single:${row.id}`;
    const bucket = byGroup.get(key);
    if (bucket) bucket.push(row);
    else byGroup.set(key, [row]);
  });

  const groups: ExclusionGroup[] = [];
  byGroup.forEach((bucket, key) => {
    const sorted = [...bucket].sort((a, b) => a.date.localeCompare(b.date));
    const first = sorted[0];
    groups.push({
      key,
      groupId: first.group_id,
      start: first.date,
      end: sorted[sorted.length - 1].date,
      days: sorted.length,
      kind: first.kind,
      demand_effect: first.demand_effect,
      note: first.note,
      source: first.source,
      created_by_email: first.created_by_email,
      ids: sorted.map((row) => row.id)
    });
  });

  // Newest first — the owner is looking for what they just did.
  return groups.sort((a, b) => b.start.localeCompare(a.start));
};

export const SOURCE_LABELS: Record<CalendarException['source'], string> = {
  manual: 'You flagged this',
  agent_prompted: 'You confirmed this when Allyvia asked'
};

export const EXCLUSIONS_BLURB =
  "If something outside your control throws off a day — road closed, power out, renovating — tell Allyvia to ignore it so it doesn't think your business changed.";
