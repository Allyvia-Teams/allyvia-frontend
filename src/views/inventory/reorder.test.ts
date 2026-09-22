import { describe, expect, it } from 'vitest';

import {
  APPLY_REORDER_POINT_NOTE,
  DISMISSAL_REASON_MAX_LENGTH,
  NON_ADMIN_REORDER_NOTICE,
  NO_SUPPLIER_GROUP_LABEL,
  PURCHASE_ORDERS_ROUTE,
  REGENERATE_NOTE,
  Rationale,
  ReorderSuggestion,
  applyReorderPointPayload,
  checkRationaleArithmetic,
  compareForServerOrder,
  coverageOfTarget,
  createPoPayload,
  describeCreatedOrders,
  describeDismissal,
  describeLeadTime,
  describePolicy,
  describeStockout,
  dismissPayload,
  formatCoverage,
  isInServerOrder,
  normalizeReorderResponse,
  previewPurchaseOrders,
  purchaseOrderRoute,
  readCreatedPurchaseOrders,
  readRationale,
  readRationaleMeta,
  reorderListQuery,
  reorderStatusColor,
  reorderStatusLabel,
  reorderUrgency,
  sortForServerOrder,
  validateSelection
} from './reorder';
import { EM_DASH } from './stockFormat';

// A real suggestion's working, key for key: 1.25 a day over a 24-day horizon is
// 30 units of demand, less 8 on the shelf and 4 already coming, gives 18.
const RATIONALE: Record<string, unknown> = {
  formula: 'ceil(velocity x (lead_time + review_period + safety)) - on_hand - on_order, floored at 0',
  forecast_provider: 'velocity',
  velocity_window_days: 28,
  velocity_recent_half_days: 14,
  velocity_recent_weight: '2',
  velocity_daily: '1.2500',
  lead_time_days: 14,
  lead_time_source: 'observed_median',
  lead_time_observations: [12, 14, 16, 31],
  review_period_days: 7,
  safety_days: 3,
  horizon_days: 24,
  target_units: '30.0000',
  target_qty: 30,
  on_hand: 8,
  on_order: 4,
  suggested_qty: 18,
  days_of_cover: '6.40',
  supplier_name: 'Bellini Textiles',
  generated_for_date: '2026-08-05'
};

const without = (key: string): Rationale => {
  const copy = { ...RATIONALE };
  delete copy[key];
  return copy;
};

const stepFor = (rationale: Rationale, key: string) => readRationale(rationale).find((step) => step.key === key)!;

const SUPPLIER_A = '11111111-1111-4111-8111-111111111111';
const SUPPLIER_B = '22222222-2222-4222-8222-222222222222';
const LOCATION_A = '33333333-3333-4333-8333-333333333333';
const LOCATION_B = '44444444-4444-4444-8444-444444444444';

let rowSeed = 0;
const row = (over: Partial<ReorderSuggestion> = {}): ReorderSuggestion => {
  rowSeed += 1;
  return {
    id: `aaaaaaaa-aaaa-4aaa-8aaa-${String(rowSeed).padStart(12, '0')}`,
    status: 'suggested',
    name: 'Linen Shirt',
    location_id: LOCATION_A,
    location_name: 'Downtown',
    supplier_id: SUPPLIER_A,
    supplier_name: 'Bellini Textiles',
    forecast_stockout_date: '2026-08-09',
    suggested_qty: 18,
    ...over
  };
};

// ---------------------------------------------------------------------------
describe('readRationale', () => {
  it('reconstructs the formula in the order a person reads it', () => {
    // velocity, the three spans that make the horizon, the multiplication, the
    // two subtractions, the answer. Anything else is not a checkable sum.
    expect(readRationale(RATIONALE).map((step) => step.key)).toEqual([
      'velocity_daily',
      'lead_time_days',
      'review_period_days',
      'safety_days',
      'horizon_days',
      'target_units',
      'target_qty',
      'on_hand',
      'on_order',
      'suggested_qty'
    ]);
  });

  it('renders every figure at the precision the API sent it', () => {
    expect(readRationale(RATIONALE).map((step) => step.value)).toEqual([
      '1.2500 a day',
      '14 days',
      '7 days',
      '3 days',
      '24 days',
      '30.0000 units',
      '30 units',
      '8 units',
      '4 units',
      '18 units'
    ]);
  });

  it('carries the operators that make the arithmetic readable down the column', () => {
    const operators = readRationale(RATIONALE).map((step) => step.operator);
    expect(operators).toEqual([undefined, undefined, '+', '+', '=', '×', '=', '−', '−', '=']);
  });

  it('names the velocity window and the recency weighting, flagging the weight the API does not send', () => {
    const step = stepFor(RATIONALE, 'velocity_daily');
    expect(step.detail).toContain('last 28 days');
    expect(step.detail).toContain('most recent 14');
    expect(step.detail).toContain('2x');
    // The older half's weight of 1 is implied by the engine, never transmitted —
    // so it is labelled as implied rather than stated as data.
    expect(step.detail).toContain('implied, not sent');
  });

  it('degrades a missing key to an em dash, NEVER to a fabricated zero', () => {
    // A fabricated 0 would read as "the engine measured nothing on the shelf",
    // which is a different fact and changes what somebody buys.
    const step = stepFor(without('on_hand'), 'on_hand');
    expect(step.value).toBe(EM_DASH);
    expect(step.known).toBe(false);
    expect(step.value).not.toBe('0 units');
    expect(step.value).not.toContain('0');
    expect(step.value).not.toContain('undefined');
    expect(step.detail).toContain('did not record');
  });

  it('keeps a missing step in the list rather than silently shortening the sum', () => {
    // A shorter list looks like a complete sum with fewer terms.
    expect(readRationale(without('target_qty'))).toHaveLength(10);
    expect(readRationale(undefined)).toHaveLength(10);
    expect(readRationale(undefined).every((step) => step.known === false)).toBe(true);
    expect(readRationale(null).every((step) => step.value === EM_DASH)).toBe(true);
  });

  it('renders a real zero as 0, because zero on hand is a measurement', () => {
    const step = stepFor({ ...RATIONALE, on_hand: 0 }, 'on_hand');
    expect(step.value).toBe('0 units');
    expect(step.known).toBe(true);
  });

  it('does not call the no-supplier stand-in a lead time', () => {
    const step = stepFor({ ...RATIONALE, lead_time_source: 'no_supplier', lead_time_days: 7 }, 'lead_time_days');
    expect(step.label).toBe('Stand-in for a lead time');
    expect(step.label).not.toBe('Lead time');
  });
});

