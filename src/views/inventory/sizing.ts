// views/inventory/sizing.ts
//
// Display-side counterpart of the backend's inventory/sizing.py: everything the
// "Find a size" screen computes, as pure functions. Axios-free by house rule —
// a test importing api/*.api.ts fails collection — and render-free by the same
// rule; the screen walks the data these functions return.
//
// (There is no Sizing.tsx and none may ever be created beside this file — the
// case-collision hazard is documented in the Session log.)
//
// THE MODULE'S ONE DISCIPLINE, inherited from stockFormat.ts: a number that is
// UNKNOWN must never render as zero. This surface adds a third fact to tell
// apart: a size×colour intersection can be MISSING (no variant exists there),
// can exist with KNOWN stock (including a known zero), or can exist with
// UNKNOWN stock (the payload carried no on-hand map). Three different facts,
// three different renderings — a gap cell, a "0", and an em dash — because a
// buyer looking at the run between S and L needs to see the hole, and a counter
// person must never be told "none anywhere" when the truth is "no idea".

import { EM_DASH, formatQuantity } from './stockFormat';

// ---------------------------------------------------------------------------
// Types — verbatim mirrors of GET /inventory/lookup/ (lookup_views.py)
// ---------------------------------------------------------------------------

export interface LookupStyle {
  id: string;
  name: string;
  style_code: string;
  category: string;
}

export type ScaleKind = 'alpha' | 'numeric' | 'composite';

export interface LookupScale {
  id: string;
  name: string;
  kind: ScaleKind;
  axes: 1 | 2;
  axis_labels: string[];
  /** One plain string list PER AXIS, active values only, in position order. */
  values: string[][];
}

export interface OnOrderRow {
  /** qty_ordered − qty_received, always > 0 — the backend drops settled lines. */
  qty: number;
  /** YYYY-MM-DD, or null when the PO carries no expected date. */
  expected_at: string | null;
  po_number: string;
}

export interface LookupCell {
  /** The rendered size string ("M", "32×34" with U+00D7), "" when sizeless. */
  size_key: string;
  /** Component values in axis order; [size] for free text; [] when sizeless. */
  axis_values: string[];
  variant_id: number;
  sku: string | null;
  barcode: string | null;
  /**
   * POSITIVE quantities only; zero-qty locations are OMITTED and {} means a
   * known zero everywhere. Typed optional because a payload that did not carry
   * the map at all must read as UNKNOWN — the distinction every helper below
   * is built around.
   */
  on_hand_by_location?: Record<string, number>;
  /** KEY ABSENT when 0 — an absent key here IS a known zero, per contract. */
  in_transit?: number;
  /** [] when none. Ordered expected_at ASC with nulls last, then po_number. */
  on_order: OnOrderRow[];
}

export interface LookupColorGroup {
  /** "" for colourless variants. First-seen creation order, never alphabetical. */
  color: string;
  cells: LookupCell[];
}

export interface LookupLocation {
  id: string;
  name: string;
  is_default: boolean;
}

/** Shared by the resolved-style and variant-only (style: null) answers. */
export interface LookupResolvedResponse {
  style: LookupStyle | null;
  scale: LookupScale | null;
  matrix: LookupColorGroup[];
  locations: LookupLocation[];
  scanned_variant_id: number | null;
}

export interface LookupSearchRow {
  style_id: string;
  name: string;
  style_code: string;
  category: string;
  /** Count of ACTIVE variants. */
  variant_count: number;
}

export interface SizeMatch {
  scale_id: string;
  scale_name: string;
  axis_index: number;
  /** scale.axis_labels[axis_index]; "" when unlabeled or out of range. */
  axis_label: string;
  /** The scale's canonical casing (e.g. "M" for q=m). */
  value: string;
  /** A count of variants, not a stock quantity — 0 is honest here. */
  variant_count: number;
}

export interface LookupSearchResponse {
  results: LookupSearchRow[];
  total: number;
  size_matches: SizeMatch[];
}

export type LookupResponse = LookupResolvedResponse | LookupSearchResponse;

/** `q` answers carry `results`; every other param answers with a matrix. */
export const isSearchResponse = (data: LookupResponse): data is LookupSearchResponse =>
  Array.isArray((data as LookupSearchResponse).results);

