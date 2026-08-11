import { describe, expect, it } from 'vitest';

import {
  AvailabilitySplit,
  CascadeState,
  ColorGridTwoAxis,
  ColorRun,
  LookupCell,
  LookupColorGroup,
  LookupLocation,
  LookupResolvedResponse,
  LookupScale,
  LookupSearchResponse,
  SizeMatch,
  advanceCascade,
  axisDisplayLabel,
  buildColorGrids,
  buildLookupQuery,
  currentAttempt,
  describeAvailability,
  describeCellFact,
  findScannedCell,
  formatArrivalDate,
  groupSizeMatches,
  inTransitQty,
  isSearchResponse,
  onHandAt,
  onHandByLocation,
  onHandTotal,
  onOrderTotal,
  outcomeForStatus,
  soonestArrival,
  splitAvailability,
  startCascade,
  submissionPlan,
  toLookupQuery
} from './sizing';
import { EM_DASH } from './stockFormat';

// --- fixtures ---------------------------------------------------------------

const HERE = 'aaaaaaaa-1111-4111-8111-111111111111';
const UPTOWN = 'bbbbbbbb-2222-4222-8222-222222222222';
const DOWNTOWN = 'cccccccc-3333-4333-8333-333333333333';

const LOCATIONS: LookupLocation[] = [
  { id: HERE, name: 'Main Street', is_default: true },
  { id: DOWNTOWN, name: 'Downtown', is_default: false },
  { id: UPTOWN, name: 'Uptown', is_default: false }
];

let nextVariantId = 100;

/**
 * A cell as the backend builds it. `on_hand_by_location` defaults to {} — a
 * KNOWN zero everywhere; tests about the unknown state pass `on_hand_by_location:
 * undefined` explicitly, mirroring a payload that carried no map.
 */
const cell = (over: Partial<LookupCell> = {}): LookupCell => {
  nextVariantId += 1;
  return {
    size_key: over.size_key ?? 'M',
    axis_values: over.axis_values ?? [over.size_key ?? 'M'],
    variant_id: over.variant_id ?? nextVariantId,
    sku: over.sku === undefined ? 'LS100-IVORY-M' : over.sku,
    barcode: over.barcode === undefined ? '0123456789012' : over.barcode,
    on_hand_by_location: 'on_hand_by_location' in over ? over.on_hand_by_location : {},
    ...(over.in_transit !== undefined ? { in_transit: over.in_transit } : {}),
    on_order: over.on_order ?? []
  };
};

const alphaScale = (over: Partial<LookupScale> = {}): LookupScale => ({
  id: 'dddddddd-4444-4444-8444-444444444444',
  name: 'Alpha',
  kind: 'alpha',
  axes: 1,
  axis_labels: ['Size'],
  values: [['XS', 'S', 'M', 'L', 'XL']],
  ...over
});

const denimScale = (): LookupScale => ({
  id: 'eeeeeeee-5555-4555-8555-555555555555',
  name: 'Denim W×L',
  kind: 'composite',
  axes: 2,
  axis_labels: ['Waist', 'Inseam'],
  values: [
    ['30', '32', '34'],
    ['30', '32']
  ]
});

const group = (color: string, cells: LookupCell[]): LookupColorGroup => ({ color, cells });

// --- response discrimination --------------------------------------------------

describe('isSearchResponse', () => {
  it('tells a q answer (results) from a resolved answer (matrix), because the two shapes share nothing else', () => {
    const search: LookupSearchResponse = { results: [], total: 0, size_matches: [] };
    const resolved: LookupResolvedResponse = { style: null, scale: null, matrix: [], locations: [], scanned_variant_id: 7 };
    expect(isSearchResponse(search)).toBe(true);
    expect(isSearchResponse(resolved)).toBe(false);
  });
});

// --- grid building ------------------------------------------------------------

