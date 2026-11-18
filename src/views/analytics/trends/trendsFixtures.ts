// The days and payloads T13 logged, verbatim (docs/owner-trust-sessions.md, "T13 timeline API" walk), as test fixtures.
import type { TimelineDay, TimelinePayload } from 'api/timeline.api';

export const PAST: TimelineDay = {
  date: '2026-11-17',
  revenue: '459.86',
  revenue_last_year: '459.75',
  weather: { score: '4.3', extremes: [], forecast: false },
  events: [],
  band: null,
  changed: null
};

export const NO_SALES: TimelineDay = {
  date: '2026-11-08',
  revenue: null,
  revenue_last_year: '451.01',
  weather: { score: '2.8', extremes: [], forecast: false },
  events: [],
  band: null,
  changed: null
};

export const TODAY: TimelineDay = {
  date: '2026-11-18',
  revenue: null,
  revenue_last_year: '578.34',
  weather: { score: '6.0', extremes: [], forecast: true },
  events: [],
  band: { expected: '533.90', low: '478.32', high: '589.49' },
  changed: null
};

export const CHANGED: TimelineDay = {
  date: '2026-11-22',
  revenue: null,
  revenue_last_year: '501.10',
  weather: { score: '1.0', extremes: [], forecast: true },
  events: [],
  band: { expected: '313.45', low: '302.43', high: '324.47' },
  changed: { previous: '447.54', current: '313.45', because: 'weather' }
};

export const GATE_FAILED: TimelineDay = { ...CHANGED, band: null, changed: null };

export const ALL_STORES: TimelineDay = {
  date: '2026-11-17',
  revenue: '1450.97',
  revenue_last_year: '1300.00',
  weather: null,
  events: [],
  band: null,
  changed: null
};

export const WITH_EVENT: TimelineDay = {
  ...PAST,
  date: '2026-11-10',
  events: [{ name: 'Back to school', kind: 'spend_window', source: 'spend_window' }]
};

export const SENTENCES = {
  ok: 'The shaded band is the range we expect this store to take each day.',
  not_proven_yet: 'The forecast is not shown because it has not yet been proven accurate for this store.',
  not_enough_history: 'The forecast is not shown because this store does not have a full year of sales yet.',
  pick_a_store: 'Pick a store to see its weather and its forecast.'
} as const;

export const payload = (over: Partial<TimelinePayload> & { days: TimelineDay[] }): TimelinePayload => ({
  scope: 'store',
  store_id: 'store-1',
  store: 'Bloomington',
  currency: 'USD',
  start: over.days[0].date,
  end: over.days[over.days.length - 1].date,
  today: '2026-11-18',
  band_status: 'ok',
  band_sentence: SENTENCES.ok,
  ...over
});

/** A store with a passing gate: history, today and two days ahead, one changed. */
export const STORE_OK = payload({ days: [NO_SALES, PAST, TODAY, { ...TODAY, date: '2026-11-19', revenue_last_year: '400.00' }, CHANGED] });

/** The store whose gate failed. */
export const STORE_NOT_PROVEN = payload({
  store_id: 'store-2',
  store: 'Oklahoma',
  band_status: 'not_proven_yet',
  band_sentence: SENTENCES.not_proven_yet,
  days: [NO_SALES, PAST, { ...TODAY, band: null }, GATE_FAILED]
});

export const ALL = payload({
  scope: 'all_stores',
  store_id: null,
  store: null,
  band_status: 'pick_a_store',
  band_sentence: SENTENCES.pick_a_store,
  days: [{ ...ALL_STORES, date: '2026-11-08', revenue: null }, ALL_STORES, { ...ALL_STORES, date: '2026-11-18', revenue: null }]
});