// ---------------------------------------------------------------------------
// Grid building
// ---------------------------------------------------------------------------

/**
 * One position in a rendered run or grid. `missing` is a REAL cell: the scale
 * says the position exists and no variant does — hiding it would close up the
 * hole between S and L, which is exactly what a buyer needs to see.
 */
export type GridCell = { kind: 'missing' } | { kind: 'variant'; cell: LookupCell };

export interface ColorRun {
  layout: 'run';
  color: string;
  /** Column headers: the scale's axis-0 run, or the cells' own size keys when unscaled. */
  columns: string[];
  /** Same length as `columns`; gaps are explicit `missing` cells. */
  cells: GridCell[];
  /** Variants that are real but not on the scale (free text, off-scale, duplicates). */
  extras: LookupCell[];
}

export interface ColorGridTwoAxis {
  layout: 'grid';
  color: string;
  /** Axis 0 across (e.g. waist). */
  columns: string[];
  /** Axis 1 down (e.g. inseam). */
  rows: string[];
  /** cells[rowIndex][colIndex]; missing intersections are explicit cells. */
  cells: GridCell[][];
  extras: LookupCell[];
}

export type ColorGrid = ColorRun | ColorGridTwoAxis;

const fold = (value: string): string => value.toLowerCase();

/**
 * Index scale values by folded value → position. Case-insensitive because the
 * backend canonicalises casing but a free-text "m" that equals a scale's "M"
 * belongs in the M column, not exiled to extras over case.
 */
const positionIndex = (values: string[]): Map<string, number> => {
  const index = new Map<string, number>();
  values.forEach((value, position) => {
    if (!index.has(fold(value))) index.set(fold(value), position);
  });
  return index;
};

const buildRunForScale = (group: LookupColorGroup, axisValues: string[]): ColorRun => {
  const index = positionIndex(axisValues);
  const placed: Array<LookupCell | null> = axisValues.map(() => null);
  const extras: LookupCell[] = [];

  group.cells.forEach((cell) => {
    const key = cell.axis_values.length === 1 ? index.get(fold(cell.axis_values[0])) : undefined;
    if (key === undefined) {
      extras.push(cell);
    } else if (placed[key] === null) {
      placed[key] = cell;
    } else {
      // Two variants on one position (same size, same colour, different SKUs)
      // is legal data; the second goes to extras rather than silently vanishing.
      extras.push(cell);
    }
  });

  return {
    layout: 'run',
    color: group.color,
    columns: [...axisValues],
    cells: placed.map((cell) => (cell === null ? { kind: 'missing' } : { kind: 'variant', cell })),
    extras
  };
};

const buildTwoAxisGrid = (group: LookupColorGroup, columns: string[], rows: string[]): ColorGridTwoAxis => {
  const colIndex = positionIndex(columns);
  const rowIndex = positionIndex(rows);
  const placed: Array<Array<LookupCell | null>> = rows.map(() => columns.map(() => null));
  const extras: LookupCell[] = [];

  group.cells.forEach((cell) => {
    if (cell.axis_values.length !== 2) {
      extras.push(cell);
      return;
    }
    const col = colIndex.get(fold(cell.axis_values[0]));
    const row = rowIndex.get(fold(cell.axis_values[1]));
    if (col === undefined || row === undefined || placed[row][col] !== null) {
      extras.push(cell);
      return;
    }
    placed[row][col] = cell;
  });

  return {
    layout: 'grid',
    color: group.color,
    columns: [...columns],
    rows: [...rows],
    cells: placed.map((rowCells) => rowCells.map((cell) => (cell === null ? { kind: 'missing' } : { kind: 'variant', cell }))),
    extras
  };
};

/** An unscaled group is a list, not a grid: one column per cell, no gaps to know about. */
const buildUnscaledRun = (group: LookupColorGroup): ColorRun => ({
  layout: 'run',
  color: group.color,
  columns: group.cells.map((cell) => cell.size_key),
  cells: group.cells.map((cell) => ({ kind: 'variant', cell })),
  extras: []
});