// ---------------------------------------------------------------------------
describe('checkRationaleArithmetic', () => {
  it('confirms the server figure when the parts reproduce it', () => {
    const check = checkRationaleArithmetic(RATIONALE);
    expect(check.verdict).toBe('agrees');
    expect(check.recomputed).toBe(18);
    expect(check.reported).toBe(18);
    expect(check.message).toContain('reproduce');
  });

  it('SAYS SO when the parts do not reproduce the server figure', () => {
    // A shown sum that does not add up is worse than no sum: it looks checked.
    const check = checkRationaleArithmetic({ ...RATIONALE, suggested_qty: 25 });
    expect(check.verdict).toBe('disagrees');
    expect(check.verdict).not.toBe('agrees');
    expect(check.recomputed).toBe(18);
    expect(check.reported).toBe(25);
    expect(check.message).toContain('do not add up');
    expect(check.message).toContain('unverified');
  });

  it('recomputes from the ATOMIC parts, so a wrong intermediate is caught too', () => {
    // horizon_days and target_qty are printed on screen but are not inputs here;
    // a rationale whose horizon disagrees with its own spans still fails.
    const check = checkRationaleArithmetic({ ...RATIONALE, horizon_days: 900, target_qty: 900 });
    expect(check.verdict).toBe('agrees');
    expect(check.recomputed).toBe(18);
  });

  it('refuses to guess when a part is missing, rather than treating it as zero', () => {
    const check = checkRationaleArithmetic(without('on_order'));
    expect(check.verdict).toBe('incomplete');
    expect(check.recomputed).toBeNull();
    // Zeroing on_order would have produced 22 and called it verified.
    expect(check.recomputed).not.toBe(22);
    expect(check.message).toContain('cannot be re-checked');
    expect(checkRationaleArithmetic(undefined).verdict).toBe('incomplete');
  });

  it('uses exact decimal arithmetic, so a float artefact cannot add a garment', () => {
    // 0.07 * 100 is 7.000000000000001 in IEEE 754, and Math.ceil of that is 8.
    // The engine's Decimal maths gives exactly 7.
    expect(Math.ceil(0.07 * 100)).toBe(8);
    const check = checkRationaleArithmetic({
      ...RATIONALE,
      velocity_daily: '0.0700',
      lead_time_days: 100,
      review_period_days: 0,
      safety_days: 0,
      on_hand: 0,
      on_order: 0,
      suggested_qty: 7
    });
    expect(check.recomputed).toBe(7);
    expect(check.recomputed).not.toBe(8);
    expect(check.verdict).toBe('agrees');
  });

  it('rounds a fractional demand up, because half a garment is a garment', () => {
    const check = checkRationaleArithmetic({
      ...RATIONALE,
      velocity_daily: '0.5000',
      lead_time_days: 1,
      review_period_days: 0,
      safety_days: 0,
      on_hand: 0,
      on_order: 0,
      suggested_qty: 1
    });
    expect(check.recomputed).toBe(1);
  });

  it('floors at zero rather than proposing a negative order', () => {
    const check = checkRationaleArithmetic({ ...RATIONALE, on_hand: 500, suggested_qty: 0 });
    expect(check.recomputed).toBe(0);
    expect(check.verdict).toBe('agrees');
  });

  it('does not round a zero demand up to one unit', () => {
    const check = checkRationaleArithmetic({
      ...RATIONALE,
      velocity_daily: '0.0000',
      on_hand: 0,
      on_order: 0,
      suggested_qty: 0
    });
    expect(check.recomputed).toBe(0);
    expect(check.recomputed).not.toBe(1);
  });
});

// ---------------------------------------------------------------------------
describe('coverage of target', () => {
  it('reports how much of the target is already covered', () => {
    // 8 on hand + 4 on order against a target of 30.
    expect(coverageOfTarget(RATIONALE)).toBeCloseTo(40);
    expect(formatCoverage(RATIONALE)).toBe('40%');
  });

  it('is undefined against a zero target, never "100% covered" of nothing', () => {
    expect(coverageOfTarget({ ...RATIONALE, target_qty: 0 })).toBeNull();
    expect(formatCoverage({ ...RATIONALE, target_qty: 0 })).toBe(EM_DASH);
    expect(coverageOfTarget(without('target_qty'))).toBeNull();
  });
});

