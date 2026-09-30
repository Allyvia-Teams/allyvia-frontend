// The precedents chart's P4 overlays: the blue weather line, the purple spend
// windows, holiday marks and the month's macro sentence (context-graph P4).
//
// The P3 rule holds for weather too: NO SCORE IS A GAP, NEVER A ZERO. A day
// with no weather row, or a row the backend left unscored (a missing input,
// too little history), is null in the series. Forecast days get their own
// dashed line, joined to the last actual so the two halves meet.

import type { PrecedentsMonth } from 'api/precedents.api';

import { daysInMonth } from './precedentsSeries';

/** The mock's weather and holiday tokens (Allyvia-Precedence-Charts.html). */
export const WEATHER_LINE = { light: '#2a6fd6', dark: '#5a93ec' } as const;
export const HOLIDAY = { light: '#5b49d0', dark: '#8f82ee' } as const;

function slot(iso: string): number | null {
  const m = /^\d{4}-\d{2}-(\d{2})$/.exec(iso);
  return m ? Number(m[1]) : null;
}

export interface WeatherSeries {
  actual: (number | null)[];
  forecast: (number | null)[];
  hasAny: boolean;
  hasForecast: boolean;
}

export function weatherSeries(month: PrecedentsMonth): WeatherSeries {
  const n = daysInMonth(month.year, month.month);
  const actual: (number | null)[] = Array.from({ length: n }, () => null);
  const forecast: (number | null)[] = Array.from({ length: n }, () => null);
  for (const day of month.days) {
    const d = slot(day.date);
    const w = day.weather;
    if (d === null || d < 1 || d > n || !w || w.score === null) continue;
    const value = Number(w.score);
    if (!Number.isFinite(value)) continue;
    (w.forecast ? forecast : actual)[d - 1] = value;
  }
  // Join the dashed forecast to the last actual point before it.
  for (let i = 1; i < n; i += 1) {
    if (forecast[i] !== null && forecast[i - 1] === null && actual[i - 1] !== null) forecast[i - 1] = actual[i - 1];
  }
  return {
    actual,
    forecast,
    hasAny: actual.some((v) => v !== null) || forecast.some((v) => v !== null),
    hasForecast: forecast.some((v) => v !== null)
  };
}

export interface DayRange {
  from: number;
  to: number;
  name: string;
}

/** Spend windows as 1-based day ranges clipped to the month. */
export function spendWindows(month: PrecedentsMonth): DayRange[] {
  const n = daysInMonth(month.year, month.month);
  const first = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
  const last = `${month.year}-${String(month.month).padStart(2, '0')}-${String(n).padStart(2, '0')}`;
  return month.windows
    .filter((w) => w.window_end >= first && w.window_start <= last)
    .map((w) => ({
      from: w.window_start < first ? 1 : (slot(w.window_start) ?? 1),
      to: w.window_end > last ? n : (slot(w.window_end) ?? n),
      name: w.name
    }));
}

export function holidayMarks(month: PrecedentsMonth): { day: number; name: string }[] {
  const seen = new Set<string>();
  const out: { day: number; name: string }[] = [];
  for (const day of month.days) {
    const d = slot(day.date);
    if (d === null) continue;
    for (const event of day.calendar) {
      if (event.kind !== 'holiday' || seen.has(`${d}:${event.name}`)) continue;
      seen.add(`${d}:${event.name}`);
      out.push({ day: d, name: event.name });
    }
  }
  return out;
}

function movement(pct: string): string {
  const value = Number(pct);
  const size = Math.abs(value).toFixed(1);
  return value < 0 ? `down ${size}%` : `up ${size}%`;
}

/** One sentence for the month's national reference — observe-only, never
 * presented as this store's economy. Null when there is nothing to say. */
export function macroSentence(month: PrecedentsMonth): string | null {
  const m = month.macro;
  if (m.available && m.category_nominal_yoy_pct !== null) {
    let sentence = `US clothing-store sales were ${movement(m.category_nominal_yoy_pct)} on a year earlier`;
    if (m.category_real_yoy_pct !== null && m.apparel_inflation_yoy_pct !== null) {
      const inflation = Number(m.apparel_inflation_yoy_pct);
      const prices = `${inflation < 0 ? 'fell' : 'rose'} ${Math.abs(inflation).toFixed(1)}%`;
      sentence += ` (${movement(m.category_real_yoy_pct)} after apparel prices ${prices})`;
    }
    return `${sentence} — a national reference, not this store.`;
  }
  if (m.reason === 'not_yet_published') return "The national reference for this month isn't published yet.";
  if (m.reason === 'country_unknown') return "Add the company's country in Settings to see the national reference.";
  if (m.reason === 'unsupported_geography') return 'There is no national reference for this country yet.';
  return null;
}
