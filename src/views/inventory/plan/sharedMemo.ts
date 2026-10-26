// The share link's projection as the memo view (Inventory › Plan, buy planner B9).
//
// The backend's shared projection (buying/memo.py shared_payload) is another shape on purpose: no sections, no
// refs, no line ids, plain sentences, two totals, a card's own `why`, the fit as a word. This maps it into the
// same `MemoView` so the same presentational components draw it, with nothing citable and nothing to act on.

import type { SharedCard, SharedFigure, SharedMemo } from 'api/buying.api';

import { absoluteAssetUrl } from './apiPath';
import {
  chipLabels,
  domIdOf,
  FIT_WORDS,
  FLAG_WORDS,
  SECTION_ORDER,
  STATUS_WORDS,
  type AnchorEntry,
  type CardView,
  type ChunkView,
  type MemoView
} from './memo';

const NUMBERED = new Set(['recommended', 'hold', 'flagged']);

class Shared {
  anchors: Record<string, AnchorEntry> = {};

  chunk(
    path: string,
    sentence: string | null | undefined,
    value: SharedFigure | null = null,
    cardKey: string | null = null
  ): ChunkView | null {
    if ((sentence === null || sentence === undefined) && !value) return null;
    const anchor = `shared:${path}`;
    const view: ChunkView = { anchor, domId: domIdOf(anchor), sentence: sentence ?? null, value, citable: null, lineId: null };
    this.anchors[anchor] = { domId: view.domId, lineId: null, cardKey, citable: null };
    return view;
  }
}

const figureOf = (f: SharedFigure | null) =>
  f && f.amount !== null && f.amount !== undefined
    ? { amount: f.amount, unit: f.unit || 'units', low: f.low ?? null, high: f.high ?? null }
    : null;

const sharedCard = (s: Shared, c: SharedCard, kind: 'items' | 'carried', index: number, apiBase: string): CardView => {
  const key = `shared-${kind}-${index}`;
  const sizes = c.sizes || [];
  const split = c.split || null;
  const order = split ? [...sizes.filter((x) => x in split), ...Object.keys(split).filter((x) => !sizes.includes(x))] : [];
  const figure = figureOf(c.number);
  const status = c.status ?? '';
  return {
    key,
    domId: domIdOf(`card:${key}`),
    lineId: null,
    name: c.name,
    brand: c.brand,
    picture: absoluteAssetUrl(c.picture, apiBase),
    chips: chipLabels(c.chips),
    sizes,
    status,
    statusWord: status ? (STATUS_WORDS[status] ?? status) : '',
    flagWords: (c.flags || []).map((f) => FLAG_WORDS[f]).filter((w): w is string => Boolean(w)),
    fitWord: c.fit ? (FIT_WORDS[c.fit] ?? null) : null,
    figure,
    isCut: false,
    why: s.chunk(`${kind}.${index}.why`, c.why, null, key),
    split: split ? order.map((size) => ({ size, qty: split[size] })) : [],
    splitChunk: null,
    price: null,
    fit: null,
    notes: [],
    owner: [],
    cut: null,
    decision: null,
    moved: null,
    note: '',
    missing: NUMBERED.has(status) && figure === null
  };
};

export const sharedMemoView = (memo: SharedMemo, apiBase: string): MemoView => {
  const s = new Shared();
  const totals: { label: string; chunk: ChunkView }[] = [];
  const units = s.chunk('totals.units', null, memo.totals?.units ?? null);
  if (units) totals.push({ label: 'Units', chunk: units });
  const revenue = s.chunk('totals.expected_revenue', null, memo.totals?.expected_revenue ?? null);
  if (revenue) totals.push({ label: 'Expected revenue', chunk: revenue });

  const rows = (memo.months?.rows || [])
    .map((r, i) => {
      const row = s.chunk(`months.${i}`, r.sentence, r.value);
      if (!row) return null;
      return {
        key: `shared-month-${i}`,
        name: '',
        row,
        details: (r.details || []).map((d, j) => (d ? s.chunk(`months.${i}.${j}`, d) : null)).filter((x): x is ChunkView => x !== null)
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const items = (memo.items || []).map((c, i) => sharedCard(s, c, 'items', i, apiBase));
  const carried = (memo.carried || []).map((c, i) => sharedCard(s, c, 'carried', i, apiBase));

  return {
    audience: 'shared',
    order: SECTION_ORDER,
    title: memo.plan?.name ?? '',
    store: memo.plan?.store ?? '',
    targetDate: memo.plan?.target_date ?? '',
    windowStart: memo.plan?.window_start ?? '',
    windowEnd: memo.plan?.window_end ?? '',
    asOf: memo.as_of,
    cover: s.chunk('cover', memo.cover),
    basis: s.chunk('basis', memo.basis),
    totals,
    months: { root: s.chunk('months', memo.months?.sentence, memo.months?.value ?? null), rows },
    items,
    carried,
    excluded: [],
    excludedDomIds: {},
    caveats: (memo.caveats || []).map((c, i) => (c ? s.chunk(`caveats.${i}`, c) : null)).filter((x): x is ChunkView => x !== null),
    notes: { planNote: '', lines: [] },
    missingCaveat: [...items, ...carried].some((c) => c.missing),
    anchors: s.anchors,
    lineTraces: {}
  };
};