// ---------------------------------------------------------------------------
describe('describeLeadTime', () => {
  it('MEASURED: names how many deliveries were seen and that a median was taken', () => {
    const provenance = describeLeadTime(RATIONALE);
    expect(provenance.label).toBe('Measured');
    expect(provenance.detail).toContain('4 recorded deliveries');
    expect(provenance.detail).toContain('median, not the average');
    expect(provenance.isLeadTime).toBe(true);
    expect(provenance.observations).toEqual([12, 14, 16, 31]);
    // These observations ARE the source of the figure, so the array needs no caveat.
    expect(provenance.observationsUnused).toBe(false);
  });

  it("STATED: says the figure is the supplier's claim, and captions observations that were NOT used", () => {
    // The engine can hand back a short non-empty array alongside a stated
    // figure — showing [5] beside "14 days" without saying which produced which
    // reads as an outright contradiction.
    const provenance = describeLeadTime({
      ...RATIONALE,
      lead_time_source: 'supplier_stated',
      lead_time_days: 14,
      lead_time_observations: [5]
    });
    expect(provenance.label).toBe("Supplier's own figure");
    expect(provenance.detail).toContain('Bellini Textiles states 14 days');
    expect(provenance.detail).toContain('Only 1 delivery has been recorded');
    expect(provenance.detail).toContain('too few');
    expect(provenance.detail).toContain('not what the number above came from');
    expect(provenance.observationsUnused).toBe(true);
    expect(provenance.isLeadTime).toBe(true);
  });

  it('STATED with no history at all: a claim, plainly, and no array to caption', () => {
    const provenance = describeLeadTime({ ...RATIONALE, lead_time_source: 'supplier_stated', lead_time_observations: [] });
    expect(provenance.detail).toContain('No deliveries have been recorded');
    expect(provenance.detail).toContain('a claim');
    expect(provenance.observationsUnused).toBe(false);
  });

  it('NO SUPPLIER: says outright that there is no lead time and the review period is standing in', () => {
    const provenance = describeLeadTime({
      ...RATIONALE,
      lead_time_source: 'no_supplier',
      lead_time_days: 7,
      lead_time_observations: [],
      supplier_name: null
    });
    expect(provenance.label).toBe('No lead time');
    expect(provenance.detail).toContain('NO lead time');
    expect(provenance.detail).toContain('7-day review period is standing in');
    expect(provenance.detail).toContain('not a delivery estimate');
    // The flag the UI must key on: this number is not a lead time.
    expect(provenance.isLeadTime).toBe(false);
  });

  it('does not invent the receipt threshold the list endpoint never sends', () => {
    // ReorderPolicy.min_lead_time_receipts is not on this wire, so "3 more
    // needed" would be a made-up number on a screen that exists to be checked.
    const provenance = describeLeadTime({ ...RATIONALE, lead_time_source: 'supplier_stated', lead_time_observations: [5] });
    expect(provenance.detail).not.toMatch(/\b3 (?:are|more)\b/);
  });

  it('de-slugs a source it does not recognise instead of printing "Unknown"', () => {
    const provenance = describeLeadTime({ ...RATIONALE, lead_time_source: 'contract_terms' });
    expect(provenance.label).toBe('Contract terms');
    expect(provenance.label).not.toBe('Unknown');
    expect(describeLeadTime(without('lead_time_source')).label).toBe(EM_DASH);
  });
});

// ---------------------------------------------------------------------------
describe('readRationaleMeta', () => {
  it('carries the five provenance keys the arithmetic steps do not', () => {
    const meta = readRationaleMeta(RATIONALE);
    expect(meta.formula).toContain('floored at 0');
    expect(meta.formulaKnown).toBe(true);
    expect(meta.provider).toBe('Recency-weighted sales history');
    expect(meta.supplierName).toBe('Bellini Textiles');
    expect(meta.generatedForDate).toBe('2026-08-05');
    expect(meta.daysOfCover).toBe('6.40 days');
  });

  it('distinguishes "never runs out" from "not recorded", which look identical as nulls', () => {
    // A recorded null means velocity is zero — a real answer, and the calmest
    // state in the inbox. An absent key means the engine wrote nothing.
    expect(readRationaleMeta({ ...RATIONALE, days_of_cover: null }).daysOfCover).toBe('Never — nothing is selling');
    expect(readRationaleMeta({ ...RATIONALE, days_of_cover: null }).daysOfCover).not.toContain('0');
    expect(readRationaleMeta(without('days_of_cover')).daysOfCover).toBe(EM_DASH);
  });

  it('names an unattributed model instead of leaving a slug on screen', () => {
    // The engine writes the literal 'unknown' when a provider has no name.
    expect(readRationaleMeta({ ...RATIONALE, forecast_provider: 'unknown' }).provider).toBe('Unnamed forecast model');
    expect(readRationaleMeta({ ...RATIONALE, forecast_provider: 'bq_seasonal' }).provider).toBe('Bq seasonal');
    expect(readRationaleMeta(undefined).provider).toBe(EM_DASH);
  });
});

