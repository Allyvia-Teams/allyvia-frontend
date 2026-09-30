// Precedents — the per-store day facts (context-graph P3).
//
// Mirrors backend/app/precedents/views.py. One month of persisted rows for the
// scope the backend's LocationHeaderMiddleware resolves from `X-Location-Id`:
// a store when the header is sent, the company ("All stores") when it is not.
// This branch has no axios interceptor for that header yet (multi-location S6
// adds one), so the call sets it itself — and OMITS it for All, never sends an
// empty value, which the middleware would answer with a 404.
//
// Money arrives as a decimal STRING or null. Null means the day was not
// observed (or not built yet) — unknown, never zero.

import axiosServices from 'utils/axios';

export interface PrecedentsAlert {
  event: string;
  severity: string;
  onset: string | null;
  ends: string | null;
}

/** One store's sky for the day (P4). Null for All stores in a multi-store company. */
export interface PrecedentsWeather {
  /** 0–10 as a 1-dp string; null = unscored (a missing input or too little history). */
  score: string | null;
  score_version: number;
  score_reason: string;
  forecast: boolean;
  temp_high_f: string | null;
  temp_low_f: string | null;
  precip_mm: string | null;
  snow_cm: string | null;
  wind_max_kmh: string | null;
  alerts: PrecedentsAlert[];
  /** False where the NWS feed did not cover the day (history, non-US). */
  alerts_covered: boolean;
}

export interface PrecedentsEvent {
  kind: 'holiday' | 'spend_window' | 'closure' | 'owner_declared';
  key: string;
  name: string;
  window_start: string;
  window_end: string;
}

export interface PrecedentsMacro {
  available: boolean;
  reason: string | null;
  month: string;
  mode: 'observe';
  basis: string;
  category_nominal_yoy_pct: string | null;
  category_real_yoy_pct: string | null;
  apparel_inflation_yoy_pct: string | null;
  vintage_date: string | null;
  latest_period_start: string | null;
}

export interface PrecedentsDay {
  date: string;
  revenue: string | null;
  tickets: number | null;
  units: number | null;
  refunds: string | null;
  cogs: string | null;
  gross_profit: string | null;
  observed: boolean;
  excluded_from_learning: boolean;
  is_outlier: boolean;
  built: boolean;
  weather: PrecedentsWeather | null;
  calendar: PrecedentsEvent[];
  /** P5 fills it; null today. */
  baseline: null;
}

export interface PrecedentsMonth {
  scope: { level: 'company' | 'location'; location_id: string | null; label: string };
  year: number;
  month: number;
  currency: string;
  built_at: string | null;
  /** Set for All stores in a multi-store company: weather is per store, never averaged. */
  weather_note: string | null;
  /** Spend windows overlapping the month (the purple bars). */
  windows: PrecedentsEvent[];
  /** The month's national reference, observe-only. */
  macro: PrecedentsMacro;
  days: PrecedentsDay[];
}

export const getPrecedentsMonth = async (year: number, month: number, locationId?: string | null): Promise<PrecedentsMonth> => {
  const headers: Record<string, string> = {};
  if (locationId) headers['X-Location-Id'] = locationId;
  const { data } = await axiosServices.get<PrecedentsMonth>('/precedents/month/', { params: { year, month }, headers });
  return data;
};
