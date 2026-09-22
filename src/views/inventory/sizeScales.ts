// views/inventory/sizeScales.ts
//
// Everything the size-scales settings screen computes, as pure functions:
// payload builders, the reorder move, bindings validation, the unmatched-sizes
// report shaping, and error rendering. Axios-free by house rule — a test
// importing api/*.api.ts fails collection — and render-free by the same rule.
//
// (There is no SizeScales.tsx and none may ever be created beside this file —
// the screen is SizeScaleSettings.tsx precisely because a .tsx sharing this
// module's case-insensitive name would shadow it out of the program; the
// StockCounts hazard is documented in the Session log.)
//
// THE MODULE'S ONE LOAD-BEARING RULE — the resurrect trap:
// PUT /inventory/size-scales/{id}/values/ REPLACES the whole ordered lists and
// accepts entries as plain strings OR as {value, is_active}. A plain string
// defaults is_active to TRUE, so a reorder that flattens the fetched state to
// strings silently REACTIVATES every deactivated value. Every write built here
// therefore round-trips the {value, is_active} pair from the fetched state:
// `toValuesPutPayload` emits the object form for every entry, without
// exception, and the editor's operations (move / add / toggle / remove) all
// work on {value, is_active} drafts so the flag can never be lost in transit.

import { parseApiError } from './apiErrors';

// ---------------------------------------------------------------------------
// Types — verbatim mirrors of the sizing endpoints (sizing_views.py)
// ---------------------------------------------------------------------------

export type ScaleKind = 'alpha' | 'numeric' | 'composite';

/** One row of a scale's ordered value list, as GET returns it. */
export interface ScaleValueEntry {
  value: string;
  position: number;
  is_active: boolean;
}

/** A warning returned on a 200 — the write happened; this is disclosure. */
export interface ScaleValueWarning {
  reason: string; // 'deactivated_value_in_use'
  axis_index: number;
  value: string;
  variant_count: number;
  message: string;
}

export interface SizeScale {
  id: string;
  name: string;
  kind: ScaleKind;
  axes: 1 | 2;
  axis_labels: string[];
  is_active: boolean;
  /** One entry list PER AXIS, in position order, inactive rows included. */
  values: ScaleValueEntry[][];
  bound_categories: string[];
  usage: {
    variant_count: number;
    product_override_count: number;
    binding_count: number;
  };
  created_at: string;
  updated_at: string;
  /** Present on PATCH / values-PUT responses only. */
  warnings?: ScaleValueWarning[];
  positions_resynced?: number;
}

export interface CategoryBindingRow {
  id: string;
  category: string;
  scale_id: string;
  scale_name: string;
  /** True when no style carries this category any more — the accepted weak
   * spot of binding to a string. The screen must say so, not hide the row. */
  orphaned: boolean;
}

export interface UnmatchedSizeRow {
  size: string;
  variant_count: number;
}

export interface UnmatchedCategory {
  category: string;
  unmatched: UnmatchedSizeRow[];
}

export interface UnmatchedReport {
  scale_id: string;
  categories: UnmatchedCategory[];
}

/** The subset of the products payload this screen matches against. */
export interface ProductForMatching {
  id: string;
  name: string;
  style_code: string;
  category: string;
  variants: Array<{
    inventory_item_id: number;
    sku: string | null;
    size: string;
    color: string;
  }>;
}

// ---------------------------------------------------------------------------
// The values editor: drafts, the move operation, add / toggle / remove
// ---------------------------------------------------------------------------

/** What the editor holds per row. `position` is deliberately absent — order IS
 * the array order, and the server derives positions from it on PUT. */
export interface ValueDraft {
  value: string;
  is_active: boolean;
}

/** Editor state from a fetched scale. Copies, never aliases, so the caller can
 * diff drafts against the fetched payload to know whether anything changed. */
export const toValueDrafts = (values: ScaleValueEntry[][]): ValueDraft[][] =>
  values.map((axis) => axis.map((entry) => ({ value: entry.value, is_active: entry.is_active })));

