// views/inventory/sizeScales.test.ts
//
// Pure-logic tests for the size-scales settings screen. The three mutation-
// proven guards (failure counts in the Session log):
//   1. the resurrect trap — every values write round-trips {value, is_active},
//   2. the all-or-nothing 409 — blockers match by (axis_index, value), never
//      by array position,
//   3. moveEntry's bounds — out-of-range indices return the input unchanged.
// Traps pin the WRONG answer explicitly so a regression reads as "you brought
// back the bug", not as a broken expectation.

import { describe, expect, it } from 'vitest';

import {
  BindingDraft,
  CategoryBindingRow,
  ProductForMatching,
  ScaleValueEntry,
  SizeScale,
  UnmatchedReport,
  activeAxisValues,
  addUnmatchedToAxis,
  addValueDraft,
  axesForKind,
  axisTitle,
  blockerForValue,
  candidateCountMismatch,
  describeDeleteBlocker,
  detectBindingProblems,
  distinctCategories,
  draftsDiffer,
  flattenUnmatched,
  mapCandidates,
  moveEntry,
  orphanedBindings,
  parseSizeScaleError,
  parseValuesText,
  removeDraft,
  setDraftActive,
  summarizeMapResults,
  toBindingsPutPayload,
  toCreatePayload,
  toMapSizePayload,
  toPatchPayload,
  toValueDrafts,
  toValuesPutPayload,
  totalUnmatchedVariants,
  validateCreateDraft,
  validateMapSelection,
  validateNewValue,
  warningForValue
} from './sizeScales';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const entry = (value: string, position: number, is_active = true): ScaleValueEntry => ({ value, position, is_active });

/** An alpha run whose "XS" has been deactivated — the row the resurrect trap
 * exists to protect. */
const fetchedAlpha: ScaleValueEntry[][] = [[entry('XS', 0, false), entry('S', 1), entry('M', 2), entry('L', 3)]];

const compositeScale: SizeScale = {
  id: 'scale-1',
  name: 'Denim W×L',
  kind: 'composite',
  axes: 2,
  axis_labels: ['Waist', 'Inseam'],
  is_active: true,
  values: [
    [entry('30', 0), entry('32', 1), entry('34', 2, false)],
    [entry('30', 0), entry('32', 1)]
  ],
  bound_categories: ['Denim'],
  usage: { variant_count: 4, product_override_count: 0, binding_count: 1 },
  created_at: '2026-08-10T00:00:00Z',
  updated_at: '2026-08-10T00:00:00Z'
};

const axiosError = (status: number, data: unknown) => ({ response: { status, data } });

// ---------------------------------------------------------------------------
// THE RESURRECT TRAP — the load-bearing guard of the whole screen
// ---------------------------------------------------------------------------

