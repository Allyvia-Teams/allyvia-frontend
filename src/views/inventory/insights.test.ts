import { describe, expect, it } from 'vitest';

import { formatMoney, readMoney } from './purchasing';
import { EM_DASH } from './stockFormat';
import {
  AGING_BUCKET_ORDER,
  AGING_IGNORES_WINDOW_NOTE,
  ANALYTICS_STALENESS_NOTE,
  ARCHIVED_VARIANTS_CAVEAT,
  AgingBucket,
  AnalyticsWindow,
  BLANK_COLOUR_LABEL,
  BLANK_SIZE_LABEL,
  GmroiBlock,
  LOCATION_FILTER_IGNORED_NOTE,
  LOCATION_SCOPE_CAVEAT,
  LowPerformerRow,
  MatrixCell,
  NEVER_SOLD_SENTINEL,
  NET_RETURNS_NOTE,
  OVERSTOCK_DIVERGENCE_NOTE,
  SELL_THROUGH_DEFINITION,
  SlowMoverView,
  UNKNOWN_AGE_BUCKET,
  WINDOW_PRESETS,
  aggKeyLabel,
  agingBucketLabel,
  agingCaveat,
  agingRowKey,
  allZero,
  analyticsQuery,
  daysInclusive,
  describeAnalyticsError,
  describeDaysOfCover,
  describeGmroi,
  describeLowPerformerTotal,
  describeScope,
  describeShrinkage,
  describeWindow,
  describeWindowRange,
  emptyMessageFor,
  formatAgeDays,
  formatDaysOnHand,
  formatFractionPercent,
  formatPercentValue,
  formatTurns,
  formatWeeksOfSupply,
  formatWindowDate,
  fromInsightsSlowMover,
  fromLowPerformer,
  isCalendarDate,
  isNetReturns,
  isNeverSold,
  isoDateOf,
  itemAnalyticsId,
  lowPerformersQuery,
  matrixAxes,
  matrixAxisLabel,
  matrixCellAt,
  matrixIndex,
  matrixQuery,
  orderLowPerformers,
  orderedAgingBuckets,
  presenceOf,
  presetWindow,
  rankLowPerformers,
  rollUpGmroi,
  rollUpSellThrough,
  rollUpUnits,
  safeBarFraction,
  sellThroughDefinitionFor,
  sellThroughGauge,
  sellThroughSeries,
  signTone,
  slowMoverBar,
  slowMoverScaleMax,
  sortByAge
} from './insights';

const UUID = '3f2504e0-4f89-11d3-9a0c-0305e82c3301';

// ---------------------------------------------------------------------------
// Reality 1 and 3: negatives are real data and must render as negatives
// ---------------------------------------------------------------------------

describe('negative ratios render honestly', () => {
  it('renders a -400% gross margin as a loss and NEVER as 400%', () => {
    // Probe-verified: revenue "10.00" against cogs "50.00" — a markdown sold
    // below today's moving-average cost — gives gross_margin_pct -400.0. An
    // unsigned formatter turns that loss into an implausibly good quarter.
    expect(formatPercentValue(-400)).toBe('-400.0%');
    expect(formatPercentValue(-400)).not.toBe('400.0%');
    expect(formatPercentValue(-400)).not.toBe('0.0%');
  });

  it('renders a negative sell-through signed rather than clamped to zero', () => {
    // A refund_restock with no matching in-window sale: units_sold -2,
    // sell_through -2.0. Clamping the NUMBER to 0 would report "nothing sold"
    // for an item that sold and came back.
    expect(formatFractionPercent(-2)).toBe('-200.0%');
    expect(formatFractionPercent(-2)).not.toBe('200.0%');
    expect(formatFractionPercent(-2)).not.toBe('0.0%');
  });

  it('keeps money signed, so a $40 loss can never present as a $40 profit', () => {
    expect(formatMoney('-40.00')).toBe('-$40.00');
    expect(formatMoney('-40.00')).not.toBe('$40.00');
  });

  it('does not confuse the FRACTION fields with the already-PERCENT one', () => {
    // gmroi/sell_through are fractions and gross_margin_pct is already a
    // percent, and they sit in the SAME object. Multiplying the wrong one is
    // invisible on a screen where >100% is ordinary.
    expect(formatFractionPercent(0.6667)).toBe('66.7%');
    expect(formatPercentValue(66.66666666666667)).toBe('66.7%');
    // The bug this pair exists to prevent, stated as the value it would produce.
    expect(formatFractionPercent(66.66666666666667)).toBe('6666.7%');
  });

  it('renders GMROI and stock turn as multiples, keeping the minus sign', () => {
    expect(formatTurns(-0.4)).toBe('-0.40×');
    expect(formatTurns(2.5)).toBe('2.50×');
    expect(formatTurns(null)).toBe(EM_DASH);
  });

  it('keeps weeks of supply signed, and says nothing rather than "— weeks"', () => {
    // Probe-verified alongside days_of_cover -136.5: weeks_of_supply came back
    // -19.5 for the same net-returns row.
    expect(formatWeeksOfSupply(-19.5)).toBe('-19.5 weeks');
    expect(formatWeeksOfSupply(-19.5)).not.toBe('19.5 weeks');
    expect(formatWeeksOfSupply(null)).toBe(EM_DASH);
    expect(formatWeeksOfSupply(null)).not.toBe(`${EM_DASH} weeks`);
    expect(formatWeeksOfSupply(0)).toBe('0.0 weeks');
  });

  it('tones by sign without inventing a verdict', () => {
    expect(signTone(-0.4)).toBe('negative');
    expect(signTone(0)).toBe('neutral');
    expect(signTone(0.04)).toBe('positive');
    expect(signTone(null)).toBe('unknown');
    expect(signTone(Number.NaN)).toBe('unknown');
  });

  it('formats the whole margin block at once, losses included', () => {
    const block: GmroiBlock = {
      revenue: '10.00',
      cogs: '50.00',
      gross_margin: '-40.00',
      gross_margin_pct: -400.0,
      average_inventory_cost: '100.00',
      gmroi: -0.4,
      stock_turn: 0.5
    };
    const shown = describeGmroi(block);
    expect(shown.grossMargin).toBe('-$40.00');
    expect(shown.grossMarginPct).toBe('-400.0%');
    expect(shown.gmroi).toBe('-0.40×');
    expect(shown.marginTone).toBe('negative');
    expect(shown.gmroiTone).toBe('negative');
  });

  it('renders every undefined figure in a margin block as an em dash, not zero', () => {
    const block: GmroiBlock = {
      revenue: '0.00',
      cogs: '0.00',
      gross_margin: '0.00',
      gross_margin_pct: null,
      average_inventory_cost: '0.00',
      gmroi: null,
      stock_turn: null
    };
    const shown = describeGmroi(block);
    expect(shown.grossMarginPct).toBe(EM_DASH);
    expect(shown.gmroi).toBe(EM_DASH);
    expect(shown.stockTurn).toBe(EM_DASH);
    // …while a real zero of money stays a real zero.
    expect(shown.revenue).toBe('$0.00');
  });

  it('reads the odd money scales this area emits without losing digits', () => {
    // average_inventory_cost is (opening + closing) / 2, so an odd cent yields
    // 3dp; shrinkage cost is 4dp. Both are parsed, not sliced.
    expect(readMoney('0.0005').scaled).toBe(5n);
    expect(formatMoney('0.005')).toBe('$0.01');
    expect(formatMoney('60.0000')).toBe('$60.00');
  });
});

