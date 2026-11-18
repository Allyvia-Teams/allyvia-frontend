// The Trends chart's read API (owner trust T13; backend/app/precedents/timeline.py):
// `GET /api/v1/precedents/timeline/?start=&end=`.
//
// One store (the request's `X-Location-Id`) or, with no header, all stores (revenue and events only). Money and
// scores are decimal STRINGS; revenue, weather, band and changed can each be null, and null is "unknown", never zero.
// The server refuses a range over 400 days with a 400 and a sentence in `detail`.

import axiosServices from 'utils/axios';

export type TimelineScope = 'store' | 'all_stores';
export type TimelineBandStatus = 'ok' | 'not_proven_yet' | 'not_enough_history' | 'pick_a_store';
export type TimelineEventSource = 'holiday' | 'spend_window' | 'local_event' | 'owner' | 'other';
export type TimelineBecause = 'weather' | 'calendar' | 'history';

export interface TimelineEvent {
  name: string;
  kind: string;
  source: TimelineEventSource;
}

export interface TimelineWeather {
  /** 0 to 10 for this time of year here, one decimal; null when it could not be scored. */
  score: string | null;
  /** [] = checked and calm, null = not classifiable. */
  extremes: string[] | null;
  /** True for a day ahead (the night's forecast), false for one that happened. */
  forecast: boolean;
}

export interface TimelineBand {
  expected: string;
  low: string | null;
  high: string | null;
}

export interface TimelineChanged {
  previous: string;
  current: string;
  because: TimelineBecause;
}

export interface TimelineDay {
  date: string;
  revenue: string | null;
  revenue_last_year: string | null;
  weather: TimelineWeather | null;
  events: TimelineEvent[];
  band: TimelineBand | null;
  changed: TimelineChanged | null;
}

export interface TimelinePayload {
  scope: TimelineScope;
  store_id: string | null;
  store: string | null;
  currency: string;
  start: string;
  end: string;
  today: string;
  band_status: TimelineBandStatus;
  /** One plain sentence for the status; printed as is. */
  band_sentence: string;
  days: TimelineDay[];
}

export interface TimelineQuery {
  start: string;
  end: string;
  /** The store, sent as `X-Location-Id`. Null or empty = all stores. */
  locationId?: string | null;
}

/** The request's headers: a store is the header, all stores is NO header. */
export const timelineHeaders = (locationId?: string | null): Record<string, string> => (locationId ? { 'X-Location-Id': locationId } : {});

export const TimelineAPI = {
  get: async ({ start, end, locationId }: TimelineQuery): Promise<TimelinePayload> => {
    const { data } = await axiosServices.get<TimelinePayload>('/precedents/timeline/', {
      params: { start, end },
      headers: timelineHeaders(locationId)
    });
    return data;
  }
};

/** The sentence from a refused request (400's `detail`), else null. */
export const timelineRefusal = (error: unknown): string | null => {
  const response = (error as { response?: { status?: number; data?: { detail?: unknown } } })?.response;
  return response?.status === 400 && typeof response.data?.detail === 'string' ? response.data.detail : null;
};

/** A 404 for a store means this role does not have it. */
export const isStoreRefused = (error: unknown): boolean => (error as { response?: { status?: number } })?.response?.status === 404;
