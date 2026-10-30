// The memo as a view (Inventory › Plan, buy planner B9; design §7 and §10): the owner's memo payload
// (buying/memo.py compose, plus the plan's lines and, for the company view, the posture) turned into what the
// page draws. The shared projection has its own mapper (sharedMemo.ts) into the same view.
//
// Rules this file keeps:
// - every figure is a node's value and every sentence the server's; the page adds labels only;
// - a chunk missing where the card's status says it must exist renders the dash and ONE caveat, never 0;
//   chunks null by design (a price on a style with no price, the cut, her decision) are simply absent;
// - on a cut line the big number is the cut's own split total, with no range (the cut chunk is a flag);
// - every chunk has an anchor (`trace_id:key` or `tree:<tree>:key`) and a DOM id; only chunks the chat can
//   read are citable: a trace node (`{trace_id, key}`), or a card's memo chunk (its line). Cover, totals and
//   caveats are read-time nodes the chat cannot cite yet (B8's open item).

import type { TraceValue } from 'api/agentTrace.api';
import type { Chunk, ContextEntry, Line, MemoCard, MemoResponse, MemoSection, Tree } from 'api/buying.api';

import { absoluteAssetUrl } from './apiPath';

export const MISSING = '—';

export const SECTION_ORDER = ['cover', 'totals', 'months', 'items', 'carried', 'excluded', 'caveats', 'notes'] as const;
export type SectionKind = (typeof SECTION_ORDER)[number];

export interface ChunkView {
  anchor: string;
  domId: string;
  sentence: string | null;
  value: TraceValue | null;
  citable: ContextEntry | null;
  lineId: string | null;
}

export interface FigureView {
  amount: string | null;
  unit: string;
  low: string | null;
  high: string | null;
}

export interface CardView {
  key: string;
  domId: string;
  lineId: string | null;
  name: string;
  brand: string;
  picture: string | null;
  chips: string[];
  sizes: string[];
  status: string;
  statusWord: string;
  flagWords: string[];
  fitWord: string | null;
  figure: FigureView | null;
  isCut: boolean;
  why: ChunkView | null;
  split: { size: string; qty: number }[];
  splitChunk: ChunkView | null;
  price: ChunkView | null;
  fit: ChunkView | null;
  notes: ChunkView[];
  owner: ChunkView[];
  cut: ChunkView | null;
  decision: ChunkView | null;
  moved: ChunkView | null;
  note: string;
  missing: boolean;
}

export interface MonthRowView {
  key: string;
  name: string;
  row: ChunkView;
  details: ChunkView[];
}

export interface AnchorEntry {
  domId: string;
  lineId: string | null;
  cardKey: string | null;
  citable: ContextEntry | null;
}

export interface MemoView {
  audience: 'owner' | 'shared';
  order: readonly SectionKind[];
  title: string;
  store: string;
  targetDate: string;
  windowStart: string;
  windowEnd: string;
  asOf: string | null;
  cover: ChunkView | null;
  basis: ChunkView | null;
  totals: { label: string; chunk: ChunkView }[];
  months: { root: ChunkView | null; rows: MonthRowView[] };
  items: CardView[];
  carried: CardView[];
  excluded: { lineId: string; name: string; excludedAt: string | null }[];
  excludedDomIds: Record<string, string>;
  caveats: ChunkView[];
  notes: { planNote: string; lines: { lineId: string; name: string; note: string }[] };
  missingCaveat: boolean;
  anchors: Record<string, AnchorEntry>;
  /** A card's own line trace (from its number), for citations that name a deeper node of it. */
  lineTraces: Record<string, string>;
}

export const STATUS_WORDS: Record<string, string> = {
  recommended: 'Recommended',
  hold: 'On hold',
  insufficient: 'Not enough history',
  cut: 'Cut to fit the budget',
  flagged: 'Flagged',
  cleared: 'No longer carried',
  needs_price: 'Needs a price',
  unsized: 'Not sized yet'
};

export const FLAG_WORDS: Record<string, string> = {
  wide: 'wide range',
  margin_below_category: 'margin below its category',
  price_outside: 'priced outside what sold here'
};

export const FIT_WORDS: Record<string, string> = { fits: 'Fits', stretch: 'Stretch', no_signal: 'No signal' };

/** Statuses whose card must carry a number (anything else may be null by design). */
const NUMBERED = new Set(['recommended', 'hold', 'flagged', 'cut']);

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export const anchorOf = (ref: Chunk['ref']): string => ('trace_id' in ref ? `${ref.trace_id}:${ref.key}` : `tree:${ref.tree}:${ref.key}`);

export const domIdOf = (anchor: string): string => `plan-c-${anchor.replace(/[^A-Za-z0-9_-]/g, '-')}`;

const lineFromTreeKey = (key: string): string | null => {
  const m = /^memo\.line\.([0-9a-f]{32})(\.|$)/.exec(key);
  if (!m) return null;
  const h = m[1];
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};

