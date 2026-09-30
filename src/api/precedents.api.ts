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
  /** P4/P5 fill these; null today. */
  weather: null;
  calendar: null;
  baseline: null;
}

export interface PrecedentsMonth {
  scope: { level: 'company' | 'location'; location_id: string | null; label: string };
  year: number;
  month: number;
  currency: string;
  built_at: string | null;
  days: PrecedentsDay[];
}

export const getPrecedentsMonth = async (year: number, month: number, locationId?: string | null): Promise<PrecedentsMonth> => {
  const headers: Record<string, string> = {};
  if (locationId) headers['X-Location-Id'] = locationId;
  const { data } = await axiosServices.get<PrecedentsMonth>('/precedents/month/', { params: { year, month }, headers });
  return data;
};