describe('buildColorGrids — 1-axis run', () => {
  it('lays cells out in SCALE order with the hole between S and L as an explicit missing cell — collapsing the gap hides what a buyer needs', () => {
    const grids = buildColorGrids(alphaScale(), [
      group('Ivory', [cell({ size_key: 'S', axis_values: ['S'] }), cell({ size_key: 'L', axis_values: ['L'] })])
    ]);
    const run = grids[0] as ColorRun;
    expect(run.layout).toBe('run');
    expect(run.columns).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    // The WRONG answer is a 2-cell run of [S, L] sitting adjacent.
    expect(run.cells).toHaveLength(5);
    expect(run.cells.map((c) => c.kind)).toEqual(['missing', 'variant', 'missing', 'variant', 'missing']);
  });

  it('keeps colour groups in the order the backend sent (first-seen creation order), never alphabetical', () => {
    const grids = buildColorGrids(alphaScale(), [group('Slate', [cell({ size_key: 'M' })]), group('Ivory', [cell({ size_key: 'M' })])]);
    expect(grids.map((g) => g.color)).toEqual(['Slate', 'Ivory']);
  });

  it('matches a free-text size onto its scale column case-insensitively — a lowercase "m" belongs in the M column, not in extras', () => {
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [cell({ size_key: 'm', axis_values: ['m'] })])]);
    const run = grids[0] as ColorRun;
    expect(run.cells[2].kind).toBe('variant');
    expect(run.extras).toEqual([]);
  });

  it('puts off-scale free text in extras AFTER the run instead of dropping it — the variant is real even if the vocabulary does not know it', () => {
    const freeText = cell({ size_key: 'Medium-Long', axis_values: ['Medium-Long'] });
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [cell({ size_key: 'M', axis_values: ['M'] }), freeText])]);
    const run = grids[0] as ColorRun;
    expect(run.extras).toEqual([freeText]);
    expect(run.cells.filter((c) => c.kind === 'variant')).toHaveLength(1);
  });

  it('sends the SECOND variant on one position to extras — two SKUs sharing size+colour must both stay visible', () => {
    const first = cell({ size_key: 'M', axis_values: ['M'], sku: 'A' });
    const second = cell({ size_key: 'M', axis_values: ['M'], sku: 'B' });
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [first, second])]);
    const run = grids[0] as ColorRun;
    expect(run.cells[2]).toEqual({ kind: 'variant', cell: first });
    expect(run.extras).toEqual([second]);
  });

  it('treats a sizeless variant (axis_values []) as an extra on a scaled style, not as a phantom column', () => {
    const sizeless = cell({ size_key: '', axis_values: [] });
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [sizeless])]);
    const run = grids[0] as ColorRun;
    expect(run.extras).toEqual([sizeless]);
    expect(run.cells.every((c) => c.kind === 'missing')).toBe(true);
  });
});

describe('buildColorGrids — composite scale', () => {
  it('builds axis 0 (waist) across and axis 1 (inseam) down from the FLAT cell list the backend sends', () => {
    const c3230 = cell({ size_key: '32×30', axis_values: ['32', '30'] });
    const grids = buildColorGrids(denimScale(), [group('Indigo', [c3230])]);
    const grid = grids[0] as ColorGridTwoAxis;
    expect(grid.layout).toBe('grid');
    expect(grid.columns).toEqual(['30', '32', '34']);
    expect(grid.rows).toEqual(['30', '32']);
    // waist 32 is column 1; inseam 30 is row 0 — NOT the transpose.
    expect(grid.cells[0][1]).toEqual({ kind: 'variant', cell: c3230 });
    expect(grid.cells[1][1].kind).toBe('missing');
  });

  it('renders every missing intersection as an explicit missing cell — a 3×2 scale yields a 3×2 grid no matter how few variants exist', () => {
    const grids = buildColorGrids(denimScale(), [group('Indigo', [cell({ size_key: '30×30', axis_values: ['30', '30'] })])]);
    const grid = grids[0] as ColorGridTwoAxis;
    expect(grid.cells).toHaveLength(2);
    expect(grid.cells[0]).toHaveLength(3);
    expect(grid.cells.flat().filter((c) => c.kind === 'missing')).toHaveLength(5);
  });

  it('sends a single-component free-text variant ("32×34" as one string) to extras — it cannot honestly claim an intersection', () => {
    const freeText = cell({ size_key: '32×34', axis_values: ['32×34'] });
    const grids = buildColorGrids(denimScale(), [group('Indigo', [freeText])]);
    const grid = grids[0] as ColorGridTwoAxis;
    expect(grid.extras).toEqual([freeText]);
    expect(grid.cells.flat().every((c) => c.kind === 'missing')).toBe(true);
  });

  it('sends a component value outside the scale run (waist 36 on a 30–34 scale) to extras rather than inventing a column', () => {
    const offScale = cell({ size_key: '36×30', axis_values: ['36', '30'] });
    const grids = buildColorGrids(denimScale(), [group('Indigo', [offScale])]);
    const grid = grids[0] as ColorGridTwoAxis;
    expect(grid.extras).toEqual([offScale]);
  });
});

