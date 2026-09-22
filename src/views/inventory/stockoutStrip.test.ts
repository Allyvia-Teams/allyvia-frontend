// views/inventory/stockoutStrip.test.ts
//
// The two rules Session 8 added to reorder.ts: which rows are loud enough for
// the landing-page strip, and how a dashboard recommendation is recognised as
// one of the reorder engine's.
//
// They live in reorder.ts so the strip composes the inbox's urgency thresholds
// instead of restating them, and their tests live here so the strip's rules read
// as one list rather than as an appendix to the inbox's 700-line suite.

import { describe, expect, it } from 'vitest';

import {
  REORDER_FOCUS_PARAM,
  REORDER_INBOX_PATH,
  REORDER_ORIGIN,
  ReorderSuggestion,
  readReorderRecommendation,
  reorderInboxHref,
  urgentStockouts
} from './reorder';

const row = (overrides: Partial<ReorderSuggestion>): ReorderSuggestion => ({
  id: '11111111-1111-4111-8111-111111111111',
  status: 'suggested',
  name: 'Linen Shirt',
  location_id: '22222222-2222-4222-8222-222222222222',
  location_name: 'Downtown',
  supplier_id: '33333333-3333-4333-8333-333333333333',
  supplier_name: 'Bellini Textiles',
  forecast_stockout_date: '2026-08-10',
  days_until_stockout: 5,
  lead_time_days: 7,
  suggested_qty: 12,
  ...overrides
});