/**
 * The screen's whole layout in one call: per colour group (kept in the
 * backend's first-seen order), a single run for 1-axis or unscaled styles, or
 * a waist-across × inseam-down matrix for composite scales — built from the
 * FLAT cell list the backend deliberately sends.
 */
export const buildColorGrids = (scale: LookupScale | null, matrix: LookupColorGroup[]): ColorGrid[] =>
  matrix.map((group) => {
    if (scale === null) return buildUnscaledRun(group);
    if (scale.axes === 2) return buildTwoAxisGrid(group, scale.values[0] ?? [], scale.values[1] ?? []);
    return buildRunForScale(group, scale.values[0] ?? []);
  });

// ---------------------------------------------------------------------------
// Availability math — the null-vs-zero rule, per cell
// ---------------------------------------------------------------------------

/**
 * The on-hand map, or null when the payload did not carry one. Null means
 * UNKNOWN: the one thing this must never be collapsed to is an empty object,
 * because {} is the contract's way of saying "a known zero everywhere".
 */
export const onHandByLocation = (cell: LookupCell): Record<string, number> | null => {
  const map = cell.on_hand_by_location;
  if (map === null || map === undefined || typeof map !== 'object') return null;
  return map;
};

/** Total on hand across locations; null when the truth is unknown, never 0. */
export const onHandTotal = (cell: LookupCell): number | null => {
  const map = onHandByLocation(cell);
  if (map === null) return null;
  return Object.values(map).reduce((sum, qty) => sum + qty, 0);
};

/**
 * On hand at ONE location. When the map is present, an absent location key is
 * a KNOWN zero (the backend omits zero rows); when the map itself is absent,
 * nothing is known and the answer is null.
 */
export const onHandAt = (cell: LookupCell, locationId: string): number | null => {
  const map = onHandByLocation(cell);
  if (map === null) return null;
  return map[locationId] ?? 0;
};

/** In transit. The contract drops the key when 0, so absence IS a known zero. */
export const inTransitQty = (cell: LookupCell): number => cell.in_transit ?? 0;

export const onOrderTotal = (cell: LookupCell): number => (cell.on_order ?? []).reduce((sum, row) => sum + row.qty, 0);

/**
 * The earliest DATED open-PO line, or null when no line carries a date. The
 * backend orders on_order for us, but this recomputes rather than trusting
 * element 0 — nulls sort last there, and a one-element undated list would
 * otherwise masquerade as a dated soonest arrival.
 */
export const soonestArrival = (cell: LookupCell): OnOrderRow | null => {
  let best: OnOrderRow | null = null;
  (cell.on_order ?? []).forEach((row) => {
    if (row.expected_at === null) return;
    // ISO YYYY-MM-DD compares correctly as a string.
    if (best === null || best.expected_at === null || row.expected_at < best.expected_at) best = row;
  });
  return best;
};

export interface LocationQuantity {
  locationId: string;
  name: string;
  qty: number;
}

export interface AvailabilitySplit {
  /** False when the payload carried no on-hand map — every figure below is null. */
  known: boolean;
  /** On hand at `hereLocationId`; null when unknown OR when no "here" was given. */
  here: number | null;
  /** Total at every other location; null when unknown. */
  elsewhere: number | null;
  /** Other locations holding stock, largest first then name; names resolved from `locations`. */
  elsewhereByLocation: LocationQuantity[];
}

const UNKNOWN_LOCATION_NAME = 'Another location';

/**
 * The here-vs-elsewhere split behind the counter answer. A location id the
 * active-locations list does not name (stock parked at a deactivated location)
 * still counts — it renders as "Another location" rather than disappearing.
 */
export const splitAvailability = (cell: LookupCell, hereLocationId: string | null, locations: LookupLocation[]): AvailabilitySplit => {
  const map = onHandByLocation(cell);
  if (map === null) {
    return { known: false, here: null, elsewhere: null, elsewhereByLocation: [] };
  }
  const names = new Map(locations.map((location) => [location.id, location.name]));
  const elsewhereByLocation = Object.entries(map)
    .filter(([locationId, qty]) => locationId !== hereLocationId && qty > 0)
    .map(([locationId, qty]) => ({ locationId, qty, name: names.get(locationId) ?? UNKNOWN_LOCATION_NAME }))
    .sort((a, b) => (a.qty !== b.qty ? b.qty - a.qty : a.name.localeCompare(b.name)));
  return {
    known: true,
    here: hereLocationId === null ? null : (map[hereLocationId] ?? 0),
    elsewhere: elsewhereByLocation.reduce((sum, entry) => sum + entry.qty, 0),
    elsewhereByLocation
  };
};