/**
 * Move one row up or down: a pure list move that carries the WHOLE
 * {value, is_active} pair, never just the string.
 *
 * Out-of-bounds indices and a no-op move return the input array UNCHANGED (the
 * same reference), so callers can use identity to skip a pointless re-render
 * or save. Bounds are checked on BOTH ends: `to` can be -1 (moving the first
 * row up) or `list.length` (moving the last row down), and clamping either
 * would silently swallow the click instead of ignoring it — same outcome here,
 * but a clamp that wrapped or swapped the wrong pair would corrupt the order,
 * so the guard refuses rather than repairs.
 */
export const moveEntry = <T>(list: T[], from: number, to: number): T[] => {
  if (!Number.isInteger(from) || !Number.isInteger(to)) return list;
  if (from < 0 || from >= list.length) return list;
  if (to < 0 || to >= list.length) return list;
  if (from === to) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
};

/** The server's per-value rules, mirrored so the user is corrected before a
 * round trip: trimmed, non-blank, ≤50 chars, no exact duplicate on the axis.
 * Duplicates are exact-match because the backend's are — "M" and "m" are two
 * different values to a scale, deliberately. */
export const validateNewValue = (axis: ValueDraft[], raw: string): string | null => {
  const value = (raw ?? '').trim();
  if (!value) return 'Enter a value.';
  if (value.length > 50) return 'Values are at most 50 characters.';
  if (axis.some((entry) => entry.value === value)) return `'${value}' is already on this axis.`;
  return null;
};

/** Append a new (active) value; returns null when validateNewValue refuses. */
export const addValueDraft = (axis: ValueDraft[], raw: string): ValueDraft[] | null => {
  if (validateNewValue(axis, raw) !== null) return null;
  return [...axis, { value: (raw ?? '').trim(), is_active: true }];
};

export const setDraftActive = (axis: ValueDraft[], index: number, isActive: boolean): ValueDraft[] => {
  if (index < 0 || index >= axis.length) return axis;
  return axis.map((entry, position) => (position === index ? { ...entry, is_active: isActive } : entry));
};

export const removeDraft = (axis: ValueDraft[], index: number): ValueDraft[] => {
  if (index < 0 || index >= axis.length) return axis;
  return axis.filter((_entry, position) => position !== index);
};

/**
 * THE ONE BUILDER for PUT /size-scales/{id}/values/.
 *
 * Every entry goes out as {value, is_active} — NEVER a plain string. A plain
 * string is legal on the wire and means is_active=true, which is exactly how a
 * reorder would resurrect every deactivated value; emitting the object form
 * unconditionally makes that bug unrepresentable in anything built through
 * this function.
 */
export const toValuesPutPayload = (perAxis: ValueDraft[][]): { values: Array<Array<{ value: string; is_active: boolean }>> } => ({
  values: perAxis.map((axis) => axis.map((entry) => ({ value: entry.value, is_active: entry.is_active })))
});

/** True when the drafts differ from the fetched state — order, membership or
 * active flag. Positions are compared by array order, which is what PUT sends. */
export const draftsDiffer = (fetched: ScaleValueEntry[][], drafts: ValueDraft[][]): boolean => {
  if (fetched.length !== drafts.length) return true;
  return fetched.some((axis, axisIndex) => {
    const draftAxis = drafts[axisIndex];
    if (axis.length !== draftAxis.length) return true;
    return axis.some((entry, index) => entry.value !== draftAxis[index].value || entry.is_active !== draftAxis[index].is_active);
  });
};

// ---------------------------------------------------------------------------
// Create / patch payloads
// ---------------------------------------------------------------------------

export interface ScaleCreateDraft {
  name: string;
  kind: ScaleKind;
  /** Two labels for composite, one otherwise — the dialog asks accordingly. */
  axisLabels: string[];
  /** Raw textarea text per axis; parsed by newline/comma. */
  valuesText: string[];
}