describe('buildColorGrids — unscaled styles', () => {
  it('renders an unscaled group as a run of its own size keys in backend order, with no gap cells (there is no vocabulary to have holes in)', () => {
    const cells = [cell({ size_key: '8' }), cell({ size_key: '10' }), cell({ size_key: '12' })];
    const grids = buildColorGrids(null, [group('', cells)]);
    const run = grids[0] as ColorRun;
    expect(run.columns).toEqual(['8', '10', '12']);
    expect(run.cells.map((c) => c.kind)).toEqual(['variant', 'variant', 'variant']);
    expect(run.extras).toEqual([]);
  });

  it('renders the variant-only answer (style: null, one-cell matrix) through the same path — the grid code the screen already has', () => {
    const only = cell({ size_key: '', axis_values: [] });
    const grids = buildColorGrids(null, [group('', [only])]);
    const run = grids[0] as ColorRun;
    expect(run.cells).toEqual([{ kind: 'variant', cell: only }]);
  });
});

// --- availability math --------------------------------------------------------

describe('onHandByLocation / onHandTotal — absent map is UNKNOWN, never 0', () => {
  it('answers null when the payload carried no map — the WRONG answer is 0, which claims knowledge nobody has', () => {
    const unknown = cell({ on_hand_by_location: undefined });
    expect(onHandByLocation(unknown)).toBeNull();
    expect(onHandTotal(unknown)).toBeNull();
    expect(onHandTotal(unknown)).not.toBe(0);
  });

  it('answers a real 0 for {} — the contract omits zero rows, so an empty map IS a known zero everywhere', () => {
    expect(onHandTotal(cell({ on_hand_by_location: {} }))).toBe(0);
  });

  it('sums across locations', () => {
    expect(onHandTotal(cell({ on_hand_by_location: { [HERE]: 3, [UPTOWN]: 4 } }))).toBe(7);
  });
});

describe('onHandAt — absent LOCATION key inside a present map is a known zero', () => {
  it('answers 0 for a location the map omits, because the backend drops zero-qty rows', () => {
    expect(onHandAt(cell({ on_hand_by_location: { [UPTOWN]: 3 } }), HERE)).toBe(0);
  });

  it('answers null when the map itself is absent — per-location ignorance is total ignorance', () => {
    expect(onHandAt(cell({ on_hand_by_location: undefined }), HERE)).toBeNull();
  });
});

describe('inTransitQty / onOrderTotal / soonestArrival', () => {
  it('reads an absent in_transit key as a known 0 — the contract DROPS the key at zero, unlike the on-hand map', () => {
    expect(inTransitQty(cell())).toBe(0);
    expect(inTransitQty(cell({ in_transit: 4 }))).toBe(4);
  });

  it('totals on-order across every open PO line', () => {
    const c = cell({
      on_order: [
        { qty: 4, expected_at: '2026-08-20', po_number: 'PO-1' },
        { qty: 2, expected_at: null, po_number: 'PO-2' }
      ]
    });
    expect(onOrderTotal(c)).toBe(6);
  });

  it('picks the earliest DATED line as the soonest arrival, recomputing instead of trusting element 0', () => {
    const c = cell({
      on_order: [
        { qty: 2, expected_at: '2026-09-01', po_number: 'PO-2' },
        { qty: 6, expected_at: '2026-08-13', po_number: 'PO-1' }
      ]
    });
    expect(soonestArrival(c)).toEqual({ qty: 6, expected_at: '2026-08-13', po_number: 'PO-1' });
  });

  it('answers null when no line carries a date — the WRONG answer is element 0, an undated row masquerading as a dated arrival', () => {
    expect(soonestArrival(cell({ on_order: [{ qty: 6, expected_at: null, po_number: 'PO-1' }] }))).toBeNull();
  });
});