// ---------------------------------------------------------------------------
describe('reorderUrgency', () => {
  it('is critical inside the lead time, because an order cannot arrive in time', () => {
    const reading = reorderUrgency(3, 14);
    expect(reading.level).toBe('critical');
    expect(reading.color).toBe('error');
    expect(reading.detail).toContain('after the shelf is empty');
  });

  it('warns inside twice the lead time, and says how long is left to act', () => {
    const reading = reorderUrgency(20, 14);
    expect(reading.level).toBe('warning');
    expect(reading.detail).toContain('next 6');
  });

  it('is fine beyond twice the lead time', () => {
    expect(reorderUrgency(40, 14).level).toBe('ok');
    // The boundary belongs to the warning, not to calm.
    expect(reorderUrgency(28, 14).level).toBe('warning');
    expect(reorderUrgency(29, 14).level).toBe('ok');
    expect(reorderUrgency(14, 14).level).toBe('critical');
  });

  it('treats zero days as out TODAY, not as a rounding of "soon"', () => {
    const reading = reorderUrgency(0, 14);
    expect(reading.level).toBe('critical');
    expect(reading.label).toBe('Out today');
  });

  it('reads a NEGATIVE days-until-stockout as worse, never as a small number', () => {
    // A stale suggestion whose forecast date has already passed. "-3 days left"
    // would sort and read as the calmest row on the screen.
    const reading = reorderUrgency(-3, 14);
    expect(reading.level).toBe('critical');
    expect(reading.label).toBe('Overdue by 3 days');
    expect(reading.label).not.toContain('-3');
    expect(reading.label).not.toContain('left');
    expect(reading.detail).toContain('already passed');
    expect(reorderUrgency(-1, 14).label).toBe('Overdue by 1 day');
    // Overdue outranks even a lead time long enough to swallow it.
    expect(reorderUrgency(-1, 900).level).toBe('critical');
  });

  it('treats a NULL stockout as its own calm state, not as urgency', () => {
    // Null means velocity is zero: nothing sells, so nothing runs out. The
    // backend sorts these last with nulls_last for exactly this reason.
    const reading = reorderUrgency(null, 14);
    expect(reading.level).toBe('none');
    expect(reading.level).not.toBe('critical');
    expect(reading.color).toBe('default');
    expect(reading.color).not.toBe('error');
    expect(reading.label).toBe('Not selling');
    expect(reading.detail).toContain('calmest');
    expect(reorderUrgency(undefined, 14).level).toBe('none');
  });

  it('does not colour a dead item green either', () => {
    // 'default' rather than 'success': "never runs out" is not a healthy stock
    // position, it is stock nobody is buying.
    expect(reorderUrgency(null, 14).color).not.toBe('success');
  });

  it('invents no threshold when there is no lead time to measure against', () => {
    // The same discipline stockSeverity applies with no reorder point set.
    const reading = reorderUrgency(5, null);
    expect(reading.level).toBe('ok');
    expect(reading.detail).toContain('No lead time was recorded');
    // Already overdue is still critical, threshold or not.
    expect(reorderUrgency(-2, null).level).toBe('critical');
  });
});

// ---------------------------------------------------------------------------
describe('describeStockout', () => {
  it('says the stock runs out DURING the date, which is what int() truncation means', () => {
    // 4.9 days of cover truncates to today + 4: you are out during day 5, not at
    // the end of it. "Covered until the 9th" would be off by most of a trading day.
    const description = describeStockout({ forecast_stockout_date: '2026-08-09', days_until_stockout: 4, days_of_cover: '4.90' });
    expect(description.headline).toBe('Runs out during 2026-08-09, in 4 days');
    expect(description.headline).not.toContain('until');
    expect(description.detail).toContain('4.90 days of cover, truncated');
    expect(description.detail).toContain('DURING');
    expect(description.hasForecast).toBe(true);
  });

  it('words a null forecast as "not selling", NEVER as 0 days', () => {
    const description = describeStockout({ forecast_stockout_date: null, days_until_stockout: null, days_of_cover: null });
    expect(description.headline).toBe('Not selling — no stockout forecast');
    expect(description.headline).not.toContain('0 days');
    expect(description.headline).not.toContain(' 0');
    expect(description.detail).toContain('999');
    expect(description.hasForecast).toBe(false);
  });

  it('reads a passed date in the past tense with an age, not a negative count', () => {
    const description = describeStockout({ forecast_stockout_date: '2026-08-02', days_until_stockout: -3, days_of_cover: '1.00' });
    expect(description.headline).toBe('Ran out during 2026-08-02, 3 days ago');
    expect(description.headline).not.toContain('-3');
    expect(describeStockout({ forecast_stockout_date: '2026-08-04', days_until_stockout: -1, days_of_cover: '1.00' }).headline).toContain(
      '1 day ago'
    );
  });

  it('says today rather than "in 0 days"', () => {
    const description = describeStockout({ forecast_stockout_date: '2026-08-05', days_until_stockout: 0, days_of_cover: '0.00' });
    expect(description.headline).toBe('Runs out today, 2026-08-05');
    expect(description.headline).not.toContain('in 0 days');
  });

  it('still names the date when the day count is missing', () => {
    const description = describeStockout({ forecast_stockout_date: '2026-08-09', days_until_stockout: null, days_of_cover: null });
    expect(description.headline).toBe('Runs out during 2026-08-09');
    expect(description.detail).not.toContain('days of cover');
  });
});