// ---------------------------------------------------------------------------
// Reality 2: cover follows velocity negative
// ---------------------------------------------------------------------------

describe('describeDaysOfCover', () => {
  it('says why cover is missing instead of printing an infinity', () => {
    const reading = describeDaysOfCover(null, 0);
    expect(reading.display).toBe(EM_DASH);
    expect(reading.tone).toBe('unknown');
    expect(reading.note).toContain('undefined');
    expect(reading.display).not.toBe('0.0 days');
  });

  it('shows negative cover signed, with the reason it is negative', () => {
    // Probe: daily_velocity -0.0219 gives days_of_cover -90.99999999999999.
    const reading = describeDaysOfCover(-90.99999999999999);
    expect(reading.display).toBe('-91.0 days');
    expect(reading.tone).toBe('negative');
    expect(reading.note).toBe(NET_RETURNS_NOTE);
  });

  it('leaves an ordinary cover figure unremarked', () => {
    const reading = describeDaysOfCover(11);
    expect(reading.display).toBe('11.0 days');
    expect(reading.note).toBeNull();
  });
});

describe('isNetReturns', () => {
  it('recognises a returns window from any of the three signals', () => {
    expect(isNetReturns({ units_sold: -2 })).toBe(true);
    expect(isNetReturns({ sell_through: -2 })).toBe(true);
    expect(isNetReturns({ daily_velocity: -0.02 })).toBe(true);
    expect(isNetReturns({ units_sold: 0, sell_through: 0, daily_velocity: 0 })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The gauge guard
// ---------------------------------------------------------------------------

describe('safeBarFraction', () => {
  it('clamps a negative to a drawable 0 but ADMITS it clamped', () => {
    expect(safeBarFraction(-2)).toEqual({ fraction: 0, outOfRange: true });
  });

  it('clamps an over-100% sell-through to a full bar and admits that too', () => {
    // sell_through > 1.0 is ordinary: stock received before the window sells
    // through more than the opening count.
    expect(safeBarFraction(1.4)).toEqual({ fraction: 1, outOfRange: true });
  });

  it('draws an in-range value untouched and says nothing', () => {
    expect(safeBarFraction(0.52)).toEqual({ fraction: 0.52, outOfRange: false });
  });

  it('treats unknown as an undrawn bar, not as an out-of-range one', () => {
    expect(safeBarFraction(null)).toEqual({ fraction: 0, outOfRange: false });
    expect(safeBarFraction(Number.NaN)).toEqual({ fraction: 0, outOfRange: false });
  });

  it('refuses to invent a width when there is no positive scale', () => {
    expect(safeBarFraction(30, 0)).toEqual({ fraction: 0, outOfRange: true });
    expect(safeBarFraction(0, 0)).toEqual({ fraction: 0, outOfRange: false });
  });

  it('scales against an explicit maximum for a days-of-cover bar', () => {
    expect(safeBarFraction(30, 60)).toEqual({ fraction: 0.5, outOfRange: false });
  });
});

describe('sellThroughGauge', () => {
  it('shows the true negative next to a bar that is visibly pinned', () => {
    const gauge = sellThroughGauge(-2);
    // The number stays honest…
    expect(gauge.display).toBe('-200.0%');
    expect(gauge.display).not.toBe('200.0%');
    // …the bar is drawable…
    expect(gauge.fraction).toBe(0);
    // …and the caller is told the two do not agree, which is the whole point:
    // a silently clamped bar is indistinguishable from a genuine zero.
    expect(gauge.outOfRange).toBe(true);
    expect(gauge.tone).toBe('negative');
  });

  it('renders an undefined sell-through as an em dash, never as 0%', () => {
    const gauge = sellThroughGauge(null);
    expect(gauge.display).toBe(EM_DASH);
    expect(gauge.display).not.toBe('0.0%');
    expect(gauge.tone).toBe('unknown');
    expect(gauge.outOfRange).toBe(false);
  });

  it('does not tone a low positive sell-through as bad, because nobody set a threshold', () => {
    expect(sellThroughGauge(0.04).tone).toBe('neutral');
    expect(sellThroughGauge(0.9).tone).toBe('neutral');
  });
});

// ---------------------------------------------------------------------------
// Absent vs empty
// ---------------------------------------------------------------------------

describe('presenceOf', () => {
  it('separates "nothing loaded" from "loaded, and there is nothing"', () => {
    expect(presenceOf(null, null)).toBe('absent');
    expect(presenceOf(undefined, [])).toBe('absent');
    expect(presenceOf({ items: [] }, [])).toBe('empty');
    expect(presenceOf({ items: [1] }, [1])).toBe('present');
  });

  it('gives an empty panel a sentence and an absent one silence', () => {
    expect(emptyMessageFor('empty', 'sales')).toBe('No sales in this window.');
    // "No sales" is a claim about the shop; a request that never arrived cannot
    // make it.
    expect(emptyMessageFor('absent', 'sales')).toBeNull();
    expect(emptyMessageFor('present', 'sales')).toBeNull();
  });
});

describe('allZero', () => {
  it('reads loaded zeroes as zero, whatever scale they arrive at', () => {
    expect(allZero([0, '0.00', '0.0000'])).toBe(true);
    expect(allZero([0, '0.01'])).toBe(false);
  });

  it('does not read unknown as zero, and does not read nothing as zero', () => {
    expect(allZero([null])).toBe(false);
    expect(allZero(['', 'garbage'])).toBe(false);
    expect(allZero([])).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The 999 sentinel
// ---------------------------------------------------------------------------

describe('the 999 days-of-cover sentinel', () => {
  it('renders 999 as "never sold" and NEVER as 999 days', () => {
    // analytics.slow_movers() keeps 999 on purpose (it is persisted and fed to
    // an LLM) while the Session 4 endpoints return null for the same condition.
    // OverstockCard's `days_on_hand.toFixed(1)` prints "999.0 days on hand",
    // which reads as a real, if absurd, measurement.
    expect(NEVER_SOLD_SENTINEL).toBe(999);
    expect(formatDaysOnHand(999)).toBe('Never sold');
    expect(formatDaysOnHand(999)).not.toBe('999.0 days');
    expect(formatDaysOnHand(999, 0)).toBe('Never sold');
  });

  it('lets a genuine 999 days stand when velocity says the item does sell', () => {
    // The sentinel means "velocity is zero", not "the number is 999". With
    // velocity in hand, velocity is the answer.
    expect(isNeverSold(999, 0.5)).toBe(false);
    expect(formatDaysOnHand(999, 0.5)).toBe('999.0 days');
  });

  it('renders an unknown cover as an em dash rather than as never sold', () => {
    expect(formatDaysOnHand(null)).toBe(EM_DASH);
    expect(formatDaysOnHand(undefined)).toBe(EM_DASH);
    expect(formatDaysOnHand(11.25)).toBe('11.3 days');
  });

  it('converts the sentinel into a flag when reading a legacy overstock row', () => {
    const row = fromInsightsSlowMover({
      item_name: 'Linen Shirt',
      sku: 'SHIRT-S',
      quantity_on_hand: 6,
      sales_velocity: 0,
      days_on_hand: 999,
      capital_tied: 120,
      units_sold_in_period: 0
    });
    expect(row.neverSold).toBe(true);
    // 999 must not survive into anything downstream that could format it.
    expect(row.daysOfCover).toBeNull();
    expect(row.daysOfCover).not.toBe(999);
    expect(row.capitalTied).toBe('120.00');
  });

  it('reads a low-performer row into the same shape, so the two surfaces agree', () => {
    const row = fromLowPerformer({
      ...lowPerformer({ inventory_item_id: 7, name: 'Silk Scarf' }),
      daily_velocity: 0,
      days_of_cover: null
    });
    expect(row.neverSold).toBe(true);
    expect(row.daysOfCover).toBeNull();
    expect(row.key).toBe('7');
  });
});

describe('slow-mover bars', () => {
  const view = (over: Partial<SlowMoverView> = {}): SlowMoverView => ({
    key: over.key ?? 'k',
    name: over.name ?? 'Item',
    unitsOnHand: over.unitsOnHand ?? 4,
    daysOfCover: over.daysOfCover ?? 30,
    neverSold: over.neverSold ?? false,
    netReturns: over.netReturns ?? false,
    capitalTied: over.capitalTied ?? '100.00',
    sellThrough: over.sellThrough ?? 0.5
  });

  it('keeps a never-sold row out of the scale, so real bars stay readable', () => {
    // A single sentinel row at 999 would otherwise flatten a 40-day bar to 4%
    // of its width — the sentinel "sorting" itself into the chart.
    const rows = [view({ neverSold: true, daysOfCover: null }), view({ daysOfCover: 40 }), view({ daysOfCover: 20 })];
    expect(slowMoverScaleMax(rows)).toBe(40);
    expect(slowMoverScaleMax(rows)).not.toBe(999);
  });

  it('never divides by zero when every row is a never-sold one', () => {
    expect(slowMoverScaleMax([view({ neverSold: true, daysOfCover: null })])).toBe(1);
  });

  it('pins a never-sold bar full and flags it as off the scale', () => {
    const bar = slowMoverBar(view({ neverSold: true, daysOfCover: null }), 40);
    expect(bar.display).toBe('Never sold');
    expect(bar.fraction).toBe(1);
    expect(bar.outOfRange).toBe(true);
  });

  it('labels a returns row as returns, not as never sold', () => {
    // It sold and came back — the opposite of never selling.
    const bar = slowMoverBar(view({ neverSold: true, netReturns: true, daysOfCover: -12 }), 40);
    expect(bar.display).toBe('Net returns');
    expect(bar.display).not.toBe('Never sold');
    expect(bar.outOfRange).toBe(true);
  });

  it('draws an ordinary row against the scale', () => {
    const bar = slowMoverBar(view({ daysOfCover: 20 }), 40);
    expect(bar).toEqual({ display: '20.0 days', tone: 'neutral', fraction: 0.5, outOfRange: false });
  });
});

// ---------------------------------------------------------------------------
// Aging
// ---------------------------------------------------------------------------

describe('sortByAge', () => {
  it('sorts an UNKNOWN age LAST, because "we do not know" is not "ancient"', () => {
    // A markdown list headed by rows whose age is merely unrecorded sends a
    // buyer to discount stock that may have landed yesterday.
    const rows = [
      { name: 'unknown-age', age_days: null },
      { name: 'oldest', age_days: 200 },
      { name: 'middle', age_days: 45 }
    ];
    const sorted = sortByAge(rows);
    expect(sorted.map((row) => row.name)).toEqual(['oldest', 'middle', 'unknown-age']);
    // The wrong answer, stated: treating null as infinitely old heads the list
    // with it.
    expect(sorted[0].name).not.toBe('unknown-age');
    expect(sorted[0].age_days).toBe(200);
  });

  it('does not mutate the array it was given', () => {
    const rows = [{ age_days: 1 }, { age_days: 9 }];
    sortByAge(rows);
    expect(rows.map((row) => row.age_days)).toEqual([1, 9]);
  });

  it('keeps unknown rows together at the end without reordering them', () => {
    const rows = [
      { name: 'u1', age_days: null },
      { name: 'u2', age_days: null },
      { name: 'known', age_days: 3 }
    ];
    expect(sortByAge(rows).map((row) => row.name)).toEqual(['known', 'u1', 'u2']);
  });
});

describe('aging buckets', () => {
  const bucket = (label: string, units = 0, items = 0): AgingBucket => ({
    label,
    units,
    capital_tied: '0.00',
    items
  });

  it('returns the five buckets in a fixed order, zero-filling any the backend omitted', () => {
    const ordered = orderedAgingBuckets([bucket('60-90', 5, 2)]);
    expect(ordered.map((row) => row.label)).toEqual([...AGING_BUCKET_ORDER]);
    expect(ordered[2].units).toBe(5);
    expect(ordered[0].units).toBe(0);
  });

  it('appends "unknown" LAST and only when it has something in it', () => {
    // The backend appends it conditionally, which is exactly why buckets[5] is
    // sometimes the unknown bucket and sometimes undefined.
    const withUnknown = orderedAgingBuckets([...AGING_BUCKET_ORDER.map((label) => bucket(label)), bucket('unknown', 3, 1)]);
    expect(withUnknown).toHaveLength(6);
    expect(withUnknown[5].label).toBe('unknown');

    const withoutUnknown = orderedAgingBuckets([...AGING_BUCKET_ORDER.map((label) => bucket(label)), bucket('unknown', 0, 0)]);
    expect(withoutUnknown).toHaveLength(5);
    expect(withoutUnknown[4].label).toBe('180+');
  });

  it('survives an absent payload without inventing buckets that have data', () => {
    const ordered = orderedAgingBuckets(null);
    expect(ordered).toHaveLength(5);
    expect(ordered.every((row) => row.units === 0 && row.items === 0)).toBe(true);
  });

  it('labels a bucket by what it contains, edges included', () => {
    // Boundaries are low <= age < high, so an age of exactly 30 is in "30-60".
    expect(agingBucketLabel('0-30')).toBe('Under 30 days');
    expect(agingBucketLabel('30-60')).toBe('30 to 60 days');
    expect(agingBucketLabel('180+')).toBe('Over 180 days');
    expect(agingBucketLabel(UNKNOWN_AGE_BUCKET)).toBe('Age unknown');
    // A bucket the backend adds later reads as itself, not as "Unknown".
    expect(agingBucketLabel('365+')).toBe('365+');
  });
});

describe('aging rows', () => {
  it('keys a row by (item, location), because the item id repeats', () => {
    // Verified live: inventory_item_id 2423 appears twice, once per location.
    expect(agingRowKey({ inventory_item_id: 2423, location_id: UUID })).toBe(`2423:${UUID}`);
  });

  it('renders an unrecorded age as an em dash rather than as day zero', () => {
    expect(formatAgeDays(null)).toBe(EM_DASH);
    expect(formatAgeDays(null)).not.toBe('0 days');
    expect(formatAgeDays(45)).toBe('45 days');
  });

  it('carries the endpoint OWN approximation sentence, not a copy of it', () => {
    // Printing the backend's own field means the screen stops claiming the old
    // method the day the method changes.
    expect(agingCaveat('Age is days since the most recent inbound movement.')).toBe('Age is days since the most recent inbound movement.');
    expect(agingCaveat(null)).toContain('most recent inbound movement');
    expect(agingCaveat('   ')).toContain('It dates the batch, not each unit.');
  });

  it('warns that the window does not touch the aging figures', () => {
    expect(AGING_IGNORES_WINDOW_NOTE).toContain('does not change them');
  });
});

// ---------------------------------------------------------------------------
// The window, on the artefact
// ---------------------------------------------------------------------------

describe('window labelling', () => {
  const window = (over: Partial<AnalyticsWindow> = {}): AnalyticsWindow => ({
    start: over.start ?? '2026-07-07',
    end: over.end ?? '2026-08-05',
    days: over.days ?? 30
  });

  it('captions an artefact with the window it was computed over', () => {
    // The design doc requires the window to be visible ON the artefact: a chart
    // that is exported or pasted elsewhere loses the picker that produced it.
    expect(describeWindow(window())).toBe('30 days to 5 Aug 2026');
  });

  it('reports the server day count as-is, inclusive ends and all', () => {
    // The default 90-day window reports 91 because `end` is inclusive. Rounding
    // that to "90 days" would make the caption disagree with the figures.
    expect(describeWindow(window({ start: '2026-05-07', days: 91 }))).toBe('91 days to 5 Aug 2026');
    expect(describeWindow(window({ start: '2026-08-05', days: 1 }))).toBe('1 day to 5 Aug 2026');
  });

  it('computes the count itself when the envelope did not carry one', () => {
    expect(describeWindow({ start: '2026-08-01', end: '2026-08-05', days: 0 })).toBe('5 days to 5 Aug 2026');
  });

  it('renders a missing window as an em dash rather than as today', () => {
    expect(describeWindow(null)).toBe(EM_DASH);
    expect(describeWindow(window({ end: 'not-a-date' }))).toBe(EM_DASH);
  });

  it('spells the range out for a subtitle', () => {
    expect(describeWindowRange(window())).toBe('7 Jul 2026 – 5 Aug 2026');
    expect(describeWindowRange(window({ start: 'nope' }))).toBe(EM_DASH);
  });

  it('names the scope beside the window', () => {
    expect(describeScope({ location_name: 'Downtown' })).toBe('Downtown');
    expect(describeScope({ location_name: null })).toBe('All locations');
    expect(describeScope(null)).toBe('All locations');
  });
});

describe('formatWindowDate', () => {
  it('reads a calendar date as a calendar date', () => {
    expect(formatWindowDate('2026-08-05')).toBe('5 Aug 2026');
    expect(formatWindowDate('2026-01-01')).toBe('1 Jan 2026');
    expect(formatWindowDate('2026-12-31')).toBe('31 Dec 2026');
    expect(formatWindowDate(null)).toBe(EM_DASH);
  });

  it('does not show yesterday to a reader west of Greenwich', () => {
    // `new Date('2026-08-05')` is UTC midnight, which is 4 August in every
    // American timezone. A caption reading "to 4 Aug" for a window that ended
    // on the 5th makes every figure under it unverifiable.
    const original = process.env.TZ;
    try {
      process.env.TZ = 'America/Los_Angeles';
      expect(new Date('2026-08-05').getDate()).toBe(4);
      expect(formatWindowDate('2026-08-05')).toBe('5 Aug 2026');
      expect(formatWindowDate('2026-08-05')).not.toBe('4 Aug 2026');
    } finally {
      // Deleting rather than assigning back: `process.env.TZ = undefined` stores
      // the literal string "undefined", which is not a timezone and would leave
      // every later test in this worker reading dates in some other calendar.
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    }
  });
});

describe('isCalendarDate and daysInclusive', () => {
  it('accepts only the strict, zero-padded form the backend parses', () => {
    // Python 3.10's date.fromisoformat is strict: all three of these 400.
    expect(isCalendarDate('2026-01-01')).toBe(true);
    expect(isCalendarDate('2026-1-1')).toBe(false);
    expect(isCalendarDate('20260101')).toBe(false);
    expect(isCalendarDate('2026-01-01T00:00:00')).toBe(false);
    expect(isCalendarDate('')).toBe(false);
    expect(isCalendarDate(20260101)).toBe(false);
  });

  it('rejects a date that has a shape but no place in the calendar', () => {
    expect(isCalendarDate('2026-02-30')).toBe(false);
    expect(isCalendarDate('2026-02-29')).toBe(false);
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('2026-00-10')).toBe(false);
  });

  it('counts days inclusively, the way the envelope does', () => {
    expect(daysInclusive('2026-08-05', '2026-08-05')).toBe(1);
    expect(daysInclusive('2026-07-07', '2026-08-05')).toBe(30);
    // Across a spring-forward boundary the count is still calendar days.
    expect(daysInclusive('2026-03-07', '2026-03-09')).toBe(3);
    expect(daysInclusive('2026-08-06', '2026-08-05')).toBeNull();
    expect(daysInclusive(null, '2026-08-05')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Query builders — the params that 500
// ---------------------------------------------------------------------------

describe('analyticsQuery', () => {
  it('omits a location_id that is not a uuid, because that is an HTML 500', () => {
    // Django's ValidationError escapes DRF's handler, so response.json() throws
    // before any error key can be read: the page cannot even say what happened.
    expect(analyticsQuery({ locationId: 'not-a-uuid' })).toBe('');
    expect(analyticsQuery({ locationId: '' })).toBe('');
    expect(analyticsQuery({ locationId: null })).toBe('');
    expect(analyticsQuery({ locationId: UUID })).toBe(`location_id=${UUID}`);
  });

  it('sends only strictly formatted dates', () => {
    expect(analyticsQuery({ start: '2026-07-07', end: '2026-08-05' })).toBe('start=2026-07-07&end=2026-08-05');
    expect(analyticsQuery({ start: '2026-7-7', end: '2026-08-05' })).toBe('end=2026-08-05');
  });

  it('drops an inverted range whole rather than half', () => {
    // Applying one end of a range the user has not finished typing silently
    // changes every figure on the page.
    expect(lowPerformersQuery({ start: '2026-08-06', end: '2026-08-05' })).toBe('');
    expect(analyticsQuery({ start: '2026-08-06', end: '2026-08-05' })).toBe('');
    expect(analyticsQuery({ start: '2026-08-06', end: '2026-08-05' })).not.toContain('start=');
  });
});

describe('lowPerformersQuery', () => {
  it('never sends min_capital=NaN, which is an uncaught 500', () => {
    // Decimal("NaN") constructs fine, survives the view's try/except, and then
    // raises InvalidOperation on the first comparison.
    expect(lowPerformersQuery({ minCapital: Number.NaN })).toBe('');
    expect(lowPerformersQuery({ minCapital: 'NaN' })).toBe('');
    expect(lowPerformersQuery({ minCapital: Number.POSITIVE_INFINITY })).toBe('');
    expect(lowPerformersQuery({ minCapital: 'abc' })).toBe('');
  });

  it('sends plain decimal text and never exponent notation', () => {
    expect(lowPerformersQuery({ minCapital: 100 })).toBe('min_capital=100');
    expect(lowPerformersQuery({ minCapital: '  12.50  ' })).toBe('min_capital=12.50');
    expect(lowPerformersQuery({ minCapital: 1e21 })).toBe('');
    expect(lowPerformersQuery({ minCapital: '' })).toBe('');
  });

  it('sends an integer limit inside the server own clamp', () => {
    expect(lowPerformersQuery({ limit: 25 })).toBe('limit=25');
    expect(lowPerformersQuery({ limit: 0 })).toBe('limit=1');
    expect(lowPerformersQuery({ limit: 9999 })).toBe('limit=200');
    // A float or a blank is a 400 from int(), so it is not sent at all.
    expect(lowPerformersQuery({ limit: 1.5 })).toBe('');
    expect(lowPerformersQuery({ limit: null })).toBe('');
  });
});

describe('matrixQuery', () => {
  it('gates product_id on a uuid, which has the same 500 as location_id', () => {
    expect(matrixQuery({ productId: 'not-a-uuid' })).toBe('');
    expect(matrixQuery({ productId: UUID })).toBe(`product_id=${UUID}`);
  });

  it('sends a trimmed category and omits a blank one', () => {
    expect(matrixQuery({ category: '  Dresses ' })).toBe('category=Dresses');
    expect(matrixQuery({ category: '   ' })).toBe('');
  });
});

describe('itemAnalyticsId', () => {
  it('accepts only an integer, because a non-integer segment 404s in HTML', () => {
    // InventoryItem's pk is an AutoField, unlike Location and Product. A
    // non-integer misses Django's resolver entirely, so the error body is a
    // page and a JSON-assuming client fails to parse its own failure.
    expect(itemAnalyticsId(2423)).toBe(2423);
    expect(itemAnalyticsId('2423')).toBe(2423);
    expect(itemAnalyticsId(UUID)).toBeNull();
    expect(itemAnalyticsId('abc')).toBeNull();
    expect(itemAnalyticsId(1.5)).toBeNull();
    expect(itemAnalyticsId(0)).toBeNull();
    expect(itemAnalyticsId(null)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Low performers
// ---------------------------------------------------------------------------

const lowPerformer = (over: Partial<LowPerformerRow> = {}): LowPerformerRow => ({
  inventory_item_id: over.inventory_item_id ?? 1,
  sku: over.sku ?? 'SKU',
  name: over.name ?? 'Item',
  size: over.size ?? '',
  color: over.color ?? '',
  category: over.category ?? 'Uncategorized',
  product_id: over.product_id ?? null,
  style_code: over.style_code ?? null,
  style_name: over.style_name ?? null,
  opening_stock: over.opening_stock ?? 10,
  units_received: over.units_received ?? 0,
  units_sold: over.units_sold ?? 1,
  on_hand: over.on_hand ?? 9,
  sell_through: over.sell_through === undefined ? 0.1 : over.sell_through,
  daily_velocity: over.daily_velocity ?? 0.03,
  days_of_cover: over.days_of_cover === undefined ? 300 : over.days_of_cover,
  weeks_of_supply: over.weeks_of_supply ?? 42,
  cost_price: over.cost_price ?? '20.00',
  unit_price: over.unit_price ?? '60.00',
  stock_value_at_cost: over.stock_value_at_cost ?? '180.00',
  age_days: over.age_days ?? 120,
  capital_tied: over.capital_tied ?? '180.00'
});

describe('rankLowPerformers', () => {
  it('does NOT let a negative sell-through head the markdown list', () => {
    // The backend ranks sell_through ASCENDING, so -200% is the smallest number
    // there is and a single refund takes the top of the list. That row is not
    // the worst seller in the shop; it is one that sold and came back.
    const rows = [
      lowPerformer({ name: 'refunded', sell_through: -2 }),
      lowPerformer({ name: 'genuinely-dead', sell_through: 0.02 }),
      lowPerformer({ name: 'slow', sell_through: 0.2 })
    ];
    const { candidates, netReturns } = rankLowPerformers(rows);
    expect(candidates.map((row) => row.name)).toEqual(['genuinely-dead', 'slow']);
    expect(netReturns.map((row) => row.name)).toEqual(['refunded']);

    const ordered = orderLowPerformers(rows);
    expect(ordered[0].name).toBe('genuinely-dead');
    // The wrong answer, stated so the two can never be confused.
    expect(ordered[0].name).not.toBe('refunded');
    expect(ordered[ordered.length - 1].name).toBe('refunded');
  });

  it('preserves the backend rank inside each partition, adding no sort of its own', () => {
    // sell_through ASC with capital DESC as tiebreak is already correct, and
    // the endpoint's row order is stable; re-sorting would only lose the
    // tiebreak.
    const rows = [
      lowPerformer({ name: 'a', sell_through: 0.05, capital_tied: '900.00' }),
      lowPerformer({ name: 'b', sell_through: 0.05, capital_tied: '100.00' }),
      lowPerformer({ name: 'c', sell_through: 0.4 })
    ];
    expect(orderLowPerformers(rows).map((row) => row.name)).toEqual(['a', 'b', 'c']);
  });

  it('treats an undefined sell-through as a candidate rather than as a negative', () => {
    const rows = [lowPerformer({ name: 'unknown', sell_through: null })];
    expect(rankLowPerformers(rows).candidates.map((row) => row.name)).toEqual(['unknown']);
  });

  it('handles an absent payload without throwing', () => {
    expect(rankLowPerformers(null)).toEqual({ candidates: [], netReturns: [] });
    expect(orderLowPerformers(undefined)).toEqual([]);
  });
});

describe('describeLowPerformerTotal', () => {
  it('labels the total as the listed rows, because that is all it sums', () => {
    // Verified: 760.00 unlimited versus 180.00 with limit=1. Calling it a
    // company total invites a reconciliation against the balance sheet.
    expect(describeLowPerformerTotal('180.00', 1)).toBe('$180.00 tied up in the 1 listed item');
    expect(describeLowPerformerTotal('760.00', 4)).toBe('$760.00 tied up in the 4 listed items');
    expect(describeLowPerformerTotal(null, 0)).toContain(EM_DASH);
  });
});

// ---------------------------------------------------------------------------
// Roll-ups
// ---------------------------------------------------------------------------

describe('roll-ups recompute from summed inputs', () => {
  it('NEVER averages per-item sell-through ratios', () => {
    // One unit that sold and ninety-nine that did not is 1% sold through, not
    // 50%. Averaging weights a single unit exactly as heavily as a hundred, and
    // the answer it gives points a buyer the other way.
    const rows = [
      { opening_stock: 1, units_received: 0, units_sold: 1 },
      { opening_stock: 99, units_received: 0, units_sold: 0 }
    ];
    const rolled = rollUpSellThrough(rows);
    expect(rolled).toBeCloseTo(0.01, 10);

    const averaged = (1 + 0) / 2;
    expect(rolled).not.toBeCloseTo(averaged, 2);
  });

  it('counts received units in the denominator, as the definition says', () => {
    expect(rollUpSellThrough([{ opening_stock: 10, units_received: 10, units_sold: 5 }])).toBeCloseTo(0.25, 10);
  });

  it('abstains rather than dividing by a denominator that is not positive', () => {
    // Nothing was ever stocked — the backend's own null condition — or the
    // derived opening stock has undershot negative on backdated data.
    expect(rollUpSellThrough([{ opening_stock: 0, units_received: 0, units_sold: 0 }])).toBeNull();
    expect(rollUpSellThrough([{ opening_stock: -5, units_received: 0, units_sold: 3 }])).toBeNull();
    expect(rollUpSellThrough([])).toBeNull();
  });

  it('keeps a negative numerator, because net returns are real', () => {
    expect(rollUpSellThrough([{ opening_stock: 1, units_received: 0, units_sold: -2 }])).toBeCloseTo(-2, 10);
  });

  it('rolls units up and recomputes the group ratio from the totals', () => {
    const rolled = rollUpUnits([
      { opening_stock: 1, units_received: 0, units_sold: 1, on_hand: 0 },
      { opening_stock: 99, units_received: 0, units_sold: 0, on_hand: 99 }
    ]);
    expect(rolled).toEqual({ opening_stock: 100, units_received: 0, units_sold: 1, on_hand: 99, sell_through: 0.01 });
  });

  it('NEVER averages margin percentages either', () => {
    const loss: GmroiBlock = {
      revenue: '10.00',
      cogs: '50.00',
      gross_margin: '-40.00',
      gross_margin_pct: -400.0,
      average_inventory_cost: '100.00',
      gmroi: -0.4,
      stock_turn: 0.5
    };
    const profit: GmroiBlock = {
      revenue: '90.00',
      cogs: '30.00',
      gross_margin: '60.00',
      gross_margin_pct: 66.66666666666667,
      average_inventory_cost: '100.00',
      gmroi: 0.6,
      stock_turn: 0.3
    };
    const rolled = rollUpGmroi([loss, profit]);
    expect(rolled.revenue).toBe('100.0000');
    expect(rolled.cogs).toBe('80.0000');
    expect(rolled.gross_margin).toBe('20.0000');
    expect(rolled.gross_margin_pct).toBeCloseTo(20, 10);
    expect(rolled.gmroi).toBeCloseTo(0.1, 10);
    expect(rolled.stock_turn).toBeCloseTo(0.4, 10);

    // The averaged answer is not merely less precise, it has the wrong sign.
    const averagedPct = (-400 + 66.66666666666667) / 2;
    expect(rolled.gross_margin_pct).not.toBeCloseTo(averagedPct, 2);
    expect(rolled.gross_margin_pct as number).toBeGreaterThan(0);
  });

  it('sums money exactly, so a long list does not drift a cent', () => {
    const penny = (): GmroiBlock => ({
      revenue: '0.10',
      cogs: '0.20',
      gross_margin: '-0.10',
      gross_margin_pct: -100,
      average_inventory_cost: '0.00',
      gmroi: null,
      stock_turn: null
    });
    const rolled = rollUpGmroi([penny(), penny(), penny()]);
    expect(rolled.revenue).toBe('0.3000');
    expect(formatMoney(rolled.gross_margin)).toBe('-$0.30');
    // Float addition of 0.1 three times is 0.30000000000000004.
    expect(Number(rolled.revenue)).toBe(0.3);
  });

  it('returns nulls, not zeros, when a roll-up has no inventory behind it', () => {
    const rolled = rollUpGmroi([]);
    expect(rolled.gmroi).toBeNull();
    expect(rolled.stock_turn).toBeNull();
    expect(rolled.gross_margin_pct).toBeNull();
    expect(rolled.revenue).toBe('0.0000');
  });
});

// ---------------------------------------------------------------------------
// The style matrix
// ---------------------------------------------------------------------------

describe('the style matrix grid', () => {
  const cell = (over: Partial<MatrixCell> = {}): MatrixCell => ({
    size: over.size ?? '',
    color: over.color ?? '',
    units_sold: over.units_sold ?? 0,
    on_hand: over.on_hand ?? 0,
    opening_stock: over.opening_stock ?? 0,
    units_received: over.units_received ?? 0,
    variants: over.variants ?? 1,
    stock_value_at_cost: over.stock_value_at_cost ?? '0.00',
    sell_through: over.sell_through === undefined ? null : over.sell_through
  });

  const cells = [cell({ size: 'M', color: 'Ivory', on_hand: 6 }), cell({ size: '', color: '', on_hand: 4, stock_value_at_cost: '20.00' })];
  const serverSizes = ['L', 'M', 'S'];
  const serverColors = ['Ivory'];

  it('adds the blank axis a real cell needs, or that stock vanishes from the grid', () => {
    // The backend builds sizes/colors with `if row['size']` but keys cells with
    // `(size or '', color or '')`, so a one-size, no-colour variant produces a
    // real cell no sizes x colors intersection ever reaches.
    const axes = matrixAxes(cells, serverSizes, serverColors);
    expect(axes.sizes).toEqual(['L', 'M', 'S', '']);
    expect(axes.colors).toEqual(['Ivory', '']);
    expect(axes.addedBlankSize).toBe(true);
    expect(axes.addedBlankColor).toBe(true);
  });

  it('proves the server axes lose the units and the capital', () => {
    const index = matrixIndex(cells);
    const drawn = (sizes: string[], colors: string[]) =>
      sizes.flatMap((size) => colors.map((color) => matrixCellAt(index, size, color)?.on_hand ?? 0)).reduce((a, b) => a + b, 0);

    const axes = matrixAxes(cells, serverSizes, serverColors);
    expect(drawn(axes.sizes, axes.colors)).toBe(10);
    // The wrong answer: four units and $20 of capital simply absent.
    expect(drawn(serverSizes, serverColors)).toBe(6);
  });

  it('leaves a combination that does not exist EMPTY rather than zero', () => {
    // Drawing a 0 claims a variant exists and has never sold.
    const index = matrixIndex(cells);
    expect(matrixCellAt(index, 'L', 'Ivory')).toBeNull();
    expect(matrixCellAt(index, 'M', 'Ivory')?.on_hand).toBe(6);
  });

  it('never collides two cells whose free-text axes concatenate the same way', () => {
    const odd = [cell({ size: 'XS L', color: 'Ivory', on_hand: 1 }), cell({ size: 'XS', color: 'L Ivory', on_hand: 2 })];
    const index = matrixIndex(odd);
    expect(matrixCellAt(index, 'XS L', 'Ivory')?.on_hand).toBe(1);
    expect(matrixCellAt(index, 'XS', 'L Ivory')?.on_hand).toBe(2);
  });

  it('names a blank axis value instead of showing an empty header', () => {
    expect(matrixAxisLabel('', 'size')).toBe('One size');
    expect(matrixAxisLabel('', 'color')).toBe('No colour');
    expect(matrixAxisLabel('M', 'size')).toBe('M');
  });

  it('does not add a blank axis when no cell needs one', () => {
    const axes = matrixAxes([cell({ size: 'M', color: 'Ivory' })], serverSizes, serverColors);
    expect(axes.sizes).toEqual(serverSizes);
    expect(axes.addedBlankSize).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Shrinkage
// ---------------------------------------------------------------------------

describe('describeShrinkage', () => {
  it('reads units as a loss magnitude, never as a signed delta', () => {
    // The backend sends abs(SUM(delta)), so it is always >= 0. A minus sign
    // here would double the one already implied by the word "lost", and a plus
    // sign would be grotesque.
    const reading = describeShrinkage({ units: 12, cost: '60.0000' });
    expect(reading.units).toBe('12');
    expect(reading.units).not.toBe('-12');
    expect(reading.units).not.toBe('+12');
    expect(reading.cost).toBe('$60.00');
    expect(reading.summary).toBe('12 units lost, $60.00 at cost');
    expect(reading.tone).toBe('negative');
  });

  it('states a real zero rather than showing an em dash', () => {
    // Zero shrinkage is an answer ("nothing went missing"), not a missing one.
    const reading = describeShrinkage({ units: 0, cost: '0.0000' });
    expect(reading.isZero).toBe(true);
    expect(reading.summary).toBe('No shrinkage recorded in this window');
    expect(reading.tone).toBe('neutral');
  });

  it('renders an absent block as unknown, which is a different claim', () => {
    const reading = describeShrinkage(null);
    expect(reading.summary).toBe(EM_DASH);
    expect(reading.isZero).toBe(false);
    expect(reading.tone).toBe('unknown');
  });

  it('says "unit" once and "units" otherwise', () => {
    expect(describeShrinkage({ units: 1, cost: '5.0000' }).summary).toBe('1 unit lost, $5.00 at cost');
  });
});

// ---------------------------------------------------------------------------
// The sentences that stop a reconciliation nobody can win
// ---------------------------------------------------------------------------

describe('the caveats an artefact carries', () => {
  it('explains sell-through, including why the totals will not agree', () => {
    // A buyer comparing a style's company-wide figure with the sum of its
    // locations otherwise concludes one of them is broken. Both are correct:
    // per location, transfers in count as received.
    expect(SELL_THROUGH_DEFINITION).toContain('units sold ÷ (opening stock + units received)');
    expect(SELL_THROUGH_DEFINITION).toContain('net of returns');
    expect(SELL_THROUGH_DEFINITION).toContain('transferred in');
    expect(sellThroughDefinitionFor('location')).toContain('per location');
    expect(sellThroughDefinitionFor('company')).toContain('company-wide');
    expect(sellThroughDefinitionFor('company')).not.toBe(sellThroughDefinitionFor('location'));
  });

  it('warns that a capital total here will not tie out to the dashboard', () => {
    // These endpoints include is_active=False variants; the dashboard's
    // inventory-value KPI filters them out.
    expect(ARCHIVED_VARIANTS_CAVEAT).toContain('archived');
    expect(ARCHIVED_VARIANTS_CAVEAT).toContain('will not tie out');
  });

  it('explains a negative row instead of leaving it looking like a bug', () => {
    expect(NET_RETURNS_NOTE).toContain('came back into stock');
    expect(NET_RETURNS_NOTE).toContain('not a demand signal');
  });

  it('admits the five-minute cache, so a just-made stock change is not a mystery', () => {
    expect(ANALYTICS_STALENESS_NOTE).toContain('5 minutes');
  });

  it('warns that per-location rows do not add up to the company figures', () => {
    expect(LOCATION_SCOPE_CAVEAT).toContain('transferred in');
    expect(LOCATION_SCOPE_CAVEAT).toContain('do not add up');
  });

  it('says the location comparison ignores the location filter, since it silently does', () => {
    // /analytics/locations/ validates location_id, echoes it into the envelope
    // and folds it into the cache key — and then computes every store anyway.
    expect(LOCATION_FILTER_IGNORED_NOTE).toContain('not applied');
    expect(LOCATION_FILTER_IGNORED_NOTE).toContain('every location');
  });

  it('reconciles this screen with the older overstock card instead of contradicting it', () => {
    // Two surfaces, two answers for the same item: slow_movers keeps a 999
    // sentinel and totals capital over ALL slow movers, these endpoints return
    // null and total over the truncated list. Shipping both without saying so
    // is what turns a definition change into a bug report.
    expect(OVERSTOCK_DIVERGENCE_NOTE).toContain('999');
    expect(OVERSTOCK_DIVERGENCE_NOTE).toContain('Never sold');
  });
});

// ---------------------------------------------------------------------------
// The window picker's own arithmetic
// ---------------------------------------------------------------------------

describe('choosing a window', () => {
  it('reads the local calendar day, so an evening in New York is not already tomorrow', () => {
    // `toISOString().slice(0, 10)` converts to UTC first. At 23:30 local, west
    // of Greenwich, that is the NEXT day — a default window ending on a date
    // that has not happened yet.
    const lateEvening = new Date(2026, 0, 1, 23, 30, 0);
    expect(isoDateOf(lateEvening)).toBe('2026-01-01');
    expect(isoDateOf(lateEvening)).not.toBe('2026-01-02');
  });

  it('zero-pads, because Python 3.10 rejects "2026-1-1" outright', () => {
    // date.fromisoformat is strict server-side: an unpadded month is a 400, not
    // a lenient parse.
    expect(isoDateOf(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isCalendarDate(isoDateOf(new Date(2026, 0, 5)))).toBe(true);
  });

  it('makes a 30-day preset span 30 days INCLUSIVE, not 31', () => {
    // The server's window counts both ends — which is why its own 90-day
    // default reports 91 — so a preset that subtracted a full 30 days would
    // quietly widen every figure on the screen by a day.
    const window = presetWindow(30, new Date(2026, 7, 5));
    expect(window).toEqual({ start: '2026-07-07', end: '2026-08-05' });
    expect(daysInclusive(window.start, window.end)).toBe(30);
    expect(daysInclusive(window.start, window.end)).not.toBe(31);
  });

  it('never produces an empty or inverted window from a silly number of days', () => {
    const window = presetWindow(0, new Date(2026, 7, 5));
    expect(window.start).toBe('2026-08-05');
    expect(daysInclusive(window.start, window.end)).toBe(1);
  });

  it('offers presets the query builder will actually send', () => {
    WINDOW_PRESETS.forEach((preset) => {
      const window = presetWindow(preset.days, new Date(2026, 7, 5));
      // A window the builder drops would silently fall back to the server's
      // default while the picker still showed the chosen preset.
      expect(analyticsQuery(window)).toBe(`start=${window.start}&end=${window.end}`);
    });
  });
});

// ---------------------------------------------------------------------------
// Aggregate labels and chart series
// ---------------------------------------------------------------------------

describe('aggregate keys', () => {
  it('names the "-" size bucket rather than printing a dash that reads as unknown', () => {
    // by_size/by_color spell the blank "-" while cells spell it "". On a screen
    // where a dash means "we do not know", that row is the opposite: it is
    // every one-size garment, and it is often the biggest bar on the chart.
    expect(aggKeyLabel('-', 'size')).toBe(BLANK_SIZE_LABEL);
    expect(aggKeyLabel('-', 'size')).not.toBe('-');
    expect(aggKeyLabel('-', 'size')).not.toBe(EM_DASH);
    expect(aggKeyLabel('-', 'color')).toBe(BLANK_COLOUR_LABEL);
    expect(aggKeyLabel('', 'size')).toBe(BLANK_SIZE_LABEL);
  });

  it('leaves a real key alone, including the backend’s own "Uncategorized"', () => {
    expect(aggKeyLabel('M', 'size')).toBe('M');
    expect(aggKeyLabel('Ivory', 'color')).toBe('Ivory');
    expect(aggKeyLabel('Uncategorized', 'category')).toBe('Uncategorized');
  });
});

describe('sell-through as a chart series', () => {
  it('leaves never-stocked groups OFF the chart instead of drawing them at zero', () => {
    // A null sell-through has a zero denominator: nothing was on the shelf and
    // nothing arrived. A 0% bar makes it the worst performer in the shop.
    const series = sellThroughSeries([
      { label: 'Dresses', sellThrough: 0.52 },
      { label: 'Coats', sellThrough: null },
      { label: 'Knitwear', sellThrough: 0.1 }
    ]);
    expect(series.categories).toEqual(['Dresses', 'Knitwear']);
    expect(series.values).toEqual([52, 10]);
    expect(series.categories).not.toContain('Coats');
    expect(series.omitted).toBe(1);
  });

  it('charts a negative sell-through below the axis rather than clamping it', () => {
    // -2.0 is a refund artefact. Clamped to 0 it becomes an ordinary bad
    // seller; drawn unsigned it becomes the best seller on the chart.
    const series = sellThroughSeries([{ label: 'Returned tee', sellThrough: -2 }]);
    expect(series.values).toEqual([-200]);
    expect(series.values).not.toEqual([200]);
    expect(series.values).not.toEqual([0]);
  });

  it('caps AFTER dropping the nulls, so a top-10 chart draws ten bars', () => {
    const series = sellThroughSeries(
      [
        { label: 'A', sellThrough: null },
        { label: 'B', sellThrough: 0.9 },
        { label: 'C', sellThrough: 0.8 }
      ],
      2
    );
    expect(series.categories).toEqual(['B', 'C']);
    expect(series.omitted).toBe(1);
  });

  it('returns an empty series rather than throwing on a missing payload', () => {
    expect(sellThroughSeries(null)).toEqual({ categories: [], values: [], omitted: 0 });
  });
});

// ---------------------------------------------------------------------------
// Failures
// ---------------------------------------------------------------------------

describe('describeAnalyticsError', () => {
  it('does not blame the user’s filters for a 500 whose body is not even JSON', () => {
    // A malformed location_id/product_id/min_capital returns Django's HTML
    // error page. The query builders make that unreachable, so a 500 arriving
    // anyway is ours — telling the user to fix their input sends them hunting
    // for a mistake they did not make.
    const htmlFiveHundred = { response: { status: 500, data: '<!doctype html><html><title>Server Error (500)</title>' } };
    const message = describeAnalyticsError(htmlFiveHundred);
    expect(message).toContain('fault on our side');
    expect(message).not.toContain('filter is');
  });

  it('shows the server’s own sentence for the three JSON shapes', () => {
    expect(describeAnalyticsError({ response: { status: 400, data: { error: 'X-Role-ID header is required' } } })).toContain('X-Role-ID');
    expect(describeAnalyticsError({ response: { status: 400, data: { detail: 'start must not be after end.' } } })).toContain(
      'start must not be after end.'
    );
    expect(describeAnalyticsError({ response: { status: 400, data: { min_capital: ['Must be a number.'] } } })).toContain(
      'Must be a number.'
    );
  });

  it('falls back to a plain sentence when there is no body at all', () => {
    expect(describeAnalyticsError(new Error('Network Error'))).toBe('Could not load these figures. Please try again.');
  });
});
