// Everything the Trends page says and draws, decided here. Pure; the components only place it.
//
// From the timeline payload and the lines she chose it builds the chart's series, the event marks, the day
// panel's sentences and the one colour each line wears everywhere (chart, picker, panel).

import type { TimelineChanged, TimelineDay, TimelineEvent, TimelinePayload } from 'api/timeline.api';

// ---- the lines -------------------------------------------------------------

export type LineKey = 'sales' | 'lastYear' | 'range' | 'weather' | 'events';

export const LINES: ReadonlyArray<{ key: LineKey; label: string }> = [
  { key: 'sales', label: 'Sales' },
  { key: 'lastYear', label: 'Last year' },
  { key: 'range', label: 'Expected range' },
  { key: 'weather', label: 'Weather' },
  { key: 'events', label: 'Events' }
];

export const lineLabel = (key: LineKey): string => LINES.find((l) => l.key === key)?.label ?? key;

/** Sales is always on; everything else is hers to switch. */
export const DEFAULT_LINES: ReadonlyArray<LineKey> = ['sales', 'lastYear', 'range', 'weather', 'events'];

export interface LineAvailability {
  available: boolean;
  /** Why not, in a clause the menu can print. */
  reason: string | null;
}

/** Which lines exist at all for this payload. */
export function availability(
  payload: Pick<TimelinePayload, 'scope' | 'band_status' | 'band_sentence' | 'days'> | undefined
): Record<LineKey, LineAvailability> {
  const yes: LineAvailability = { available: true, reason: null };
  if (!payload) return { sales: yes, lastYear: yes, range: yes, weather: yes, events: yes };
  const allStores = payload.scope === 'all_stores';
  const hasBand = payload.band_status === 'ok' && payload.days.some((d) => d.band !== null);
  return {
    sales: yes,
    lastYear: yes,
    range: hasBand
      ? yes
      : { available: false, reason: allStores ? 'Pick a store to see its forecast' : forecastReason(payload.band_status) },
    weather: allStores ? { available: false, reason: 'Weather is per store. Pick a store to see it' } : yes,
    events: yes
  };
}

function forecastReason(status: TimelinePayload['band_status']): string {
  if (status === 'not_enough_history') return 'This store needs a full year of sales first';
  if (status === 'pick_a_store') return 'Pick a store to see its forecast';
  return 'Not shown until it has been proven accurate for this store';
}

/** The lines drawn: the ones she chose that exist for this payload. Sales always. */
export function visibleLines(chosen: ReadonlyArray<LineKey>, payload: Parameters<typeof availability>[0]): LineKey[] {
  const exists = availability(payload);
  return LINES.map((l) => l.key).filter((key) => key === 'sales' || (chosen.includes(key) && exists[key].available));
}

// ---- remembered choices ----------------------------------------------------

export const STORAGE_KEY = 'allyvia.trends.lines.v1';

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>;

const isLine = (value: unknown): value is LineKey => LINES.some((l) => l.key === value);

/** Her saved lines, or the defaults when there is nothing usable. Never throws. */
export function readLines(storage?: StorageLike | null): LineKey[] {
  try {
    const raw = storage?.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    if (Array.isArray(parsed)) return withSales(parsed.filter(isLine));
  } catch {
    // storage blocked or the value is not ours: fall through
  }
  return [...DEFAULT_LINES];
}

export function writeLines(lines: ReadonlyArray<LineKey>, storage?: StorageLike | null): void {
  try {
    storage?.setItem(STORAGE_KEY, JSON.stringify(withSales(lines)));
  } catch {
    // remembering is a convenience
  }
}

const withSales = (lines: ReadonlyArray<LineKey>): LineKey[] => LINES.map((l) => l.key).filter((k) => k === 'sales' || lines.includes(k));

export function toggleLine(chosen: ReadonlyArray<LineKey>, key: LineKey): LineKey[] {
  if (key === 'sales') return withSales(chosen);
  return withSales(chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key]);
}

// ---- colours ---------------------------------------------------------------

export interface ThemeColours {
  palette: {
    primary: { main: string };
    secondary: { main: string };
    info: { main: string };
    grey: { 500: string; 700: string };
  };
}

/** One colour per line, defined once. Last year is dashed grey on the chart. */
export function lineColours(theme: ThemeColours): Record<LineKey, string> {
  return {
    sales: theme.palette.primary.main,
    lastYear: theme.palette.grey[500],
    range: theme.palette.secondary.main,
    weather: theme.palette.info.main,
    events: theme.palette.grey[700]
  };
}

// ---- the chart -------------------------------------------------------------

const num = (value: string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : null;
};

export const dayMs = (iso: string): number => Date.parse(`${iso}T00:00:00Z`);