describe('toValuesPutPayload — the resurrect trap', () => {
  it('emits {value, is_active} objects for EVERY entry, because a plain string means is_active=true on the wire', () => {
    const payload = toValuesPutPayload(toValueDrafts(fetchedAlpha));
    // Every entry must be the object form. A single plain string here is the bug.
    payload.values[0].forEach((sent) => {
      expect(typeof sent).toBe('object');
      expect(Object.keys(sent).sort()).toEqual(['is_active', 'value']);
    });
  });

  it('round-trips is_active=false through a reorder: moving S above XS must not resurrect XS', () => {
    const drafts = toValueDrafts(fetchedAlpha);
    const reordered = [moveEntry(drafts[0], 1, 0)];
    const payload = toValuesPutPayload(reordered);
    expect(payload.values[0].map((sent) => sent.value)).toEqual(['S', 'XS', 'M', 'L']);
    // THE TRAP, pinned: a builder that flattened to strings (or defaulted the
    // flag) would send XS with is_active !== false and the server would
    // reactivate it. This assertion is the one the resurrect bug breaks.
    expect(payload.values[0][1]).toEqual({ value: 'XS', is_active: false });
    // And nothing else was flipped as collateral.
    expect(payload.values[0].filter((sent) => !sent.is_active)).toHaveLength(1);
  });

  it('the WRONG payload — plain strings — is not what we build (pinning the wire-legal bug shape)', () => {
    const payload = toValuesPutPayload(toValueDrafts(fetchedAlpha));
    // ['XS','S','M','L'] is ACCEPTED by the server and resurrects XS. Assert
    // our payload is structurally distinguishable from it.
    expect(payload.values[0]).not.toEqual(['XS', 'S', 'M', 'L']);
  });

  it('addUnmatchedToAxis appends against the FETCHED entries so existing flags survive the ADD write', () => {
    const drafts = addUnmatchedToAxis(fetchedAlpha, 0, 'XL');
    expect(drafts).not.toBeNull();
    const payload = toValuesPutPayload(drafts as NonNullable<typeof drafts>);
    expect(payload.values[0].map((sent) => sent.value)).toEqual(['XS', 'S', 'M', 'L', 'XL']);
    // The deactivated XS stays deactivated through an ADD — the side-effect
    // resurrection an ADD built on strings would cause.
    expect(payload.values[0][0]).toEqual({ value: 'XS', is_active: false });
    expect(payload.values[0][4]).toEqual({ value: 'XL', is_active: true });
  });

  it('addUnmatchedToAxis refuses a duplicate, a blank, and an out-of-range axis (null, never a partial draft)', () => {
    expect(addUnmatchedToAxis(fetchedAlpha, 0, 'M')).toBeNull();
    expect(addUnmatchedToAxis(fetchedAlpha, 0, '   ')).toBeNull();
    expect(addUnmatchedToAxis(fetchedAlpha, 1, 'XL')).toBeNull();
    expect(addUnmatchedToAxis(fetchedAlpha, -1, 'XL')).toBeNull();
  });

  it('toValueDrafts copies rather than aliases, so editing a draft cannot corrupt the fetched baseline', () => {
    const drafts = toValueDrafts(fetchedAlpha);
    drafts[0][0].is_active = true;
    expect(fetchedAlpha[0][0].is_active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// moveEntry — bounds are the mutation target
// ---------------------------------------------------------------------------

describe('moveEntry', () => {
  const list = ['a', 'b', 'c', 'd'];

  it('moves down and up, preserving every other element', () => {
    expect(moveEntry(list, 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveEntry(list, 3, 1)).toEqual(['a', 'd', 'b', 'c']);
  });

  it('adjacent swap is what the up/down buttons do', () => {
    expect(moveEntry(list, 1, 0)).toEqual(['b', 'a', 'c', 'd']);
    expect(moveEntry(list, 1, 2)).toEqual(['a', 'c', 'b', 'd']);
  });

  it('returns the SAME reference (not a copy) for every out-of-bounds or no-op call', () => {
    // "Up" on the first row and "down" on the last row are real clicks that
    // must be inert — to = -1 and to = length are the exact indices they produce.
    expect(moveEntry(list, 0, -1)).toBe(list);
    expect(moveEntry(list, 3, 4)).toBe(list);
    expect(moveEntry(list, -1, 0)).toBe(list);
    expect(moveEntry(list, 4, 0)).toBe(list);
    expect(moveEntry(list, 2, 2)).toBe(list);
    expect(moveEntry(list, 0.5, 1)).toBe(list);
    expect(moveEntry(list, 0, Number.NaN)).toBe(list);
  });

  it('does not mutate its input', () => {
    moveEntry(list, 0, 3);
    expect(list).toEqual(['a', 'b', 'c', 'd']);
  });

  it('carries whole objects: the {value, is_active} pair moves as one', () => {
    const rows = [
      { value: 'S', is_active: true },
      { value: 'M', is_active: false }
    ];
    const moved = moveEntry(rows, 1, 0);
    expect(moved[0]).toBe(rows[1]); // same object, flag attached
    expect(moved[0].is_active).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Draft operations and value rules
// ---------------------------------------------------------------------------

describe('value drafts', () => {
  const axis = toValueDrafts(fetchedAlpha)[0];

  it('validateNewValue mirrors the server: blank, >50 chars, exact duplicate', () => {
    expect(validateNewValue(axis, '  ')).toMatch(/Enter/);
    expect(validateNewValue(axis, 'x'.repeat(51))).toMatch(/50/);
    expect(validateNewValue(axis, 'M')).toMatch(/already/);
    expect(validateNewValue(axis, ' M ')).toMatch(/already/); // trimmed first
    expect(validateNewValue(axis, 'XL')).toBeNull();
    // Duplicates are EXACT-match, as on the server — 'm' is a different value
    // from 'M', deliberately. A case-insensitive check here would refuse
    // vocabulary the backend accepts.
    expect(validateNewValue(axis, 'm')).toBeNull();
  });

  it('addValueDraft trims and appends active; refusals return null, not a mangled list', () => {
    const appended = addValueDraft(axis, ' XL ');
    expect(appended?.[appended.length - 1]).toEqual({ value: 'XL', is_active: true });
    expect(addValueDraft(axis, 'M')).toBeNull();
  });

  it('setDraftActive flips exactly one row; removeDraft drops exactly one; both refuse bad indices', () => {
    const toggled = setDraftActive(axis, 0, true);
    expect(toggled[0].is_active).toBe(true);
    expect(toggled[1]).toBe(axis[1]);
    expect(setDraftActive(axis, 9, true)).toBe(axis);
    expect(setDraftActive(axis, -1, true)).toBe(axis);

    const removed = removeDraft(axis, 2);
    expect(removed.map((row) => row.value)).toEqual(['XS', 'S', 'L']);
    expect(removeDraft(axis, 9)).toBe(axis);
    expect(removeDraft(axis, -1)).toBe(axis);
  });

  it('draftsDiffer sees order, membership and the active flag — the three things PUT can change', () => {
    expect(draftsDiffer(fetchedAlpha, toValueDrafts(fetchedAlpha))).toBe(false);
    expect(draftsDiffer(fetchedAlpha, [moveEntry(toValueDrafts(fetchedAlpha)[0], 0, 1)])).toBe(true);
    expect(draftsDiffer(fetchedAlpha, [removeDraft(toValueDrafts(fetchedAlpha)[0], 0)])).toBe(true);
    expect(draftsDiffer(fetchedAlpha, [setDraftActive(toValueDrafts(fetchedAlpha)[0], 0, true)])).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Create / patch payloads
// ---------------------------------------------------------------------------

describe('create and patch payloads', () => {
  it('axesForKind: composite is 2, everything else 1 — what drives how many label fields the dialog asks for', () => {
    expect(axesForKind('composite')).toBe(2);
    expect(axesForKind('alpha')).toBe(1);
    expect(axesForKind('numeric')).toBe(1);
  });

  it('parseValuesText splits on newlines and commas, trims, drops blanks, keeps first duplicate in entry order', () => {
    expect(parseValuesText('XS, S\nM,\n\n S ,L')).toEqual(['XS', 'S', 'M', 'L']);
    expect(parseValuesText('')).toEqual([]);
  });

  it('toCreatePayload shapes one axis for alpha, two for composite, labels padded and trimmed', () => {
    const alpha = toCreatePayload({ name: ' Letter ', kind: 'alpha', axisLabels: [], valuesText: ['S,M,L'] });
    expect(alpha).toEqual({ name: 'Letter', kind: 'alpha', axis_labels: [''], values: [['S', 'M', 'L']] });

    const composite = toCreatePayload({
      name: 'Denim',
      kind: 'composite',
      axisLabels: [' Waist ', 'Inseam'],
      valuesText: ['30,32', '30\n32']
    });
    expect(composite.axis_labels).toEqual(['Waist', 'Inseam']);
    expect(composite.values).toEqual([
      ['30', '32'],
      ['30', '32']
    ]);
  });

  it('a 1-axis draft with stale second-axis text does not leak a second axis (the backend 400s on a length mismatch)', () => {
    // The dialog keeps text state when the user flips composite → alpha; the
    // builder must slice to the kind's axes, not to whatever state remains.
    const payload = toCreatePayload({ name: 'X', kind: 'alpha', axisLabels: ['Waist', 'Inseam'], valuesText: ['S', '30,32'] });
    expect(payload.axis_labels).toEqual(['Waist']);
    expect(payload.values).toEqual([['S']]);
  });

  it('validateCreateDraft: blank name refused; a >50-char value refused before the round trip', () => {
    expect(validateCreateDraft({ name: ' ', kind: 'alpha', axisLabels: [], valuesText: [''] }).errors.name).toBeTruthy();
    const long = validateCreateDraft({ name: 'X', kind: 'alpha', axisLabels: [], valuesText: ['x'.repeat(51)] });
    expect(long.errors.values).toMatch(/50/);
    expect(validateCreateDraft({ name: 'X', kind: 'alpha', axisLabels: [], valuesText: ['S,M'] }).valid).toBe(true);
  });

  it('toPatchPayload sends only what changed and can never carry kind/axes (immutable on the server)', () => {
    expect(toPatchPayload({})).toEqual({});
    expect(toPatchPayload({ name: ' Renamed ' })).toEqual({ name: 'Renamed' });
    expect(toPatchPayload({ isActive: false })).toEqual({ is_active: false });
    const body = toPatchPayload({ name: 'A', axisLabels: [' W ', 'L'], isActive: true });
    expect(body).toEqual({ name: 'A', axis_labels: ['W', 'L'], is_active: true });
    expect('kind' in body).toBe(false);
    expect('axes' in body).toBe(false);
  });

  it('axisTitle: the label when given; "Values" for a single axis; "Axis n" for an unlabelled composite axis', () => {
    expect(axisTitle(['Waist', 'Inseam'], 0, 2)).toBe('Waist');
    expect(axisTitle([''], 0, 1)).toBe('Values');
    expect(axisTitle(['', ''], 1, 2)).toBe('Axis 2');
  });
});

// ---------------------------------------------------------------------------
// Bindings
// ---------------------------------------------------------------------------

describe('category bindings', () => {
  it('detectBindingProblems flags blanks, case-insensitive duplicates (the LATER one), and a missing scale', () => {
    const drafts: BindingDraft[] = [
      { category: 'Denim', scaleId: 's1' },
      { category: ' denim ', scaleId: 's2' },
      { category: '', scaleId: 's1' },
      { category: 'Tops', scaleId: '' }
    ];
    const problems = detectBindingProblems(drafts);
    expect(problems.valid).toBe(false);
    // Index 0 is the intended first occurrence — flagging IT would tell the
    // user to delete the row they meant to keep.
    expect(problems.byIndex.has(0)).toBe(false);
    expect(problems.byIndex.get(1)).toMatch(/case-insensitive/);
    expect(problems.byIndex.get(2)).toMatch(/blank/);
    expect(problems.byIndex.get(3)).toMatch(/scale/);
  });

  it('a clean set validates and the PUT body carries trimmed categories for the WHOLE set', () => {
    const drafts: BindingDraft[] = [
      { category: ' Denim ', scaleId: 's1' },
      { category: 'Tops', scaleId: 's2' }
    ];
    expect(detectBindingProblems(drafts).valid).toBe(true);
    expect(toBindingsPutPayload(drafts)).toEqual({
      bindings: [
        { category: 'Denim', scale_id: 's1' },
        { category: 'Tops', scale_id: 's2' }
      ]
    });
  });

  it('distinctCategories de-duplicates case-insensitively keeping first-seen casing, sorted for a picker', () => {
    const products = [{ category: 'Denim' }, { category: 'denim ' }, { category: 'Tops' }, { category: '' }];
    expect(distinctCategories(products)).toEqual(['Denim', 'Tops']);
  });

  it('orphanedBindings picks out exactly the rows the server flagged', () => {
    const rows: CategoryBindingRow[] = [
      { id: 'b1', category: 'Denim', scale_id: 's1', scale_name: 'W×L', orphaned: false },
      { id: 'b2', category: 'Jackets', scale_id: 's1', scale_name: 'W×L', orphaned: true }
    ];
    expect(orphanedBindings(rows).map((row) => row.id)).toEqual(['b2']);
  });
});

// ---------------------------------------------------------------------------
// The unmatched report and the MAP action
// ---------------------------------------------------------------------------

describe('unmatched report', () => {
  const report: UnmatchedReport = {
    scale_id: 'scale-1',
    categories: [
      { category: 'Denim', unmatched: [{ size: '32 ', variant_count: 3 }] },
      { category: 'Jackets', unmatched: [] },
      {
        category: 'Tops',
        unmatched: [
          { size: 'Med', variant_count: 2 },
          { size: '', variant_count: 1 }
        ]
      }
    ]
  };

  it('flattenUnmatched drops clean categories and keeps the raw size strings — including trailing spaces and blanks, which ARE the data', () => {
    expect(flattenUnmatched(report)).toEqual([
      { category: 'Denim', size: '32 ', variantCount: 3 },
      { category: 'Tops', size: 'Med', variantCount: 2 },
      { category: 'Tops', size: '', variantCount: 1 }
    ]);
  });

  it('totalUnmatchedVariants sums variant counts, not row counts', () => {
    expect(totalUnmatchedVariants(report)).toBe(6);
    expect(totalUnmatchedVariants({ scale_id: 'x', categories: [] })).toBe(0);
  });

  it('mapCandidates matches category case-insensitively and size EXACTLY — "32" must not swallow the "32 " typo row', () => {
    const products: ProductForMatching[] = [
      {
        id: 'p1',
        name: 'Slim Jean',
        style_code: 'SJ1',
        category: ' denim',
        variants: [
          { inventory_item_id: 1, sku: 'SJ1-32', size: '32 ', color: 'Indigo' },
          { inventory_item_id: 2, sku: 'SJ1-32B', size: '32', color: 'Black' }
        ]
      },
      {
        id: 'p2',
        name: 'Tee',
        style_code: 'T1',
        category: 'Tops',
        variants: [{ inventory_item_id: 3, sku: 'T1-32', size: '32 ', color: 'White' }]
      }
    ];
    const candidates = mapCandidates(products, 'Denim', '32 ');
    // Variant 2 ("32", no trailing space) matching here would be the wrong
    // answer: the report row is about the typo'd string specifically.
    expect(candidates.map((candidate) => candidate.variantId)).toEqual([1]);
    expect(candidates[0].productName).toBe('Slim Jean');
  });

  it('candidateCountMismatch is the honesty flag for the size_scale field the products payload does not carry', () => {
    expect(candidateCountMismatch(4, 3)).toBe(true);
    expect(candidateCountMismatch(3, 3)).toBe(false);
  });

  it('activeAxisValues offers only the active vocabulary; validateMapSelection enforces one active value per axis', () => {
    expect(activeAxisValues(compositeScale, 0)).toEqual(['30', '32']); // '34' inactive
    expect(activeAxisValues(compositeScale, 1)).toEqual(['30', '32']);

    expect(validateMapSelection(compositeScale, ['32'])).toMatch(/2/);
    expect(validateMapSelection(compositeScale, ['32', ''])).toMatch(/inseam/i);
    expect(validateMapSelection(compositeScale, ['34', '32'])).toMatch(/not an active value/);
    expect(validateMapSelection(compositeScale, ['32', '30'])).toBeNull();
  });

  it('toMapSizePayload is the PUT /variants/{id}/size/ body', () => {
    expect(toMapSizePayload('scale-1', ['32', '30'])).toEqual({ scale_id: 'scale-1', values: ['32', '30'] });
  });

  it('summarizeMapResults counts per-variant outcomes — mapping is N PUTs, not one bulk call, and partial failure is a real state', () => {
    expect(
      summarizeMapResults([
        { variantId: 1, ok: true, message: null },
        { variantId: 2, ok: false, message: 'nope' },
        { variantId: 3, ok: true, message: null }
      ])
    ).toEqual({ succeeded: 2, failed: 1, summary: '2 variant(s) mapped, 1 failed' });
    expect(summarizeMapResults([]).summary).toBe('Nothing to map.');
  });
});

// ---------------------------------------------------------------------------
// Error rendering — the all-or-nothing 409
// ---------------------------------------------------------------------------

describe('parseSizeScaleError and blocker matching', () => {
  const valuesConflict = axiosError(409, {
    error: 'Some values are still carried by variants and cannot be removed.',
    detail: [
      {
        reason: 'value_in_use',
        axis_index: 0,
        value: 'M',
        variant_count: 12,
        message: "'M' is carried by 12 variant(s). Deactivate it instead of removing it."
      }
    ]
  });

  it('reads the summary and the typed blockers (message key, not detail)', () => {
    const parsed = parseSizeScaleError(valuesConflict);
    expect(parsed.summary).toMatch(/cannot be removed/);
    expect(parsed.blockers).toHaveLength(1);
    expect(parsed.blockers[0]).toMatchObject({ reason: 'value_in_use', axisIndex: 0, value: 'M', variantCount: 12 });
    expect(parsed.blockers[0].message).toMatch(/Deactivate it instead/);
  });

  it('blockerForValue matches by (axis_index, value), NEVER by array position — the PUT is all-or-nothing and detail[] is a subset', () => {
    // The user removed TWO rows, 'S' (row 0 of the removal) and 'M' (row 1).
    // Only 'M' is referenced, so detail[] has ONE element — about 'M'.
    const parsed = parseSizeScaleError(valuesConflict);
    // THE WRONG ANSWER, pinned: indexing detail by the removed row's position
    // would blame 'S' (the innocent first removal) with M's blocker.
    expect(parsed.blockers[0].value).not.toBe('S');
    expect(blockerForValue(parsed.blockers, 0, 'S')).toBeNull();
    expect(blockerForValue(parsed.blockers, 0, 'M')?.variantCount).toBe(12);
    // Same value string on the OTHER axis is a different identifier.
    expect(blockerForValue(parsed.blockers, 1, 'M')).toBeNull();
  });

  it('a delete refusal names ALL THREE protect edges in one 409, and each is describable', () => {
    const parsed = parseSizeScaleError(
      axiosError(409, {
        error: 'This scale is still referenced and cannot be deleted.',
        detail: [
          { reason: 'components_reference_scale', variant_count: 7, message: '7 variant(s) are sized on this scale.' },
          { reason: 'categories_bound', categories: ['Denim', 'Tops'], message: 'Unbind these categories first: Denim, Tops.' },
          { reason: 'products_override', product_count: 2, message: '2 style(s) override to this scale.' }
        ]
      })
    );
    expect(parsed.blockers.map((blocker) => blocker.reason)).toEqual([
      'components_reference_scale',
      'categories_bound',
      'products_override'
    ]);
    expect(parsed.blockers[1].categories).toEqual(['Denim', 'Tops']);
    parsed.blockers.forEach((blocker) => expect(describeDeleteBlocker(blocker)).toBeTruthy());
  });

  it('describeDeleteBlocker composes a line when the server sent no message', () => {
    expect(
      describeDeleteBlocker({
        reason: 'categories_bound',
        axisIndex: null,
        value: null,
        variantCount: null,
        productCount: null,
        categories: ['Denim'],
        message: ''
      })
    ).toMatch(/Denim/);
  });

  it('a 400 blocker body from the variant-size PUT parses the same way (same shape, different status)', () => {
    const parsed = parseSizeScaleError(
      axiosError(400, {
        error: 'The size does not fit the scale.',
        detail: [{ reason: 'unknown_value', axis_index: 1, value: '33', message: "'33' is not on the Inseam axis." }]
      })
    );
    expect(parsed.blockers[0]).toMatchObject({ axisIndex: 1, value: '33' });
  });

  it('degrades to parseApiError for plain DRF errors and to the fallback for a bodyless failure', () => {
    const drf = parseSizeScaleError(axiosError(400, { name: ["A scale named 'Letter' already exists."] }));
    expect(drf.summary).toMatch(/already exists/);
    expect(drf.blockers).toEqual([]);

    const dead = parseSizeScaleError(new Error('network'));
    expect(dead.summary).toBeTruthy();
    expect(dead.blockers).toEqual([]);
  });

  it('warningForValue matches deactivation warnings by identifier too', () => {
    const warnings = [{ reason: 'deactivated_value_in_use', axis_index: 0, value: 'M', variant_count: 12, message: 'still carried' }];
    expect(warningForValue(warnings, 0, 'M')?.variant_count).toBe(12);
    expect(warningForValue(warnings, 0, 'S')).toBeNull();
    expect(warningForValue(undefined, 0, 'M')).toBeNull();
  });
});