// ---------------------------------------------------------------------------
describe('urgentStockouts', () => {
  it('shows a stockout inside the lead time as critical and inside twice it as a warning', () => {
    const insideLead = row({ id: 'a', days_until_stockout: 5, lead_time_days: 7, forecast_stockout_date: '2026-08-10' });
    const insideDouble = row({ id: 'b', days_until_stockout: 11, lead_time_days: 7, forecast_stockout_date: '2026-08-16' });

    const urgent = urgentStockouts([insideLead, insideDouble]);

    expect(urgent.map((entry) => entry.urgency.level)).toEqual(['critical', 'warning']);
  });

  it('leaves out a row with more than twice its lead time left, so the strip is not the whole inbox', () => {
    // 30 days against a 7-day restock is the ordinary state of a healthy shelf.
    // A strip that shouted about it would be a strip nobody reads.
    const comfortable = row({ days_until_stockout: 30, lead_time_days: 7 });

    expect(urgentStockouts([comfortable])).toEqual([]);
  });

  it('never shows a row whose stockout date is null, which is the LEAST urgent row there is', () => {
    // A null date means velocity is zero — nothing is selling, so nothing runs
    // out — and the backend sorts it last with nulls_last for exactly that
    // reason. The trap is a sentinel or a coerced 0 reading as "out today": this
    // 400-unit dead style must not merely rank low, it must be absent.
    const notSelling = row({ id: 'dead', forecast_stockout_date: null, days_until_stockout: null, suggested_qty: 400 });
    const real = row({ id: 'real', forecast_stockout_date: '2026-08-10', days_until_stockout: 3 });

    const urgent = urgentStockouts([notSelling, real]);

    expect(urgent.map((entry) => entry.suggestion.id)).toEqual(['real']);
    // And emphatically not the other reading: present, and at the top.
    expect(urgent.map((entry) => entry.suggestion.id)).not.toEqual(['dead', 'real']);
    expect(urgent.some((entry) => entry.suggestion.id === 'dead')).toBe(false);
  });

  it('drops a malformed row that has a days_until_stockout but no date at all', () => {
    // The exclusion is tested on the DATE, not on the derived urgency, so a row
    // that carries a stale day count without the date it was derived from cannot
    // sneak onto the loudest surface in the module.
    const malformed = row({ forecast_stockout_date: null, days_until_stockout: 1 });

    expect(urgentStockouts([malformed])).toEqual([]);
  });

  it('treats an already-passed forecast date as critical rather than as a small number of days', () => {
    // days_until_stockout CAN BE NEGATIVE for a suggestion generated before a
    // date that has since passed. -4 must read as worse than 4, never as nearly
    // in time.
    const overdue = row({ days_until_stockout: -4, lead_time_days: 7 });

    const [entry] = urgentStockouts([overdue]);

    expect(entry.urgency.level).toBe('critical');
    expect(entry.urgency.label).toContain('Overdue');
    expect(entry.urgency.level).not.toBe('warning');
  });

  it('leaves out a row with no lead time to measure against instead of inventing a threshold', () => {
    // Same discipline as stockSeverity returning `ok` with no reorder point set:
    // nobody has said what "close" means for this row, so the strip does not
    // guess. It is still in the inbox, where the buyer can see it in context.
    const noLead = row({ days_until_stockout: 2, lead_time_days: undefined });

    expect(urgentStockouts([noLead])).toEqual([]);
  });

  it('carries the lead-time provenance so a no-supplier row is not described as a delivery estimate', () => {
    // `no_supplier` means lead_time_days is the REVIEW PERIOD standing in for a
    // horizon. The row is still running out and still belongs on the strip, but
    // "restocking takes about 7 days" would be a lie: there is nobody to order
    // from.
    const noSupplier = row({
      days_until_stockout: 5,
      lead_time_days: 7,
      supplier_id: null,
      supplier_name: null,
      rationale: { lead_time_source: 'no_supplier', lead_time_days: 7 }
    });

    const [entry] = urgentStockouts([noSupplier]);

    expect(entry.urgency.level).toBe('critical');
    expect(entry.leadTime.isLeadTime).toBe(false);
    expect(entry.leadTime.label).toBe('No lead time');
  });

  it('keeps the server order and does NOT group the reds above the ambers', () => {
    // A 20-day lead time is critical at 18 days out while a next-day supplier is
    // comfortable at 3, so colour order and date order are genuinely different
    // orders. The backend sorted by forecast_stockout_date ASC and that is the
    // order a buyer works down.
    const soonAmber = row({ id: 'amber', forecast_stockout_date: '2026-08-08', days_until_stockout: 3, lead_time_days: 2 });
    const laterRed = row({ id: 'red', forecast_stockout_date: '2026-08-23', days_until_stockout: 18, lead_time_days: 20 });

    const urgent = urgentStockouts([soonAmber, laterRed]);

    expect(urgent.map((entry) => entry.suggestion.id)).toEqual(['amber', 'red']);
    // The tempting wrong answer: reds first, which puts the later stockout above
    // the sooner one.
    expect(urgent.map((entry) => entry.suggestion.id)).not.toEqual(['red', 'amber']);
  });

  it('is empty for an empty, null or undefined list rather than throwing mid-render', () => {
    expect(urgentStockouts([])).toEqual([]);
    expect(urgentStockouts(null)).toEqual([]);
    expect(urgentStockouts(undefined)).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
describe('reorderInboxHref', () => {
  const SUGGESTION_ID = '44444444-4444-4444-8444-444444444444';
  const LOCATION_ID = '55555555-5555-4555-8555-555555555555';

  it('focuses the inbox on a suggestion, and scopes it to a location when both are known', () => {
    expect(reorderInboxHref(SUGGESTION_ID)).toBe(`${REORDER_INBOX_PATH}?${REORDER_FOCUS_PARAM}=${SUGGESTION_ID}`);
    expect(reorderInboxHref(SUGGESTION_ID, LOCATION_ID)).toBe(
      `${REORDER_INBOX_PATH}?${REORDER_FOCUS_PARAM}=${SUGGESTION_ID}&location_id=${LOCATION_ID}`
    );
  });

  it('refuses to put an id that is not a uuid into the query, because that answers with an HTML 500', () => {
    // The reorder list endpoint feeds ?location_id straight into a UUIDField
    // filter, and Django's ValidationError escapes DRF's handler — the body is
    // HTML, so even the error cannot be read. A degraded link beats that.
    expect(reorderInboxHref('../admin', 'NaN')).toBe(REORDER_INBOX_PATH);
    expect(reorderInboxHref('../admin', 'NaN')).not.toContain('admin');
    expect(reorderInboxHref(null, undefined)).toBe(REORDER_INBOX_PATH);
    expect(reorderInboxHref(42, {})).toBe(REORDER_INBOX_PATH);
  });
});

// ---------------------------------------------------------------------------
describe('readReorderRecommendation', () => {
  const SUGGESTION_ID = '44444444-4444-4444-8444-444444444444';
  const LOCATION_ID = '55555555-5555-4555-8555-555555555555';

  const signals = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
    origin: REORDER_ORIGIN,
    category: 'restock',
    sources: ['inventory:LINEN-01'],
    target_skus: ['LINEN-01'],
    location_id: LOCATION_ID,
    suggestion_id: SUGGESTION_ID,
    ...overrides
  });

  it('recognises the engine’s own payload and links to the focused suggestion', () => {
    const reading = readReorderRecommendation(signals());

    expect(reading.isReorder).toBe(true);
    expect(reading.suggestionId).toBe(SUGGESTION_ID);
    expect(reading.skus).toEqual(['LINEN-01']);
    expect(reading.href).toBe(`${REORDER_INBOX_PATH}?${REORDER_FOCUS_PARAM}=${SUGGESTION_ID}&location_id=${LOCATION_ID}`);
  });

  it('leaves every other recommendation exactly as it was — no link at all', () => {
    // The requirement is that only inventory recommendations gain a link. A
    // weather or CRM recommendation must not quietly acquire one, so `href` is
    // null rather than a bare inbox path that would send the reader somewhere
    // unrelated to what they just read.
    const reading = readReorderRecommendation({ origin: 'weather', category: 'promotion', target_skus: ['LINEN-01'] });

    expect(reading.isReorder).toBe(false);
    expect(reading.href).toBeNull();
    expect(reading.href).not.toBe(REORDER_INBOX_PATH);
  });

  it('decides on origin alone, so a restock category from another generator is not claimed', () => {
    // 'restock' is an ordinary English word another generator could reasonably
    // pick; `origin` is the engine's own literal and is the only identity.
    const reading = readReorderRecommendation({ category: 'restock', suggestion_id: SUGGESTION_ID });

    expect(reading.isReorder).toBe(false);
    expect(reading.href).toBeNull();
  });

  it('drops a malformed suggestion id instead of forwarding it into a query that 500s', () => {
    // A non-uuid ?location_id / ?suggestion is an UNCAUGHT HTML 500 on the
    // reorder list endpoint, so a deep link carrying garbage is a stack trace
    // rather than a page. The link degrades to the unfocused inbox.
    const reading = readReorderRecommendation(signals({ suggestion_id: 'not-a-uuid', location_id: '  ' }));

    expect(reading.isReorder).toBe(true);
    expect(reading.suggestionId).toBeNull();
    expect(reading.href).toBe(REORDER_INBOX_PATH);
    expect(reading.href).not.toContain('not-a-uuid');
  });

  it('still links to the right store when only the location survives', () => {
    const reading = readReorderRecommendation(signals({ suggestion_id: null }));

    expect(reading.href).toBe(`${REORDER_INBOX_PATH}?location_id=${LOCATION_ID}`);
    expect(reading.href).not.toContain(REORDER_FOCUS_PARAM);
  });

  it('survives every malformed signal_sources a loosely typed JSONField can hold', () => {
    // signal_sources is a free Record<string, unknown> shared with every other
    // generator, and this runs inside a render: a throw here blanks the whole
    // dashboard, so the function is total.
    [null, undefined, 'inventory_reorder', 42, [], ['inventory_reorder'], {}].forEach((value) => {
      const reading = readReorderRecommendation(value);
      expect(reading.isReorder).toBe(false);
      expect(reading.href).toBeNull();
    });
  });

  it('reads a non-array target_skus as no skus rather than letting it block the link', () => {
    const reading = readReorderRecommendation(signals({ target_skus: 'LINEN-01' }));

    expect(reading.skus).toEqual([]);
    // The link is what the requirement is about; the skus are only a label.
    expect(reading.href).toContain(REORDER_FOCUS_PARAM);
  });

  it('ignores blank and non-string entries in target_skus', () => {
    const reading = readReorderRecommendation(signals({ target_skus: ['LINEN-01', '', '  ', 7, null, ' WOOL-02 '] }));

    expect(reading.skus).toEqual(['LINEN-01', 'WOOL-02']);
  });
});