describe('splitAvailability', () => {
  it('splits here vs elsewhere by the given location, naming locations and sorting elsewhere largest first', () => {
    const c = cell({ on_hand_by_location: { [HERE]: 1, [UPTOWN]: 5, [DOWNTOWN]: 2 } });
    const split = splitAvailability(c, HERE, LOCATIONS);
    expect(split).toEqual<AvailabilitySplit>({
      known: true,
      here: 1,
      elsewhere: 7,
      elsewhereByLocation: [
        { locationId: UPTOWN, name: 'Uptown', qty: 5 },
        { locationId: DOWNTOWN, name: 'Downtown', qty: 2 }
      ]
    });
  });

  it('reports known: false with all-null figures when the map is absent — nothing downstream may read a 0 out of this', () => {
    const split = splitAvailability(cell({ on_hand_by_location: undefined }), HERE, LOCATIONS);
    expect(split).toEqual<AvailabilitySplit>({ known: false, here: null, elsewhere: null, elsewhereByLocation: [] });
  });

  it('keeps stock at a location the active list does not name (a deactivated shop still holding units) under a fallback name', () => {
    const split = splitAvailability(cell({ on_hand_by_location: { 'ffffffff-9999-4999-8999-999999999999': 2 } }), HERE, LOCATIONS);
    expect(split.elsewhereByLocation).toEqual([{ locationId: 'ffffffff-9999-4999-8999-999999999999', name: 'Another location', qty: 2 }]);
  });
});

// --- the three renderings -----------------------------------------------------

describe('describeCellFact — three facts, three renderings', () => {
  it('renders a missing position as empty, unknown stock as an em dash, and a known zero as "0" — all three DISTINCT', () => {
    const missing = describeCellFact({ kind: 'missing' });
    const unknown = describeCellFact({ kind: 'variant', cell: cell({ on_hand_by_location: undefined }) });
    const zero = describeCellFact({ kind: 'variant', cell: cell({ on_hand_by_location: {} }) });
    expect(missing).toBe('');
    expect(unknown).toBe(EM_DASH);
    expect(zero).toBe('0');
    expect(new Set([missing, unknown, zero]).size).toBe(3);
  });

  it('renders known stock as the number', () => {
    expect(describeCellFact({ kind: 'variant', cell: cell({ on_hand_by_location: { [HERE]: 3 } }) })).toBe('3');
  });
});

describe('formatArrivalDate', () => {
  it('renders YYYY-MM-DD as "Thu 13 Aug" from date PARTS — new Date(iso) would parse UTC midnight and shift the day west of Greenwich', () => {
    expect(formatArrivalDate('2026-08-13')).toBe('Thu 13 Aug');
    expect(formatArrivalDate('2026-01-01')).toBe('Thu 1 Jan');
  });

  it('refuses an impossible calendar day — Date silently rolls 2026-02-30 to March 2nd, and relabelling a delivery date is worse than no date', () => {
    expect(formatArrivalDate('2026-02-30')).toBeNull();
  });

  it('answers null for null, junk, and datetime strings — the sentence then says "no date given" instead of inventing one', () => {
    expect(formatArrivalDate(null)).toBeNull();
    expect(formatArrivalDate('soon')).toBeNull();
    expect(formatArrivalDate('2026-08-13T00:00:00Z')).toBeNull();
  });
});

// --- the answer sentence --------------------------------------------------------