// ---------------------------------------------------------------------------
describe('status vocabulary', () => {
  it('labels the four statuses and de-slugs anything else', () => {
    expect(reorderStatusLabel('suggested')).toBe('Suggested');
    expect(reorderStatusLabel('dismissed')).toBe('Dismissed');
    expect(reorderStatusLabel('ordered')).toBe('Ordered');
    expect(reorderStatusLabel('superseded')).toBe('Superseded');
    expect(reorderStatusLabel('auto_ordered')).toBe('Auto ordered');
    expect(reorderStatusLabel('')).toBe(EM_DASH);
  });

  it('colours only the status that wants something from the reader', () => {
    expect(reorderStatusColor('suggested')).toBe('info');
    expect(reorderStatusColor('ordered')).toBe('success');
    // Neither closed state is a fault: a dismissal is a decision, and a
    // superseded row was simply replaced by a fresher one.
    expect(reorderStatusColor('dismissed')).toBe('default');
    expect(reorderStatusColor('dismissed')).not.toBe('error');
    expect(reorderStatusColor('superseded')).toBe('default');
    expect(reorderStatusColor('nonsense')).toBe('default');
  });
});

// ---------------------------------------------------------------------------
describe('reorderListQuery', () => {
  it('repeats ?status= once per selection, because the view reads getlist', () => {
    expect(reorderListQuery({ statuses: ['suggested', 'ordered'] })).toBe('status=suggested&status=ordered');
  });

  it('NEVER emits an empty ?status=, which is a 400', () => {
    // getlist('status') returns [''], which is truthy, and '' is not a known
    // status — so the backend rejects the whole request. Omitting instead lets
    // its own default (live suggestions only) apply.
    expect(reorderListQuery({ statuses: [] })).toBe('');
    expect(reorderListQuery({ statuses: [''] })).toBe('');
    expect(reorderListQuery({ statuses: ['  '] })).toBe('');
    expect(reorderListQuery({ statuses: ['bogus'] })).toBe('');
    expect(reorderListQuery({})).toBe('');
    expect(reorderListQuery({ statuses: ['bogus'] })).not.toContain('status=');
  });

  it('drops an unknown status but keeps the valid ones beside it', () => {
    expect(reorderListQuery({ statuses: ['suggested', 'bogus', 'suggested'] })).toBe('status=suggested');
  });

  it('OMITS a malformed uuid filter, because it is an uncaught HTML 500', () => {
    // The view feeds the raw value into filter(...) and Django raises outside any
    // handler, so response.json() throws before an error key can be read. An
    // unfiltered list is a page; a stack trace is not.
    expect(reorderListQuery({ locationId: 'downtown' })).toBe('');
    expect(reorderListQuery({ supplierId: 'NaN' })).toBe('');
    expect(reorderListQuery({ locationId: null, supplierId: undefined })).toBe('');
    expect(reorderListQuery({ locationId: 'downtown' })).not.toContain('location_id');
  });

  it('passes a well-formed uuid filter through', () => {
    expect(reorderListQuery({ locationId: LOCATION_A, supplierId: SUPPLIER_A })).toBe(
      `location_id=${LOCATION_A}&supplier_id=${SUPPLIER_A}`
    );
    expect(reorderListQuery({ statuses: ['dismissed'], locationId: `  ${LOCATION_A}  ` })).toBe(
      `status=dismissed&location_id=${LOCATION_A}`
    );
  });
});

// ---------------------------------------------------------------------------
describe('validateSelection and the payload builders', () => {
  const ids = [row().id, row().id];

  it('refuses an empty selection client-side rather than posting one', () => {
    expect(validateSelection([]).valid).toBe(false);
    expect(validateSelection([]).error).toContain('at least one');
    expect(validateSelection(null).valid).toBe(false);
    expect(validateSelection([null, undefined, '  ']).valid).toBe(false);
    expect(dismissPayload([])).toBeNull();
    expect(createPoPayload([])).toBeNull();
    expect(applyReorderPointPayload([])).toBeNull();
  });

  it('REJECTS a selection containing a bad id instead of quietly sending fewer', () => {
    // Filtering it out would dismiss three of four ticked rows and report
    // success, with nothing on screen saying which one survived.
    const check = validateSelection([ids[0], 'not-a-uuid']);
    expect(check.valid).toBe(false);
    expect(check.ids).toEqual([]);
    expect(check.ids).not.toEqual([ids[0]]);
    expect(dismissPayload([ids[0], 'not-a-uuid'])).toBeNull();
  });

  it('deduplicates a repeated id', () => {
    expect(validateSelection([ids[0], ids[0], ids[1]]).ids).toEqual([ids[0], ids[1]]);
  });

  it('builds the three payload shapes the endpoints expect', () => {
    expect(createPoPayload(ids)).toEqual({ suggestion_ids: ids });
    expect(applyReorderPointPayload(ids)).toEqual({ suggestion_ids: ids });
    expect(dismissPayload(ids, 'ordering these from the outlet instead')).toEqual({
      suggestion_ids: ids,
      reason: 'ordering these from the outlet instead'
    });
  });

  it('omits a blank dismissal reason rather than sending an empty string', () => {
    const payload = dismissPayload(ids, '   ');
    expect(payload).toEqual({ suggestion_ids: ids });
    expect(payload).not.toHaveProperty('reason');
    expect(dismissPayload(ids)).not.toHaveProperty('reason');
  });

  it('caps the reason at the serializer limit so a pasted paragraph loses its tail, not the action', () => {
    const payload = dismissPayload(ids, 'x'.repeat(400));
    expect(payload?.reason).toHaveLength(DISMISSAL_REASON_MAX_LENGTH);
    expect(DISMISSAL_REASON_MAX_LENGTH).toBe(255);
  });
});