// ---------------------------------------------------------------------------
// Rendering the three facts
// ---------------------------------------------------------------------------

/**
 * The quantity string for one grid cell. Three facts, three renderings:
 * a missing position renders '' (the cell is drawn as a gap, there is no
 * number to show), unknown stock renders the em dash, and known stock renders
 * the number — including a real '0', which is an answer, not an absence.
 */
export const describeCellFact = (gridCell: GridCell): string => {
  if (gridCell.kind === 'missing') return '';
  const total = onHandTotal(gridCell.cell);
  if (total === null) return EM_DASH;
  return formatQuantity(total);
};

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * 'YYYY-MM-DD' → 'Thu 14 Aug', or null when the input is null or not a real
 * calendar day. Built from date PARTS, never via `new Date(iso)` — an ISO
 * date string parses as UTC midnight and a viewer west of Greenwich would see
 * every delivery a day early. Round-tripped through Date so '2026-02-30'
 * (which Date silently rolls to March 2nd) is refused rather than relabelled.
 */
export const formatArrivalDate = (isoDate: string | null | undefined): string | null => {
  if (!isoDate) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate.trim());
  if (!match) return null;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  return `${WEEKDAYS[date.getDay()]} ${day} ${MONTHS[month - 1]}`;
};

/** 'a', 'a, and b', 'a, b, and c' — how the answer sentence strings clauses. */
const joinClauses = (clauses: string[]): string =>
  clauses.length <= 1 ? clauses.join('') : `${clauses.slice(0, -1).join(', ')}, and ${clauses[clauses.length - 1]}`;

/** What is moving toward the shelves: in transit first, then the soonest PO. */
const incomingClauses = (cell: LookupCell): string[] => {
  const clauses: string[] = [];
  const moving = inTransitQty(cell);
  if (moving > 0) clauses.push(`${moving} in transit`);
  const arrival = soonestArrival(cell);
  const arrivalDate = arrival === null ? null : formatArrivalDate(arrival.expected_at);
  if (arrival !== null && arrivalDate !== null) {
    clauses.push(`${arrival.qty} ${arrival.qty === 1 ? 'arrives' : 'arrive'} ${arrivalDate}`);
  } else {
    const ordered = onOrderTotal(cell);
    if (ordered > 0) clauses.push(`${ordered} on order, no date given`);
  }
  return clauses;
};

/**
 * THE ANSWER SENTENCE — what the person at the counter actually says.
 *
 *   "3 here"
 *   "Not here — Uptown has 3, and 6 arrive Thu 14 Aug"
 *   "Not here — 6 on order, no date given"
 *   "None anywhere, none on the way"
 *   "Stock unknown — 2 in transit"
 *
 * Honest by construction: an absent on-hand map says "Stock unknown", never
 * "none" — claiming zero when the truth is unknown sends a customer away from
 * a shirt that may be on the shelf behind them. Incoming stock still reads out
 * in that case, because in-transit and on-order are separately known facts.
 */
export const describeAvailability = (cell: LookupCell, hereLocationId: string | null, locations: LookupLocation[]): string => {
  const split = splitAvailability(cell, hereLocationId, locations);
  const incoming = incomingClauses(cell);

  if (!split.known) {
    return incoming.length ? `Stock unknown — ${joinClauses(incoming)}` : 'Stock unknown';
  }

  if (hereLocationId !== null && (split.here ?? 0) > 0) {
    return `${split.here} here`;
  }

  const clauses = [...split.elsewhereByLocation.map((entry) => `${entry.name} has ${entry.qty}`), ...incoming];
  if (clauses.length === 0) return 'None anywhere, none on the way';
  return hereLocationId === null ? joinClauses(clauses) : `Not here — ${joinClauses(clauses)}`;
};