export const axesForKind = (kind: ScaleKind): 1 | 2 => (kind === 'composite' ? 2 : 1);

/** Parse a textarea into ordered values: split on newlines and commas, trim,
 * drop blanks, keep the FIRST of exact duplicates (order is the point). */
export const parseValuesText = (text: string): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  (text ?? '')
    .split(/[\n,]/)
    .map((piece) => piece.trim())
    .filter(Boolean)
    .forEach((value) => {
      if (seen.has(value)) return;
      seen.add(value);
      out.push(value);
    });
  return out;
};

export interface CreateDraftValidation {
  valid: boolean;
  errors: Partial<Record<'name' | 'values', string>>;
}

export const validateCreateDraft = (draft: ScaleCreateDraft): CreateDraftValidation => {
  const errors: CreateDraftValidation['errors'] = {};
  if (!(draft.name ?? '').trim()) errors.name = 'Name the scale.';
  const axes = axesForKind(draft.kind);
  for (let axis = 0; axis < axes; axis += 1) {
    const tooLong = parseValuesText(draft.valuesText[axis] ?? '').find((value) => value.length > 50);
    if (tooLong) {
      errors.values = `'${tooLong.slice(0, 50)}…' is longer than 50 characters.`;
      break;
    }
  }
  return { valid: Object.keys(errors).length === 0, errors };
};

/** Body for POST /size-scales/. Create sends plain strings — every value on a
 * brand-new scale is active, so there is no flag to lose (the resurrect trap
 * only exists for writes against FETCHED state, which go through
 * toValuesPutPayload instead). */
export const toCreatePayload = (draft: ScaleCreateDraft): { name: string; kind: ScaleKind; axis_labels: string[]; values: string[][] } => {
  const axes = axesForKind(draft.kind);
  return {
    name: draft.name.trim(),
    kind: draft.kind,
    axis_labels: Array.from({ length: axes }, (_unused, axis) => (draft.axisLabels[axis] ?? '').trim()),
    values: Array.from({ length: axes }, (_unused, axis) => parseValuesText(draft.valuesText[axis] ?? ''))
  };
};

export interface ScalePatch {
  name?: string;
  axisLabels?: string[];
  isActive?: boolean;
}

/** Body for PATCH /size-scales/{id}/. `kind` and `axes` are immutable on the
 * server (400) and are structurally absent here — the patch type cannot carry
 * them, so no caller can even attempt the rejected write. */
export const toPatchPayload = (patch: ScalePatch): Record<string, unknown> => {
  const body: Record<string, unknown> = {};
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.axisLabels !== undefined) body.axis_labels = patch.axisLabels.map((label) => label.trim());
  if (patch.isActive !== undefined) body.is_active = patch.isActive;
  return body;
};

/** The axis heading: the label when one was given, else a positional default.
 * 1-axis scales get 'Values' because 'Axis 1' over a single list is noise. */
export const axisTitle = (axisLabels: string[], axisIndex: number, axes: number): string => {
  const label = (axisLabels[axisIndex] ?? '').trim();
  if (label) return label;
  return axes === 1 ? 'Values' : `Axis ${axisIndex + 1}`;
};

// ---------------------------------------------------------------------------
// Category bindings
// ---------------------------------------------------------------------------

export interface BindingDraft {
  category: string;
  scaleId: string;
}

export const toBindingDrafts = (rows: CategoryBindingRow[]): BindingDraft[] =>
  rows.map((row) => ({ category: row.category, scaleId: row.scale_id }));

export interface BindingProblems {
  valid: boolean;
  /** Keyed by DRAFT index — meaningful here because the client built the list
   * it is validating, unlike a 409's detail[] which is a subset. */
  byIndex: Map<number, string>;
}

/** Mirror of the PUT's 400s: blank categories, case-insensitive duplicates,
 * and a missing scale. The LATER duplicate is the one flagged — the first
 * occurrence is presumed intended. */