describe('describeAvailability — the counter answer', () => {
  it('says "3 here" when the shelf behind the counter has it', () => {
    expect(describeAvailability(cell({ on_hand_by_location: { [HERE]: 3 } }), HERE, LOCATIONS)).toBe('3 here');
  });

  it('names the other shop: "Not here — Uptown has 3"', () => {
    expect(describeAvailability(cell({ on_hand_by_location: { [UPTOWN]: 3 } }), HERE, LOCATIONS)).toBe('Not here — Uptown has 3');
  });

  it('reads out the soonest PO with a real date: "Not here — 6 arrive Thu 13 Aug"', () => {
    const c = cell({ on_hand_by_location: {}, on_order: [{ qty: 6, expected_at: '2026-08-13', po_number: 'PO-1' }] });
    expect(describeAvailability(c, HERE, LOCATIONS)).toBe('Not here — 6 arrive Thu 13 Aug');
  });

  it('strings elsewhere, in-transit and on-order into one sentence with an Oxford "and"', () => {
    const c = cell({
      on_hand_by_location: { [UPTOWN]: 3 },
      in_transit: 2,
      on_order: [{ qty: 6, expected_at: '2026-08-13', po_number: 'PO-1' }]
    });
    expect(describeAvailability(c, HERE, LOCATIONS)).toBe('Not here — Uptown has 3, 2 in transit, and 6 arrive Thu 13 Aug');
  });

  it('handles an undated PO honestly: "on order, no date given" with the TOTAL, not a made-up date', () => {
    const c = cell({ on_hand_by_location: {}, on_order: [{ qty: 6, expected_at: null, po_number: 'PO-1' }] });
    expect(describeAvailability(c, HERE, LOCATIONS)).toBe('Not here — 6 on order, no date given');
  });

  it('uses the singular for one arriving unit: "1 arrives …"', () => {
    const c = cell({ on_hand_by_location: {}, on_order: [{ qty: 1, expected_at: '2026-08-13', po_number: 'PO-1' }] });
    expect(describeAvailability(c, HERE, LOCATIONS)).toBe('Not here — 1 arrives Thu 13 Aug');
  });

  it('says "None anywhere, none on the way" only when zero is KNOWN everywhere and nothing is inbound', () => {
    expect(describeAvailability(cell({ on_hand_by_location: {} }), HERE, LOCATIONS)).toBe('None anywhere, none on the way');
  });

  it('says "Stock unknown" for an absent map — the WRONG answer is "None anywhere", which sends a customer away from a shirt that may be on the shelf', () => {
    const answer = describeAvailability(cell({ on_hand_by_location: undefined }), HERE, LOCATIONS);
    expect(answer).toBe('Stock unknown');
    expect(answer).not.toContain('None anywhere');
  });

  it('still reads out inbound stock when on-hand is unknown, because in-transit and on-order are separately known facts', () => {
    const c = cell({ on_hand_by_location: undefined, in_transit: 2 });
    expect(describeAvailability(c, HERE, LOCATIONS)).toBe('Stock unknown — 2 in transit');
  });

  it('drops the "here" framing when no location is given (the kiosk case) and just names who has it', () => {
    const c = cell({ on_hand_by_location: { [UPTOWN]: 3, [DOWNTOWN]: 1 } });
    expect(describeAvailability(c, null, LOCATIONS)).toBe('Uptown has 3, and Downtown has 1');
  });
});

// --- cell highlight -------------------------------------------------------------

describe('findScannedCell', () => {
  it('finds the scanned variant in LAYOUT coordinates — a variant after a gap keeps its scale column, not a compacted index', () => {
    const scanned = cell({ size_key: 'L', axis_values: ['L'] });
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [cell({ size_key: 'S', axis_values: ['S'] }), scanned])]);
    const hit = findScannedCell(grids, scanned.variant_id);
    // The WRONG answer is colIndex 1 (its position among existing variants).
    expect(hit).toMatchObject({ groupIndex: 0, color: 'Ivory', where: 'cells', rowIndex: 0, colIndex: 3 });
    expect(hit?.cell).toBe(scanned);
  });

  it('finds a scanned variant inside a composite grid by row and column', () => {
    const scanned = cell({ size_key: '34×32', axis_values: ['34', '32'] });
    const grids = buildColorGrids(denimScale(), [group('Indigo', [scanned])]);
    expect(findScannedCell(grids, scanned.variant_id)).toMatchObject({ where: 'cells', rowIndex: 1, colIndex: 2 });
  });

  it('finds a scanned variant that landed in extras — a free-text scan still deserves its highlight', () => {
    const scanned = cell({ size_key: 'Medium-Long', axis_values: ['Medium-Long'] });
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [scanned])]);
    expect(findScannedCell(grids, scanned.variant_id)).toMatchObject({ where: 'extras', colIndex: 0 });
  });

  it('answers null for a null scanned_variant_id (style_id entry) and for an id the layout does not contain', () => {
    const grids = buildColorGrids(alphaScale(), [group('Ivory', [cell({ size_key: 'M' })])]);
    expect(findScannedCell(grids, null)).toBeNull();
    expect(findScannedCell(grids, -1)).toBeNull();
  });
});