// ---------------------------------------------------------------------------
describe('previewPurchaseOrders', () => {
  it('answers "this will create N draft orders" before the call is made', () => {
    const preview = previewPurchaseOrders([
      row({ supplier_id: SUPPLIER_A, supplier_name: 'Bellini' }),
      row({ supplier_id: SUPPLIER_B, supplier_name: 'Corso' })
    ]);
    expect(preview.orderCount).toBe(2);
    expect(preview.summary).toBe('This will create 2 draft purchase orders.');
  });

  it('groups by (supplier, location), because that is what a purchase order IS', () => {
    // One supplier, one delivery address. The same supplier shipping to two
    // shops is two orders, not one.
    const preview = previewPurchaseOrders([
      row({ supplier_id: SUPPLIER_A, location_id: LOCATION_A, location_name: 'Downtown' }),
      row({ supplier_id: SUPPLIER_A, location_id: LOCATION_B, location_name: 'Uptown' })
    ]);
    expect(preview.orderCount).toBe(2);
    expect(preview.groups.map((group) => group.locationName)).toEqual(['Downtown', 'Uptown']);
  });

  it('merges rows sharing a supplier and a location, summing the units', () => {
    const preview = previewPurchaseOrders([row({ suggested_qty: 18 }), row({ suggested_qty: 4 })]);
    expect(preview.orderCount).toBe(1);
    expect(preview.summary).toBe('This will create 1 draft purchase order.');
    expect(preview.groups[0].suggestions).toHaveLength(2);
    expect(preview.groups[0].totalUnits).toBe(22);
  });

  it('names the supplier-less bucket honestly and says it cannot be ordered', () => {
    const preview = previewPurchaseOrders([
      row({ supplier_id: SUPPLIER_A, supplier_name: 'Bellini' }),
      row({ supplier_id: null, supplier_name: null, name: 'Vintage Scarf' })
    ]);
    expect(preview.orderCount).toBe(1);
    const orphans = preview.groups[preview.groups.length - 1];
    expect(orphans.supplierName).toBe(NO_SUPPLIER_GROUP_LABEL);
    expect(orphans.canOrder).toBe(false);
    expect(orphans.note).toContain('never been bought from a supplier');
    expect(orphans.note).toContain('by hand');
    // Also in the flat "what will not happen" list, with the backend's own reason.
    expect(preview.skipped).toHaveLength(1);
    expect(preview.skipped[0]).toMatchObject({ name: 'Vintage Scarf', reason: 'no_supplier' });
    expect(preview.summary).toBe('This will create 1 draft purchase order. 1 suggestion will be left out.');
  });

  it('puts the unorderable bucket last, since it is not an order', () => {
    const preview = previewPurchaseOrders([
      row({ supplier_id: null, supplier_name: null }),
      row({ supplier_id: SUPPLIER_B, supplier_name: 'Zeta' })
    ]);
    expect(preview.groups.map((group) => group.canOrder)).toEqual([true, false]);
  });

  it('leaves a non-live suggestion out of every group, not just out of the count', () => {
    // The backend skips it with reason 'not_live'. Counting its units in a group
    // would promise a quantity no order will carry.
    const preview = previewPurchaseOrders([row({ suggested_qty: 18 }), row({ status: 'dismissed', suggested_qty: 99 })]);
    expect(preview.orderCount).toBe(1);
    expect(preview.groups).toHaveLength(1);
    expect(preview.groups[0].totalUnits).toBe(18);
    expect(preview.groups[0].totalUnits).not.toBe(117);
    expect(preview.skipped[0].reason).toBe('not_live');
    expect(preview.skipped[0].detail).toContain('Only a live suggestion');
  });

  it('says plainly when nothing selected can become an order', () => {
    const preview = previewPurchaseOrders([row({ supplier_id: null, supplier_name: null }), row({ status: 'ordered' })]);
    expect(preview.orderCount).toBe(0);
    expect(preview.summary).toBe('Nothing selected can become a purchase order. 2 suggestions will be left out.');
    expect(preview.summary).not.toContain('create 0');
  });

  it('has nothing to say about an empty selection', () => {
    const preview = previewPurchaseOrders([]);
    expect(preview.groups).toEqual([]);
    expect(preview.skipped).toEqual([]);
    expect(preview.orderCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
describe('server order', () => {
  const soon = row({ forecast_stockout_date: '2026-08-06', suggested_qty: 5 });
  const laterBig = row({ forecast_stockout_date: '2026-08-20', suggested_qty: 40 });
  const laterSmall = row({ forecast_stockout_date: '2026-08-20', suggested_qty: 9 });
  const never = row({ forecast_stockout_date: null, suggested_qty: 100 });

  it('reproduces forecast_stockout_date ASC then -suggested_qty', () => {
    expect(sortForServerOrder([laterSmall, never, laterBig, soon])).toEqual([soon, laterBig, laterSmall, never]);
  });

  it('sorts a NULL date LAST, which is the whole reason the backend says nulls_last', () => {
    // A null date means velocity is zero — "not selling, so it never runs out" —
    // the LEAST urgent state. Postgres sorts nulls first on ASC, and a sentinel
    // (999, Infinity) would sort them into the urgent end. Either mistake heads
    // the buyer's screen with the items they should care least about, and the
    // 100-unit quantity on this row makes it look like the biggest job on it.
    const sorted = sortForServerOrder([never, soon]);
    expect(sorted[0]).toBe(soon);
    expect(sorted[sorted.length - 1]).toBe(never);
    expect(compareForServerOrder(never, soon)).toBeGreaterThan(0);
    expect(compareForServerOrder(soon, never)).toBeLessThan(0);
  });

  it('keeps two null-date rows in their given order rather than ranking them by quantity', () => {
    const otherNever = row({ forecast_stockout_date: null, suggested_qty: 1 });
    // Both are "never runs out"; the backend's -suggested_qty still applies.
    expect(compareForServerOrder(never, otherNever)).toBeLessThan(0);
  });

  it('answers whether a list still matches the order the server would send', () => {
    expect(isInServerOrder([soon, laterBig, laterSmall, never])).toBe(true);
    // The classic bug: a client sort that forgot nulls_last.
    expect(isInServerOrder([never, soon, laterBig, laterSmall])).toBe(false);
    // Or one that sorted by quantity descending across the whole list.
    expect(isInServerOrder([never, laterBig, laterSmall, soon])).toBe(false);
  });

  it('tolerates a pair the database left in an arbitrary order', () => {
    // Ties beyond (date, qty) are DB-order-undefined, so neither arrangement of
    // these two is "wrong" and neither may be reported as out of order.
    const tieA = row({ forecast_stockout_date: '2026-08-11', suggested_qty: 7 });
    const tieB = row({ forecast_stockout_date: '2026-08-11', suggested_qty: 7 });
    expect(compareForServerOrder(tieA, tieB)).toBe(0);
    expect(isInServerOrder([tieA, tieB])).toBe(true);
    expect(isInServerOrder([tieB, tieA])).toBe(true);
    // And the sort is stable, so re-deriving does not reshuffle them.
    expect(sortForServerOrder([tieB, tieA])).toEqual([tieB, tieA]);
  });

  it('is a no-op on a list of one or none', () => {
    expect(isInServerOrder([])).toBe(true);
    expect(isInServerOrder([never])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
describe('normalizeReorderResponse', () => {
  it('reads the envelope the endpoint actually sends', () => {
    const inbox = normalizeReorderResponse({
      items: [row(), row()],
      total_units_suggested: 36,
      policy: { review_period_days: 7, safety_days: 3, dismissal_cooldown_days: 14 }
    });
    expect(inbox.items).toHaveLength(2);
    expect(inbox.totalUnitsSuggested).toBe(36);
    expect(inbox.policy).toEqual({ review_period_days: 7, safety_days: 3, dismissal_cooldown_days: 14 });
  });

  it('hands back the server’s order untouched rather than re-deriving it', () => {
    // The list arrives sorted by forecast_stockout_date ASC nulls_last; if this
    // ever started sorting, a "not selling" row would head the buyer's screen.
    // The arrangement below is deliberately NOT what sortForServerOrder gives,
    // to prove nothing is being reordered on the way in.
    const soon = row({ forecast_stockout_date: '2026-08-06', suggested_qty: 5 });
    const never = row({ forecast_stockout_date: null, suggested_qty: 100 });
    const inbox = normalizeReorderResponse({ items: [never, soon] });
    expect(inbox.items).toEqual([never, soon]);
    expect(inbox.items).not.toEqual(sortForServerOrder([never, soon]));
  });

  it('distinguishes a total that was not sent from a total of zero', () => {
    // 0 is "there is nothing to buy", a legitimate and calm answer. null is "we
    // were not told", which must render as an em dash and not as good news.
    expect(normalizeReorderResponse({ items: [], total_units_suggested: 0 }).totalUnitsSuggested).toBe(0);
    expect(normalizeReorderResponse({ items: [] }).totalUnitsSuggested).toBeNull();
    expect(normalizeReorderResponse({ items: [] }).totalUnitsSuggested).not.toBe(0);
  });

  it('keeps only the policy keys it was given, never defaulting one to 0', () => {
    // 0 safety days is a policy somebody chose; a missing key is not that.
    const inbox = normalizeReorderResponse({ items: [], policy: { safety_days: 0 } });
    expect(inbox.policy).toEqual({ safety_days: 0 });
    expect(inbox.policy?.review_period_days).toBeUndefined();
    expect(inbox.policy?.review_period_days).not.toBe(0);
  });

  it('accepts a bare array, the shape every sibling list endpoint uses', () => {
    const inbox = normalizeReorderResponse([row()]);
    expect(inbox.items).toHaveLength(1);
    // Totals genuinely are unknown in that shape — they must not be invented.
    expect(inbox.totalUnitsSuggested).toBeNull();
    expect(inbox.policy).toBeNull();
  });

  it('degrades to an empty inbox rather than throwing on a body it does not recognise', () => {
    [null, undefined, 'nope', 42, { items: 'nope' }].forEach((body) => {
      const inbox = normalizeReorderResponse(body);
      expect(inbox.items).toEqual([]);
      expect(inbox.totalUnitsSuggested).toBeNull();
    });
  });
});

// ---------------------------------------------------------------------------
describe('the policy block', () => {
  it('names the three figures that feed every number on the page', () => {
    const readings = describePolicy({ review_period_days: 7, safety_days: 3, dismissal_cooldown_days: 14 });
    expect(readings.map((reading) => reading.key)).toEqual(['review_period_days', 'safety_days', 'dismissal_cooldown_days']);
    expect(readings.map((reading) => reading.value)).toEqual(['7 days', '3 days', '14 days']);
    expect(readings.every((reading) => reading.known)).toBe(true);
  });

  it('shows an unsent figure as unknown and never as zero days', () => {
    // "0 days of safety buffer" is a buying policy; "we were not told" is not,
    // and the two lead to different arguments about a suggested quantity.
    const [review] = describePolicy(null);
    expect(review.value).toBe(EM_DASH);
    expect(review.value).not.toBe('0 days');
    expect(review.known).toBe(false);
  });

  it('states the dismissal cooldown only when the endpoint sent it', () => {
    expect(describeDismissal({ dismissal_cooldown_days: 14 })).toContain('for 14 days');
    const unknown = describeDismissal({});
    expect(unknown).toContain('did not include');
    // An invented cooldown is a promise about when a suggestion comes back.
    expect(unknown).not.toMatch(/for \d+ days/);
  });

  it('says that regenerating leaves a dismissal alone, which is what makes it mean something', () => {
    expect(describeDismissal({ dismissal_cooldown_days: 1 })).toContain('for 1 day');
    expect(describeDismissal(null)).toContain('does NOT bring a dismissed suggestion back');
    expect(REGENERATE_NOTE).toContain('Dismissed suggestions are left alone');
    expect(REGENERATE_NOTE).toContain('supersedes');
  });

  it('warns that applying a reorder point moves the low-stock threshold, not the stock', () => {
    // stockSeverity returns `ok` for a null reorder point and `low` once one is
    // set, so accepting a suggestion can turn chips amber elsewhere in the app.
    expect(APPLY_REORDER_POINT_NOTE).toContain('low-stock');
    expect(APPLY_REORDER_POINT_NOTE).toContain('the stock has not changed, the threshold has');
  });

  it('says which actions are admin-only instead of leaving a 403 to explain it', () => {
    ['read-only', 'dismissing', 'purchase orders', 'reorder point', 'regenerating', 'admin-only'].forEach((phrase) => {
      expect(NON_ADMIN_REORDER_NOTICE.toLowerCase()).toContain(phrase);
    });
  });
});

// ---------------------------------------------------------------------------
describe('what create-po/ created', () => {
  const PO_ID = '55555555-5555-4555-8555-555555555555';

  it('deep-links into the editor when there is a usable id', () => {
    expect(purchaseOrderRoute(PO_ID)).toBe(`${PURCHASE_ORDERS_ROUTE}/${PO_ID}`);
  });

  it('falls back to the list rather than building a dead link', () => {
    // `/inventory/purchase-orders/null` resolves to an editor that fetches a
    // non-existent order: a screen that loads nothing and explains nothing.
    [null, undefined, '', 'not-a-uuid', 42].forEach((id) => {
      expect(purchaseOrderRoute(id)).toBe(PURCHASE_ORDERS_ROUTE);
      expect(purchaseOrderRoute(id)).not.toContain(`${PURCHASE_ORDERS_ROUTE}/`);
    });
  });

  it('reads the created orders out of the response envelope', () => {
    const orders = readCreatedPurchaseOrders({
      purchase_orders: [
        { id: PO_ID, po_number: 'PO-000012', supplier_name: 'Bellini Textiles', destination_name: 'Downtown', lines: [{}, {}] }
      ]
    });
    expect(orders).toHaveLength(1);
    expect(orders[0]).toEqual({
      id: PO_ID,
      reference: 'PO-000012',
      supplierName: 'Bellini Textiles',
      destinationName: 'Downtown',
      lineCount: 2,
      route: `${PURCHASE_ORDERS_ROUTE}/${PO_ID}`
    });
  });

  it('still produces a labelled, followable link when the order carries no id', () => {
    const [order] = readCreatedPurchaseOrders({ purchase_orders: [{ po_number: '' }] });
    expect(order.id).toBeNull();
    expect(order.route).toBe(PURCHASE_ORDERS_ROUTE);
    // A blank po_number would otherwise render an unlabelled button.
    expect(order.reference).toBe('Draft purchase order');
    expect(order.reference).not.toBe('');
  });

  it('tolerates a bare array and skips entries that are not orders', () => {
    expect(readCreatedPurchaseOrders([{ id: PO_ID }, null, 'nope'])).toHaveLength(1);
    expect(readCreatedPurchaseOrders({ purchase_orders: 'nope' })).toEqual([]);
    expect(readCreatedPurchaseOrders(undefined)).toEqual([]);
  });

  it('says plainly that nothing was created, because 200-with-empty is a real answer', () => {
    // The endpoint answers 201 with orders and 200 with an EMPTY list when
    // nothing selected could become one. "0 orders created" read as success is
    // how a buyer ends up believing stock is on its way when it is not.
    const empty = describeCreatedOrders([]);
    expect(empty).toContain('No purchase orders were created');
    expect(empty).not.toContain('0 draft');
    expect(describeCreatedOrders(readCreatedPurchaseOrders({ purchase_orders: [{ id: PO_ID }] }))).toContain(
      '1 draft purchase order created'
    );
    expect(describeCreatedOrders(readCreatedPurchaseOrders({ purchase_orders: [{ id: PO_ID }, {}] }))).toContain(
      '2 draft purchase orders created'
    );
  });

  it('calls them drafts, because nothing has been sent to a supplier yet', () => {
    expect(describeCreatedOrders(readCreatedPurchaseOrders([{ id: PO_ID }]))).toContain('nothing has been sent to a supplier');
  });
});