export const detectBindingProblems = (drafts: BindingDraft[]): BindingProblems => {
  const byIndex = new Map<number, string>();
  const seen = new Set<string>();
  drafts.forEach((draft, index) => {
    const category = (draft.category ?? '').trim();
    if (!category) {
      byIndex.set(index, 'Category is blank.');
      return;
    }
    const key = category.toLowerCase();
    if (seen.has(key)) {
      byIndex.set(index, `'${category}' appears more than once (matching is case-insensitive).`);
      return;
    }
    seen.add(key);
    if (!draft.scaleId) byIndex.set(index, 'Pick a scale.');
  });
  return { valid: byIndex.size === 0, byIndex };
};

/** Body for PUT /category-bindings/ — the WHOLE set; a draft omitted here is a
 * binding deleted on the server. */
export const toBindingsPutPayload = (drafts: BindingDraft[]): { bindings: Array<{ category: string; scale_id: string }> } => ({
  bindings: drafts.map((draft) => ({ category: draft.category.trim(), scale_id: draft.scaleId }))
});

/** Category suggestions for the binding editor: distinct product categories,
 * de-duplicated case-insensitively keeping the first-seen casing. */
export const distinctCategories = (products: Array<{ category: string }>): string[] => {
  const seen = new Set<string>();
  const out: string[] = [];
  products.forEach((product) => {
    const category = (product.category ?? '').trim();
    if (!category) return;
    const key = category.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(category);
  });
  return out.sort((a, b) => a.localeCompare(b));
};

export const orphanedBindings = (rows: CategoryBindingRow[]): CategoryBindingRow[] => rows.filter((row) => row.orphaned);

// ---------------------------------------------------------------------------
// The unmatched-sizes report
// ---------------------------------------------------------------------------

export interface UnmatchedFlatRow {
  category: string;
  size: string;
  variantCount: number;
}

/** Flatten for a table: one row per (category, size), categories with nothing
 * unmatched dropped. An empty result means the scale fully covers its
 * categories — the state the screen should celebrate, not render as blank. */
export const flattenUnmatched = (report: UnmatchedReport): UnmatchedFlatRow[] =>
  report.categories.flatMap((category) =>
    category.unmatched.map((row) => ({
      category: category.category,
      size: row.size,
      variantCount: row.variant_count
    }))
  );

export const totalUnmatchedVariants = (report: UnmatchedReport): number =>
  report.categories.reduce((sum, category) => sum + category.unmatched.reduce((inner, row) => inner + row.variant_count, 0), 0);

/**
 * MAP-action candidates, and the honest limitation of finding them.
 *
 * The report's rows carry SIZE STRINGS and counts, not variant ids, and no
 * per-size bulk endpoint exists — mapping writes one PUT
 * /variants/{item_id}/size/ per variant. The variants therefore come from the
 * catalogue's existing listProducts, matched client-side the way the report
 * counted them: product category equal case-insensitively (trimmed), variant
 * `size` equal EXACTLY (the backend's test is `size__in`, so "32 " with a
 * trailing space matches only itself — which is precisely how such a typo
 * shows up in this report in the first place).
 *
 * KNOWN GAP, surfaced rather than hidden: the products payload does not carry
 * `size_scale`, so the one report filter this cannot reproduce is "styles
 * overriding to a DIFFERENT scale are excluded". A candidate list can thus be
 * LARGER than the report's variant_count (never smaller). The dialog shows
 * both numbers and flags the disagreement via candidateCountMismatch, and the
 * operator confirms per variant — mapping stays an explicit, per-variant act,
 * exactly as the spec's lazy-migration rule requires.
 */
export interface MapCandidate {
  variantId: number;
  sku: string | null;
  color: string;
  productName: string;
  styleCode: string;
}

export const mapCandidates = (products: ProductForMatching[], category: string, size: string): MapCandidate[] => {
  const wantedCategory = (category ?? '').trim().toLowerCase();
  const out: MapCandidate[] = [];
  products.forEach((product) => {
    if ((product.category ?? '').trim().toLowerCase() !== wantedCategory) return;
    product.variants.forEach((variant) => {
      if (variant.size !== size) return;
      out.push({
        variantId: variant.inventory_item_id,
        sku: variant.sku,
        color: variant.color,
        productName: product.name,
        styleCode: product.style_code
      });
    });
  });
  return out;
};