// --- ambiguity grouping ----------------------------------------------------------

describe('groupSizeMatches', () => {
  const match = (over: Partial<SizeMatch> = {}): SizeMatch => ({
    scale_id: over.scale_id ?? 'scale-1',
    scale_name: over.scale_name ?? 'Denim W×L',
    axis_index: over.axis_index ?? 0,
    axis_label: over.axis_label ?? 'Waist',
    value: over.value ?? '32',
    variant_count: over.variant_count ?? 6
  });

  it('turns each (scale, axis) into a disambiguation line: "Waist 32 — 6 variants" vs "Inseam 32 — 4 variants"', () => {
    const groups = groupSizeMatches([match(), match({ axis_index: 1, axis_label: 'Inseam', variant_count: 4 })]);
    expect(groups.map((g) => g.line)).toEqual(['Waist 32 — 6 variants', 'Inseam 32 — 4 variants']);
  });

  it('de-slugs an axis label the backend stored as a slug — "waist_size" reads "Waist size", not raw machinery', () => {
    expect(groupSizeMatches([match({ axis_label: 'waist_size' })])[0].line).toBe('Waist size 32 — 6 variants');
  });

  it('falls back to "Size" for an unlabeled axis (the contract sends "") instead of rendering a nameless line', () => {
    expect(groupSizeMatches([match({ axis_label: '' })])[0].line).toBe('Size 32 — 6 variants');
  });

  it('keeps a zero count honest — "0 variants" is a vocabulary word nothing wears yet, not an error', () => {
    expect(groupSizeMatches([match({ variant_count: 0 })])[0].line).toBe('Waist 32 — 0 variants');
  });

  it('uses the singular for one variant', () => {
    expect(groupSizeMatches([match({ variant_count: 1 })])[0].line).toBe('Waist 32 — 1 variant');
  });

  it('merges duplicate (scale, axis) rows by summing counts rather than rendering the same axis twice', () => {
    const groups = groupSizeMatches([match({ variant_count: 2 }), match({ variant_count: 3 })]);
    expect(groups).toHaveLength(1);
    expect(groups[0].variantCount).toBe(5);
  });

  it('preserves the backend order (scale_name, axis_index) via first-seen', () => {
    const groups = groupSizeMatches([
      match({ scale_id: 'a', scale_name: 'Alpha' }),
      match({ scale_id: 'd', scale_name: 'Denim W×L' }),
      match({ scale_id: 'd', scale_name: 'Denim W×L', axis_index: 1, axis_label: 'Inseam' })
    ]);
    expect(groups.map((g) => `${g.scaleName}#${g.axisIndex}`)).toEqual(['Alpha#0', 'Denim W×L#0', 'Denim W×L#1']);
  });
});

describe('axisDisplayLabel', () => {
  it('capitalises, de-slugs underscores and hyphens, and collapses whitespace', () => {
    expect(axisDisplayLabel('inseam-length')).toBe('Inseam length');
    expect(axisDisplayLabel('  cup   size ')).toBe('Cup size');
  });
});

// --- scan-vs-search cascade -------------------------------------------------------