// ---------------------------------------------------------------------------
// Cell highlight — where the scanned variant sits in the built layout
// ---------------------------------------------------------------------------

export interface CellLocation {
  /** Index into the ColorGrid[] the screen rendered. */
  groupIndex: number;
  color: string;
  /** Whether the variant landed on the grid proper or in the extras strip. */
  where: 'cells' | 'extras';
  /** 0 for runs and extras. */
  rowIndex: number;
  colIndex: number;
  cell: LookupCell;
}

/**
 * Find the scanned variant in the layout `buildColorGrids` produced, so the
 * screen can highlight the exact cell. Coordinates are LAYOUT coordinates —
 * they survive gaps, because missing cells occupy their columns.
 */
export const findScannedCell = (grids: ColorGrid[], scannedVariantId: number | null): CellLocation | null => {
  if (scannedVariantId === null) return null;
  for (let groupIndex = 0; groupIndex < grids.length; groupIndex += 1) {
    const grid = grids[groupIndex];
    const rows: GridCell[][] = grid.layout === 'grid' ? grid.cells : [grid.cells];
    for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
      for (let colIndex = 0; colIndex < rows[rowIndex].length; colIndex += 1) {
        const gridCell = rows[rowIndex][colIndex];
        if (gridCell.kind === 'variant' && gridCell.cell.variant_id === scannedVariantId) {
          return { groupIndex, color: grid.color, where: 'cells', rowIndex, colIndex, cell: gridCell.cell };
        }
      }
    }
    for (let colIndex = 0; colIndex < grid.extras.length; colIndex += 1) {
      if (grid.extras[colIndex].variant_id === scannedVariantId) {
        return { groupIndex, color: grid.color, where: 'extras', rowIndex: 0, colIndex, cell: grid.extras[colIndex] };
      }
    }
  }
  return null;
};

// ---------------------------------------------------------------------------
// Ambiguity grouping — "Waist 32 — 6 variants" vs "Inseam 32 — 4 variants"
// ---------------------------------------------------------------------------

/**
 * De-slug an axis label the way stockFormat's reasonLabel treats reasons: a
 * backend label of 'waist_size' should read "Waist size", not vanish behind a
 * placeholder. An empty label falls back to 'Size' — the axis exists, it just
 * was never named.
 */