/** Thousands separators on a decimal string, never re-rounded. */
const grouped = (text: string): string => {
  const [whole, frac] = text.split('.');
  const sign = whole.startsWith('-') ? '-' : '';
  const digits = sign ? whole.slice(1) : whole;
  const withCommas = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${sign}${withCommas}${frac !== undefined ? `.${frac}` : ''}`;
};

const isNumeric = (text: string | null | undefined): text is string => typeof text === 'string' && /^-?\d+(\.\d+)?$/.test(text.trim());

export const amountText = (amount: string | null | undefined, unit: string): string => {
  if (!isNumeric(amount)) return MISSING;
  const a = amount.trim();
  if (unit === 'usd') return a.startsWith('-') ? `-$${grouped(a.slice(1))}` : `$${grouped(a)}`;
  if (unit === 'pct') return `${a}%`;
  return grouped(a);
};

/** A figure as the payload gives it: the amount, and its range when the node has one. */
export const figureText = (figure: FigureView | TraceValue | null | undefined): string => {
  if (!figure || !isNumeric(figure.amount)) return MISSING;
  const main = amountText(figure.amount, figure.unit);
  if (isNumeric(figure.low) && isNumeric(figure.high)) {
    return `${main} (${amountText(figure.low, figure.unit)}–${amountText(figure.high, figure.unit)})`;
  }
  return main;
};

export const monthName = (key: string): string | null => {
  const m = /plan\.month\.(\d{4})_(\d{2})$/.exec(key);
  if (!m) return null;
  const month = Number(m[2]);
  return month >= 1 && month <= 12 ? MONTHS[month - 1] : null;
};

export const chipLabels = (chips: MemoCard['chips'] | undefined): string[] => {
  if (!chips) return [];
  const out: string[] = [];
  if (chips.taxonomy?.length) out.push(chips.taxonomy.join(' › '));
  Object.values(chips.attributes || {}).forEach((v) => {
    (Array.isArray(v) ? v : [v]).forEach((x) => x && out.push(String(x)));
  });
  (chips.colours || []).forEach((c) => {
    const word = c.raw || c.family;
    if (word) out.push(word);
  });
  return out;
};

class Builder {
  anchors: Record<string, AnchorEntry> = {};
  private seen = new Set<string>();

  chunk(c: Chunk | null | undefined, card: { key: string; lineId: string } | null = null, citable = true): ChunkView | null {
    if (!c || !c.ref) return null;
    let anchor = anchorOf(c.ref);
    if (this.seen.has(anchor)) {
      let n = 2;
      while (this.seen.has(`${anchor}#${n}`)) n += 1;
      anchor = `${anchor}#${n}`;
    }
    this.seen.add(anchor);
    const isTrace = 'trace_id' in c.ref;
    const lineId = card?.lineId ?? (!isTrace ? lineFromTreeKey(c.ref.key) : null);
    let entry: ContextEntry | null = null;
    if (citable) {
      if ('trace_id' in c.ref) entry = { trace_id: c.ref.trace_id, key: c.ref.key };
      else if (lineId) entry = { line_id: lineId };
    }
    const view: ChunkView = {
      anchor,
      domId: domIdOf(anchor),
      sentence: c.sentence ?? null,
      value: c.value ?? null,
      citable: entry,
      lineId
    };
    this.anchors[anchor] = { domId: view.domId, lineId, cardKey: card?.key ?? null, citable: entry };
    return view;
  }
}

const section = <K extends MemoSection['kind']>(sections: MemoSection[], kind: K): Extract<MemoSection, { kind: K }> | null =>
  (sections.find((s) => s.kind === kind) as Extract<MemoSection, { kind: K }> | undefined) ?? null;

const treeLabel = (trees: { summary: Tree | null; memo: Tree | null }, ref: Chunk['ref']): string => {
  if ('tree' in ref) {
    const tree = trees[ref.tree];
    const label = tree?.nodes?.[ref.key]?.label;
    if (label) return label;
  }
  return ref.key;
};

const splitView = (sizes: string[], split: Record<string, number> | null | undefined): { size: string; qty: number }[] => {
  if (!split) return [];
  const order = [...sizes.filter((s) => s in split), ...Object.keys(split).filter((s) => !sizes.includes(s))];
  return order.map((size) => ({ size, qty: split[size] }));
};