/** True when the client-side candidate list disagrees with the report's count
 * — see mapCandidates. The dialog renders a warning instead of silently
 * trusting either number. */
export const candidateCountMismatch = (candidates: number, reportedVariantCount: number): boolean => candidates !== reportedVariantCount;

/** Active values of one axis — what the map dialog's target picker offers.
 * Inactive values are assignable history, not assignable vocabulary. */
export const activeAxisValues = (scale: SizeScale, axisIndex: number): string[] =>
  (scale.values[axisIndex] ?? []).filter((entry) => entry.is_active).map((entry) => entry.value);

/** One target value per axis, each on the scale's active run — mirrors what
 * sizing.set_variant_size would refuse, so the dialog corrects before the
 * round trip. Returns null when valid. */
export const validateMapSelection = (scale: SizeScale, values: string[]): string | null => {
  if (values.length !== scale.axes) return `Pick ${scale.axes} value(s) — this scale has ${scale.axes} axis(es).`;
  for (let axis = 0; axis < scale.axes; axis += 1) {
    if (!values[axis]) return `Pick a ${axisTitle(scale.axis_labels, axis, scale.axes).toLowerCase()} value.`;
    if (!activeAxisValues(scale, axis).includes(values[axis])) {
      return `'${values[axis]}' is not an active value on ${axisTitle(scale.axis_labels, axis, scale.axes)}.`;
    }
  }
  return null;
};

/** Body for PUT /variants/{item_id}/size/ — the map action. */
export const toMapSizePayload = (scaleId: string, values: string[]): { scale_id: string; values: string[] } => ({
  scale_id: scaleId,
  values
});

/**
 * The ADD action: append an unmatched size to one axis of the CURRENT fetched
 * state, ready for toValuesPutPayload. Built on the fetched entries — not on a
 * string list — so every existing value keeps its is_active flag through the
 * write (the resurrect trap again; an ADD that flattened to strings would
 * reactivate deactivated values as a side effect of adding one).
 *
 * Returns null when the value already exists on that axis or fails the value
 * rules — the caller should re-run the report instead of writing.
 */
export const addUnmatchedToAxis = (fetched: ScaleValueEntry[][], axisIndex: number, size: string): ValueDraft[][] | null => {
  if (axisIndex < 0 || axisIndex >= fetched.length) return null;
  const drafts = toValueDrafts(fetched);
  const appended = addValueDraft(drafts[axisIndex], size);
  if (appended === null) return null;
  drafts[axisIndex] = appended;
  return drafts;
};

// ---------------------------------------------------------------------------
// Per-variant map results (the map dialog writes N PUTs, one per variant)
// ---------------------------------------------------------------------------

export interface MapWriteResult {
  variantId: number;
  ok: boolean;
  message: string | null;
}

export const summarizeMapResults = (results: MapWriteResult[]): { succeeded: number; failed: number; summary: string } => {
  const succeeded = results.filter((result) => result.ok).length;
  const failed = results.length - succeeded;
  const parts: string[] = [];
  if (succeeded) parts.push(`${succeeded} variant(s) mapped`);
  if (failed) parts.push(`${failed} failed`);
  return { succeeded, failed, summary: parts.join(', ') || 'Nothing to map.' };
};

// ---------------------------------------------------------------------------
// Error rendering
// ---------------------------------------------------------------------------

/** A blocker from a sizing 409/400 body, typed by what the backend sends. */
export interface SizeScaleBlocker {
  reason: string;
  axisIndex: number | null;
  value: string | null;
  variantCount: number | null;
  productCount: number | null;
  categories: string[] | null;
  message: string;
}