export const WEATHER_AXIS = { min: 0, max: 10 } as const;
export const WEATHER_HINT = '0 is the worst weather for this time of year here, 10 the best.';

export interface RangePoint {
  low: number | null;
  high: number | null;
  expected: number | null;
}

export type EventMark = { kind: 'marker'; date: string; names: string[] } | { kind: 'span'; start: string; end: string; name: string };

export interface ChartModel {
  dates: string[];
  /** A day with no sales data is null: a gap, never zero and never joined across. */
  sales: Array<number | null>;
  lastYear: Array<number | null>;
  /** Present only when the forecast is proven (band_status ok); starts at today. */
  range: RangePoint[] | null;
  weather: Array<number | null> | null;
  events: EventMark[];
  /** The index of today in `dates`, or null when the range does not include it. */
  todayIndex: number | null;
  lines: LineKey[];
}

export function buildChart(payload: TimelinePayload, chosen: ReadonlyArray<LineKey>): ChartModel {
  const lines = visibleLines(chosen, payload);
  const days = payload.days;
  const dates = days.map((d) => d.date);
  const has = (key: LineKey) => lines.includes(key);
  const todayIndex = dates.indexOf(payload.today);
  return {
    dates,
    sales: days.map((d) => num(d.revenue)),
    lastYear: has('lastYear') ? days.map((d) => num(d.revenue_last_year)) : days.map(() => null),
    range:
      has('range') && payload.band_status === 'ok'
        ? days.map((d) =>
            d.date >= payload.today && d.band
              ? { low: num(d.band.low), high: num(d.band.high), expected: num(d.band.expected) }
              : { low: null, high: null, expected: null }
          )
        : null,
    weather: has('weather') && payload.scope === 'store' ? days.map((d) => num(d.weather?.score)) : null,
    events: has('events') ? eventMarks(days) : [],
    todayIndex: todayIndex >= 0 ? todayIndex : null,
    lines
  };
}

const nextDay = (iso: string): string => new Date(dayMs(iso) + 86_400_000).toISOString().slice(0, 10);

const eventKey = (e: TimelineEvent): string => `${e.source}|${e.kind}|${e.name}`;

/**
 * One mark per thing happening: an event over several days in a row is one span, and every one-day event on the
 * same day shares one marker (so two events on a day read as one marker with both names).
 */
export function eventMarks(days: ReadonlyArray<Pick<TimelineDay, 'date' | 'events'>>): EventMark[] {
  const runs = new Map<string, { name: string; start: string; end: string }[]>();
  const open = new Map<string, { name: string; start: string; end: string }>();
  for (const day of days) {
    const seen = new Set<string>();
    for (const event of day.events) {
      const key = eventKey(event);
      if (seen.has(key)) continue;
      seen.add(key);
      const run = open.get(key);
      if (run && nextDay(run.end) === day.date) {
        run.end = day.date;
      } else {
        const fresh = { name: event.name, start: day.date, end: day.date };
        open.set(key, fresh);
        runs.set(key, [...(runs.get(key) ?? []), fresh]);
      }
    }
  }
  const spans: EventMark[] = [];
  const singles = new Map<string, string[]>();
  for (const list of runs.values()) {
    for (const run of list) {
      if (run.start === run.end) singles.set(run.start, [...(singles.get(run.start) ?? []), run.name]);
      else spans.push({ kind: 'span', start: run.start, end: run.end, name: run.name });
    }
  }
  const markers: EventMark[] = [...singles.entries()].map(([date, names]) => ({ kind: 'marker', date, names }));
  const start = (m: EventMark) => (m.kind === 'span' ? m.start : m.date);
  return [...spans, ...markers].sort((a, b) => start(a).localeCompare(start(b)));
}

/** The forecast's sentence from the server, once, where the forecast would start; null when the range ends before today. */
export function forecastNote(payload: Pick<TimelinePayload, 'band_status' | 'band_sentence' | 'today' | 'end'>): string | null {
  if (payload.band_status === 'ok' || !payload.band_sentence) return null;
  return payload.end >= payload.today ? payload.band_sentence : null;
}

/** Nothing at all to draw: no sales, no last year, no range, no weather, no events. */
export const hasNothing = (model: ChartModel): boolean =>
  model.sales.every((v) => v === null) &&
  model.lastYear.every((v) => v === null) &&
  (model.range?.every((r) => r.expected === null && r.low === null) ?? true) &&
  (model.weather?.every((v) => v === null) ?? true) &&
  model.events.length === 0;

/** No sales data anywhere in the range. */
export const hasNoSales = (payload: Pick<TimelinePayload, 'days'>): boolean => payload.days.every((d) => num(d.revenue) === null);

// ---- the day panel ---------------------------------------------------------