export const axisDisplayLabel = (axisLabel: string): string => {
  const cleaned = (axisLabel || '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!cleaned) return 'Size';
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export interface SizeMatchGroup {
  scaleId: string;
  scaleName: string;
  axisIndex: number;
  /** De-slugged axis label, 'Size' when the backend sent ''. */
  label: string;
  /** The scale's canonical casing of the matched value. */
  value: string;
  variantCount: number;
  /** The rendered disambiguation line: "Waist 32 — 6 variants". */
  line: string;
}

/**
 * Group size_matches by (scale, axis) into the disambiguation lines. The
 * backend already emits one row per (scale, axis); if duplicates ever arrive
 * the counts merge rather than rendering the same axis twice. Backend order
 * (scale_name, axis_index) is preserved via first-seen.
 */
export const groupSizeMatches = (matches: SizeMatch[]): SizeMatchGroup[] => {
  const order: string[] = [];
  const byKey = new Map<string, SizeMatchGroup>();
  (matches ?? []).forEach((match) => {
    const key = `${match.scale_id}:${match.axis_index}`;
    const existing = byKey.get(key);
    if (existing) {
      existing.variantCount += match.variant_count;
    } else {
      order.push(key);
      byKey.set(key, {
        scaleId: match.scale_id,
        scaleName: match.scale_name,
        axisIndex: match.axis_index,
        label: axisDisplayLabel(match.axis_label),
        value: match.value,
        variantCount: match.variant_count,
        line: ''
      });
    }
  });
  return order.map((key) => {
    const group = byKey.get(key) as SizeMatchGroup;
    const noun = group.variantCount === 1 ? 'variant' : 'variants';
    return { ...group, line: `${group.label} ${group.value} — ${group.variantCount} ${noun}` };
  });
};

// ---------------------------------------------------------------------------
// Scan-vs-search input classification — the cascade, as data
// ---------------------------------------------------------------------------

export type LookupParam = 'barcode' | 'sku' | 'style_id' | 'q';

export interface LookupAttempt {
  param: LookupParam;
  value: string;
}

/**
 * What to try, in order, for a submitted string. Length/charset heuristics are
 * NOT reliable for telling a wedge scan from typing (SKUs look like barcodes,
 * barcodes carry letters), so the rule is entry-mode: an Enter-submitted
 * string tries barcode → sku → q; plain typing goes straight to q. The screen
 * WALKS this plan — it must not fire all three at once, and it must stop at
 * the first hit.
 */
export const submissionPlan = (raw: string, viaEnter: boolean): LookupAttempt[] => {
  const value = (raw || '').trim();
  if (!value) return [];
  if (!viaEnter) return [{ param: 'q', value }];
  return [
    { param: 'barcode', value },
    { param: 'sku', value },
    { param: 'q', value }
  ];
};

export interface CascadeState {
  attempts: LookupAttempt[];
  /** Which attempt to fire next; meaningless once settled. */
  index: number;
  /** True when the walk is over — a hit, an error, or the plan exhausted. */
  settled: boolean;
  /** Index of the attempt that hit, or null (exhausted / error / empty plan). */
  hitIndex: number | null;
}

export const startCascade = (attempts: LookupAttempt[]): CascadeState => ({
  attempts,
  index: 0,
  settled: attempts.length === 0,
  hitIndex: null
});

export const currentAttempt = (state: CascadeState): LookupAttempt | null => (state.settled ? null : (state.attempts[state.index] ?? null));

export type AttemptOutcome = 'hit' | 'miss' | 'error';

/**
 * Map an HTTP status to a cascade outcome. Only a barcode/sku 404 means "keep
 * walking" — that is the contract's no-active-match answer. Any other failure
 * (401, the 400 family, a 500) is a real problem to surface, not a reason to
 * quietly fall through to a text search that would mask it.
 */
export const outcomeForStatus = (param: LookupParam, httpStatus: number | null): AttemptOutcome => {
  if (httpStatus !== null && httpStatus >= 200 && httpStatus < 300) return 'hit';
  if (httpStatus === 404 && (param === 'barcode' || param === 'sku')) return 'miss';
  return 'error';
};

/**
 * One step of the walk. A HIT SETTLES THE CASCADE — the fallback exists for
 * misses only, and a screen that keeps walking past a hit would overwrite a
 * resolved style with a fuzzy text search of the same string.
 */
export const advanceCascade = (state: CascadeState, outcome: AttemptOutcome): CascadeState => {
  if (state.settled) return state;
  if (outcome === 'hit') return { ...state, settled: true, hitIndex: state.index };
  if (outcome === 'error') return { ...state, settled: true, hitIndex: null };
  const next = state.index + 1;
  return { ...state, index: next, settled: next >= state.attempts.length };
};

// ---------------------------------------------------------------------------
// Query building — exactly one param, trimmed, empty never sent
// ---------------------------------------------------------------------------

/**
 * The query object for GET /inventory/lookup/, or null when it must not be
 * sent. The endpoint requires EXACTLY ONE of barcode/sku/style_id/q and 400s
 * on zero, two, or a blank value — this enforces the same rule client-side so
 * a keystroke race never burns a round trip on a guaranteed 400. Values are
 * trimmed; a value that trims to nothing does not count as supplied.
 */
export const buildLookupQuery = (
  input: Partial<Record<LookupParam, string | null | undefined>>
): Partial<Record<LookupParam, string>> | null => {
  const params: LookupParam[] = ['barcode', 'sku', 'style_id', 'q'];
  const supplied: Array<[LookupParam, string]> = [];
  params.forEach((param) => {
    const value = (input[param] ?? '').trim();
    if (value) supplied.push([param, value]);
  });
  if (supplied.length !== 1) return null;
  const [param, value] = supplied[0];
  return { [param]: value };
};

/** The query for one cascade attempt; null when the value trims away. */
export const toLookupQuery = (attempt: LookupAttempt): Partial<Record<LookupParam, string>> | null =>
  buildLookupQuery({ [attempt.param]: attempt.value });