const readBlocker = (entry: Record<string, unknown>): SizeScaleBlocker => ({
  reason: typeof entry.reason === 'string' ? entry.reason : 'unknown',
  axisIndex: typeof entry.axis_index === 'number' ? entry.axis_index : null,
  value: typeof entry.value === 'string' ? entry.value : null,
  variantCount: typeof entry.variant_count === 'number' ? entry.variant_count : null,
  productCount: typeof entry.product_count === 'number' ? entry.product_count : null,
  categories: Array.isArray(entry.categories) ? entry.categories.map(String) : null,
  message: typeof entry.message === 'string' ? entry.message : JSON.stringify(entry)
});

export interface ParsedSizeScaleError {
  /** One line fit for an Alert. Never empty. */
  summary: string;
  /** Typed blockers from an {error, detail:[…]} body; [] otherwise. */
  blockers: SizeScaleBlocker[];
}

/**
 * Read any sizing-endpoint error. Delegates the eleven generic shapes to
 * apiErrors.parseApiError, but reads the blocker array itself: sizing blockers
 * carry their text under `message` (not `detail`), and their identifiers are
 * (axis_index, value) — parseApiError's line_id/lookup keys never appear here.
 */
export const parseSizeScaleError = (err: unknown): ParsedSizeScaleError => {
  const parsed = parseApiError(err);
  const body = (err as { response?: { data?: unknown } })?.response?.data;
  const blockers: SizeScaleBlocker[] = [];
  if (body && typeof body === 'object' && !Array.isArray(body)) {
    const detail = (body as Record<string, unknown>).detail;
    if (Array.isArray(detail)) {
      detail.forEach((entry) => {
        if (entry && typeof entry === 'object') blockers.push(readBlocker(entry as Record<string, unknown>));
      });
    }
  }
  return { summary: parsed.summary, blockers };
};

/**
 * The blocker about ONE value row, matched by its identifiers — (axis_index,
 * value) — NEVER by array position. The values PUT is all-or-nothing and the
 * server appends a blocker only for values that FAILED: remove two rows of
 * which only the second is referenced and detail[] has ONE element, so
 * detail[rowIndex] would paint the innocent first row red.
 */
export const blockerForValue = (blockers: SizeScaleBlocker[], axisIndex: number, value: string): SizeScaleBlocker | null =>
  blockers.find((blocker) => blocker.axisIndex === axisIndex && blocker.value === value) ?? null;

/** Warnings arrive keyed the same way; the editor shows each beside its row. */
export const warningForValue = (warnings: ScaleValueWarning[] | undefined, axisIndex: number, value: string): ScaleValueWarning | null =>
  (warnings ?? []).find((warning) => warning.axis_index === axisIndex && warning.value === value) ?? null;

/** Human line per delete-refusal blocker; the server's message when it sent
 * one, a composed fallback when it did not. All three PROTECT edges arrive in
 * ONE 409, so the dialog lists them all rather than the first. */
export const describeDeleteBlocker = (blocker: SizeScaleBlocker): string => {
  if (blocker.message && blocker.reason !== 'unknown') return blocker.message;
  if (blocker.reason === 'components_reference_scale') return `${blocker.variantCount ?? '?'} variant(s) are sized on this scale.`;
  if (blocker.reason === 'categories_bound') return `Bound categories: ${(blocker.categories ?? []).join(', ')}.`;
  if (blocker.reason === 'products_override') return `${blocker.productCount ?? '?'} style(s) override to this scale.`;
  return blocker.message;
};

// ---------------------------------------------------------------------------
// Screen copy
// ---------------------------------------------------------------------------

export const NON_ADMIN_SIZE_SCALES_NOTICE =
  'You can review size scales, bindings and the unmatched report, but changing them needs an admin role.';

export const ORPHANED_BINDING_NOTICE =
  'No style carries this category any more. The binding does nothing until a style uses the category again (matching is case-insensitive) — or remove it here.';

export const DEACTIVATE_INSTEAD_HINT = 'Deactivate the value instead of removing it: variants keep their size, and nothing new can use it.';
