// The plan's history (Inventory › Plan, buy planner B9; `GET …/versions/`, design §10's "Show changes").
//
// The server writes every sentence and the order (newest first, pages of 50). The page labels each entry by
// kind, marks her own decisions apart from the planner's re-sizes, and offers a diff only where the server can
// give one: a line's revision above the first (`?line=&revision=`). Times read in the browser's zone.

import type { VersionDiff, VersionEntry, VersionKind, VersionsPage } from 'api/buying.api';

export type VersionTone = 'owner' | 'planner' | 'system';

const KINDS: Record<VersionKind, { label: string; tone: VersionTone }> = {
  decision: { label: 'Your decision', tone: 'owner' },
  revision: { label: 'Re-sized', tone: 'planner' },
  months: { label: 'Months', tone: 'planner' },
  file: { label: 'File', tone: 'owner' },
  link: { label: 'Matched', tone: 'planner' },
  excluded: { label: 'Excluded', tone: 'owner' },
  review: { label: 'Review', tone: 'planner' },
  frozen: { label: 'Frozen', tone: 'system' }
};

export interface VersionRow {
  key: string;
  kind: VersionKind;
  kindLabel: string;
  tone: VersionTone;
  sentence: string;
  when: string;
  diff: { line: string; revision: number } | null;
}

const dayOf = (date: Date, tz: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);

const clock = (date: Date, tz: string) => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${get('hour')}:${get('minute')} ${get('dayPeriod').toLowerCase()}`;
};

/** "Today 7:10 am", "Yesterday 7:00 am", else "Sat, Feb 27 4:00 am", in the given zone. */
export const whenText = (at: string, now: Date, tz: string): string => {
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return '';
  const day = dayOf(date, tz);
  const today = dayOf(now, tz);
  const yesterday = dayOf(new Date(new Date(`${today}T12:00:00Z`).getTime() - 86400000), 'UTC');
  if (day === today) return `Today ${clock(date, tz)}`;
  if (day === yesterday) return `Yesterday ${clock(date, tz)}`;
  const label = new Intl.DateTimeFormat('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' }).format(date);
  return `${label} ${clock(date, tz)}`;
};

export const versionRows = (entries: VersionEntry[], now: Date, tz: string): VersionRow[] =>
  entries.map((entry, index) => {
    const kind = KINDS[entry.kind] ?? { label: entry.kind, tone: 'system' as const };
    const revision = entry.revision ?? 0;
    return {
      key: `${index}:${entry.at}:${entry.kind}:${entry.line_id ?? ''}`,
      kind: entry.kind,
      kindLabel: kind.label,
      tone: kind.tone,
      sentence: entry.sentence,
      when: whenText(entry.at, now, tz),
      diff: entry.kind === 'revision' && entry.line_id && revision > 1 ? { line: entry.line_id, revision } : null
    };
  });

/** The chip on the top bar: how many changes, and when the newest was. */
export const chipText = (page: VersionsPage, now: Date, tz: string): string => {
  if (!page.count) return 'No changes yet';
  const words = `${page.count} change${page.count === 1 ? '' : 's'}`;
  const newest = page.entries[0];
  return newest ? `${words} · ${whenText(newest.at, now, tz)}` : words;
};

const shown = (value: unknown): string => {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  return JSON.stringify(value);
};

export const diffLines = (diff: VersionDiff | null | undefined): string[] => {
  if (!diff) return [];
  return [
    ...diff.changed.map((c) => `${c.key} ${c.field}: ${shown(c.before)} → ${shown(c.after)}`),
    ...diff.added.map((key) => `${key} added`),
    ...diff.removed.map((key) => `${key} removed`)
  ];
};