const EXTREME_WORDS: Record<string, string> = {
  thunderstorm: 'thunderstorm',
  winter_storm: 'winter storm',
  heavy_rain: 'heavy rain',
  extreme_heat: 'extreme heat',
  extreme_cold: 'extreme cold'
};

/** The extremes in words. Empty and null say nothing. */
export function extremeWords(extremes: ReadonlyArray<string> | null | undefined): string[] {
  return (extremes ?? []).map((key) => EXTREME_WORDS[key] ?? key.replace(/_/g, ' '));
}

const list = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

export function money(value: number | null, currency: string, cents: boolean): string {
  if (value === null) return '—';
  let code = /^[A-Z]{3}$/.test(currency) ? currency : 'USD';
  const digits = cents ? 2 : 0;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  } catch {
    code = 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(value);
  }
}

const exact = (value: string | null, currency: string) => money(num(value), currency, true);
const whole = (value: string | null, currency: string) => money(num(value), currency, false);

const BECAUSE: Partial<Record<TimelineChanged['because'], string>> = {
  weather: 'because the weather forecast changed',
  calendar: 'because of a change in the calendar'
};

/** A change is shown only when the weather or the calendar moved it ("history" fires for the weekday just learned). */
export const showsChange = (changed: TimelineChanged | null | undefined): changed is TimelineChanged =>
  !!changed && (changed.because === 'weather' || changed.because === 'calendar');

export function heading(iso: string): string {
  return new Date(dayMs(iso)).toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC'
  });
}

export interface PanelLine {
  /** Which line this sentence is about, so the panel wears that line's colour. */
  line: LineKey;
  text: string;
}

export interface DayPanel {
  date: string;
  heading: string;
  lines: PanelLine[];
}

export function dayPanel(day: TimelineDay, payload: Pick<TimelinePayload, 'scope' | 'currency' | 'today' | 'band_status'>): DayPanel {
  const cur = payload.currency;
  const lines: PanelLine[] = [];
  const add = (line: LineKey, text: string) => lines.push({ line, text });
  const past = day.date < payload.today;
  const isToday = day.date === payload.today;

  if (past || isToday) {
    if (num(day.revenue) !== null) add('sales', `Took ${exact(day.revenue, cur)}.`);
    else add('sales', isToday ? 'No sales recorded yet today.' : 'No sales data for this day.');
    add(
      'lastYear',
      num(day.revenue_last_year) !== null
        ? `Same weekday last year: ${exact(day.revenue_last_year, cur)}.`
        : 'No sales data for the same weekday last year.'
    );
  } else if (num(day.revenue_last_year) !== null) {
    add('lastYear', `Same weekday last year: ${exact(day.revenue_last_year, cur)}.`);
  }

  if (payload.scope === 'store' && day.weather) {
    const score = num(day.weather.score);
    if (score !== null)
      add('weather', `${day.weather.forecast ? 'Forecast weather' : 'Weather'}: ${score.toFixed(1)} out of 10 for this time of year.`);
    const words = extremeWords(day.weather.extremes);
    if (words.length) add('weather', `${day.weather.forecast ? 'Extreme weather expected' : 'Extreme weather'}: ${list(words)}.`);
  }

  if (day.events.length) {
    const names = day.events.map((e) => e.name);
    add('events', `${names.length === 1 ? 'Event' : 'Events'}: ${list(names)}.`);
  }

  if (day.band && payload.band_status === 'ok') {
    const expected = whole(day.band.expected, cur);
    add(
      'range',
      num(day.band.low) !== null && num(day.band.high) !== null
        ? `Expected about ${expected}, between ${whole(day.band.low, cur)} and ${whole(day.band.high, cur)}.`
        : `Expected about ${expected}.`
    );
    if (showsChange(day.changed)) {
      add(
        'range',
        `Yesterday we expected about ${whole(day.changed.previous, cur)}. Now about ${whole(day.changed.current, cur)}, ${BECAUSE[day.changed.because]}.`
      );
    }
  }

  return { date: day.date, heading: heading(day.date), lines };
}

// ---- keyboard --------------------------------------------------------------

/** The next selected day for a key, kept inside the range; null for a key that does nothing. */
export function stepDay(index: number | null, length: number, key: string): number | null {
  if (length <= 0) return null;
  const last = length - 1;
  const from = index ?? 0;
  switch (key) {
    case 'ArrowLeft':
      return index === null ? last : Math.max(0, from - 1);
    case 'ArrowRight':
      return index === null ? 0 : Math.min(last, from + 1);
    case 'PageUp':
      return Math.max(0, from - 7);
    case 'PageDown':
      return Math.min(last, from + 7);
    case 'Home':
      return 0;
    case 'End':
      return last;
    default:
      return null;
  }
}