describe('submissionPlan', () => {
  it('gives an Enter-submitted string the full cascade — barcode, then sku, then q — because charset heuristics cannot tell a wedge from typing', () => {
    expect(submissionPlan('0123456789012', true).map((a) => a.param)).toEqual(['barcode', 'sku', 'q']);
  });

  it('sends plain typing straight to q — search-as-you-type must not hammer the barcode path', () => {
    expect(submissionPlan('linen shirt', false)).toEqual([{ param: 'q', value: 'linen shirt' }]);
  });

  it('trims the value and plans nothing for a blank submit — empty is never sent', () => {
    expect(submissionPlan('  LS100-IVORY-M  ', true)[0]).toEqual({ param: 'barcode', value: 'LS100-IVORY-M' });
    expect(submissionPlan('   ', true)).toEqual([]);
  });
});

describe('the cascade walk', () => {
  const walk = (outcomes: Array<'hit' | 'miss' | 'error'>): CascadeState => {
    let state = startCascade(submissionPlan('LS100', true));
    outcomes.forEach((outcome) => {
      state = advanceCascade(state, outcome);
    });
    return state;
  };

  it('starts settled on an empty plan', () => {
    expect(startCascade([]).settled).toBe(true);
  });

  it('walks barcode-miss to sku, sku-miss to q', () => {
    const state = walk(['miss', 'miss']);
    expect(state.settled).toBe(false);
    expect(currentAttempt(state)).toEqual({ param: 'q', value: 'LS100' });
  });

  it('STOPS at the first hit — the WRONG behaviour is walking on to q and overwriting the resolved style with a fuzzy search of the same string', () => {
    const state = walk(['miss', 'hit']);
    expect(state.settled).toBe(true);
    expect(state.hitIndex).toBe(1);
    expect(currentAttempt(state)).toBeNull();
  });

  it('is inert once settled — a late response cannot restart the walk', () => {
    const settled = walk(['miss', 'hit']);
    expect(advanceCascade(settled, 'miss')).toEqual(settled);
  });

  it('settles with no hit when the plan is exhausted', () => {
    const state = walk(['miss', 'miss', 'miss']);
    expect(state.settled).toBe(true);
    expect(state.hitIndex).toBeNull();
  });

  it('settles on an error instead of falling through — a 500 on the barcode path is a problem to surface, not a reason to search', () => {
    const state = walk(['error']);
    expect(state.settled).toBe(true);
    expect(state.hitIndex).toBeNull();
  });
});

describe('outcomeForStatus', () => {
  it('reads a 2xx as a hit and a barcode/sku 404 as a miss — that 404 is the contract\'s "no active match", the cascade\'s whole reason to exist', () => {
    expect(outcomeForStatus('barcode', 200)).toBe('hit');
    expect(outcomeForStatus('barcode', 404)).toBe('miss');
    expect(outcomeForStatus('sku', 404)).toBe('miss');
  });

  it('treats every other failure as an error — a q 404, a 401, a 500, or no status at all must stop the walk, not feed it', () => {
    expect(outcomeForStatus('q', 404)).toBe('error');
    expect(outcomeForStatus('style_id', 404)).toBe('error');
    expect(outcomeForStatus('barcode', 401)).toBe('error');
    expect(outcomeForStatus('barcode', 500)).toBe('error');
    expect(outcomeForStatus('barcode', null)).toBe('error');
  });
});

// --- query building ----------------------------------------------------------------

describe('buildLookupQuery — exactly one param, trimmed, empty never sent', () => {
  it('builds the single-param query, trimmed', () => {
    expect(buildLookupQuery({ barcode: ' 0123 ' })).toEqual({ barcode: '0123' });
  });

  it('refuses zero params and two params — the backend 400s both, and the client must not burn the round trip', () => {
    expect(buildLookupQuery({})).toBeNull();
    expect(buildLookupQuery({ barcode: 'a', sku: 'b' })).toBeNull();
  });

  it('treats a value that trims to nothing as NOT supplied — " " next to a real param still counts as exactly one', () => {
    expect(buildLookupQuery({ q: '   ' })).toBeNull();
    expect(buildLookupQuery({ q: '   ', sku: 'LS100' })).toEqual({ sku: 'LS100' });
  });

  it('mirrors through toLookupQuery for a cascade attempt', () => {
    expect(toLookupQuery({ param: 'q', value: ' linen ' })).toEqual({ q: 'linen' });
    expect(toLookupQuery({ param: 'q', value: '  ' })).toBeNull();
  });
});