const cardView = (b: Builder, c: MemoCard, apiBase: string): CardView => {
  const key = c.line_id;
  const ctx = { key, lineId: c.line_id };
  const why = b.chunk(c.number, ctx);
  const splitChunk = b.chunk(c.split, ctx);
  const cut = b.chunk(c.cut, ctx);
  const isCut = c.cut !== null && c.cut !== undefined;
  let figure: FigureView | null = null;
  if (isCut) {
    const amount = c.split?.value?.amount ?? null;
    figure = isNumeric(amount) ? { amount, unit: c.split?.value?.unit || 'units', low: null, high: null } : null;
  } else if (c.number?.value && isNumeric(c.number.value.amount)) {
    const v = c.number.value;
    figure = { amount: v.amount, unit: v.unit || 'units', low: v.low ?? null, high: v.high ?? null };
  }
  const missing = NUMBERED.has(c.status) && figure === null;
  return {
    key,
    domId: domIdOf(`card:${key}`),
    lineId: c.line_id,
    name: c.name,
    brand: c.brand,
    picture: absoluteAssetUrl(c.picture, apiBase),
    chips: chipLabels(c.chips),
    sizes: c.sizes || [],
    status: c.status,
    statusWord: STATUS_WORDS[c.status] ?? c.status,
    flagWords: (c.flags || []).map((f) => FLAG_WORDS[f]).filter((w): w is string => Boolean(w)),
    fitWord: null,
    figure,
    isCut,
    why,
    split: splitView(c.sizes || [], c.split?.split),
    splitChunk,
    price: b.chunk(c.price, ctx),
    fit: b.chunk(c.fit, ctx),
    notes: (c.notes || []).map((n) => b.chunk(n, ctx)).filter((x): x is ChunkView => x !== null),
    owner: (c.owner || []).map((n) => b.chunk(n, ctx)).filter((x): x is ChunkView => x !== null),
    cut,
    decision: b.chunk(c.decision, ctx),
    moved: b.chunk(c.moved, ctx),
    note: c.note || '',
    missing
  };
};

/** The owner's memo as the page draws it. `lines` are the plan's own (for her Record); `apiBase` places pictures. */
export const ownerMemoView = (response: MemoResponse, _lines: Line[], apiBase: string): MemoView => {
  const b = new Builder();
  const { memo } = response;
  const sections = memo.sections || [];
  const trees = memo.trees || { summary: null, memo: null };

  const cover = section(sections, 'cover');
  const totals = section(sections, 'totals');
  const months = section(sections, 'months');
  const items = section(sections, 'items');
  const carried = section(sections, 'carried');
  const excluded = section(sections, 'excluded');
  const caveats = section(sections, 'caveats');
  const notes = section(sections, 'notes');

  const totalViews: { label: string; chunk: ChunkView }[] = [];
  (totals?.figures || []).forEach((f) => {
    const view = b.chunk(f, null, false);
    if (view) totalViews.push({ label: treeLabel(trees, f.ref), chunk: view });
  });
  if (totals?.expected_margin) {
    const view = b.chunk(totals.expected_margin, null, false);
    if (view) totalViews.push({ label: treeLabel(trees, totals.expected_margin.ref), chunk: view });
  }
  const cash = response.posture?.nodes?.['posture.cash'];
  if (cash) {
    const anchor = `tree:posture:posture.cash`;
    const view: ChunkView = {
      anchor,
      domId: domIdOf(anchor),
      sentence: cash.sentence || null,
      value: cash.value,
      citable: null,
      lineId: null
    };
    b.anchors[anchor] = { domId: view.domId, lineId: null, cardKey: null, citable: null };
    totalViews.push({ label: cash.label || 'Company cash', chunk: view });
  }

  const rows: MonthRowView[] = [];
  (months?.rows || []).forEach((r) => {
    const row = b.chunk(r.row);
    if (!row || !r.row) return;
    rows.push({
      key: r.row.ref.key,
      name: monthName(r.row.ref.key) ?? '',
      row,
      details: (r.details || []).map((d) => b.chunk(d)).filter((x): x is ChunkView => x !== null)
    });
  });

  const itemViews = (items?.cards || []).map((c) => cardView(b, c, apiBase));
  const carriedViews = (carried?.cards || []).map((c) => cardView(b, c, apiBase));
  const lineTraces: Record<string, string> = {};
  [...(items?.cards || []), ...(carried?.cards || [])].forEach((c) => {
    if (c.number && 'trace_id' in c.number.ref) lineTraces[c.line_id] = c.number.ref.trace_id;
  });

  const excludedLines = (excluded?.lines || []).map((l) => ({ lineId: l.line_id, name: l.name, excludedAt: l.excluded_at }));
  const excludedDomIds: Record<string, string> = {};
  excludedLines.forEach((l) => {
    excludedDomIds[l.lineId] = domIdOf(`excluded:${l.lineId}`);
  });

  return {
    audience: 'owner',
    order: SECTION_ORDER,
    title: memo.plan.name,
    store: memo.plan.store?.name ?? '',
    targetDate: memo.plan.target_date,
    windowStart: memo.plan.window_start,
    windowEnd: memo.plan.window_end,
    asOf: memo.as_of,
    cover: b.chunk(cover?.cover, null, false),
    basis: b.chunk(cover?.basis),
    totals: totalViews,
    months: { root: b.chunk(months?.root), rows },
    items: itemViews,
    carried: carriedViews,
    excluded: excludedLines,
    excludedDomIds,
    caveats: (caveats?.items || []).map((c) => b.chunk(c, null, false)).filter((x): x is ChunkView => x !== null),
    notes: {
      planNote: notes?.plan_note || '',
      lines: (notes?.lines || []).map((l) => ({ lineId: l.line_id, name: l.name, note: l.note }))
    },
    missingCaveat: [...itemViews, ...carriedViews].some((c) => c.missing),
    anchors: b.anchors,
    lineTraces
  };
};
