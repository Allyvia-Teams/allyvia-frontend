// Fixtures for the plan page's seam tests (Inventory › Plan, buy planner B9): payloads shaped exactly as the
// backend sends them (buying/memo.py compose and _card, plan_views.py plan_payload and line_payload). Not
// imported by the app.

import type { TraceNode, TraceValue } from 'api/agentTrace.api';
import type { Chunk, IntakeFile, Line, LineRevision, Live, MemoCard, MemoResponse, PlanDetail, Run, Tree } from 'api/buying.api';

export const PLAN_ID = '11111111-1111-4111-8111-111111111111';
export const STORE = { id: '22222222-2222-4222-8222-222222222222', name: 'Main' };
export const DRESS = '33333333-3333-4333-8333-333333333333';
export const TOP = '44444444-4444-4444-8444-444444444444';
export const CAMI = '55555555-5555-4555-8555-555555555555';
export const OLD = '66666666-6666-4666-8666-666666666666';
export const DRESS_TRACE = 'aaaaaaaa-0000-4000-8000-000000000001';
export const TOP_TRACE = 'aaaaaaaa-0000-4000-8000-000000000002';
export const MONTH_TRACE = 'aaaaaaaa-0000-4000-8000-000000000009';

export const hex = (uuid: string) => uuid.replace(/-/g, '');

export const value = (amount: string | null, unit = 'units', low: string | null = null, high: string | null = null): TraceValue => ({
  amount,
  unit,
  low,
  high
});

export const traceChunk = (traceId: string, key: string, sentence: string | null, v: TraceValue | null = null): Chunk => ({
  ref: { trace_id: traceId, key },
  sentence,
  value: v
});

export const treeChunk = (key: string, sentence: string | null, v: TraceValue | null = null, tree: 'memo' | 'summary' = 'memo'): Chunk => ({
  ref: { tree, key },
  sentence,
  value: v
});

export const node = (
  key: string,
  label: string,
  v: TraceValue | null = null,
  children: string[] = [],
  extra: Partial<TraceNode> = {}
): TraceNode => ({
  key,
  kind: 'number',
  label,
  value: v,
  formula: null,
  evidence: { source: 'buying.planner', status: 'measured', n: 4, window: null, provenance: {}, series: null },
  children,
  tags: [],
  sentence: `${label}.`,
  composer: key,
  ...extra
});

export const run = (status: Run['status'] = 'done', step: Run['step'] = ''): Run => ({
  status,
  step,
  started_at: '2027-02-28T15:00:00Z',
  finished_at: status === 'done' ? '2027-02-28T15:01:00Z' : null,
  error: ''
});

export const revision = (traceId: string, suggested: number | null, extra: Partial<LineRevision> = {}): LineRevision => ({
  revision: 3,
  as_of: '2027-02-28',
  suggested_qty: suggested,
  low_qty: suggested === null ? null : suggested - 6,
  high_qty: suggested === null ? null : suggested + 9,
  by_size: suggested === null ? {} : { S: 10, M: suggested - 20, L: 10 },
  status: 'recommended',
  flags: [],
  trace_id: traceId,
  built_at: '2027-02-28T15:00:30Z',
  cut_from: null,
  cut_sentence: null,
  ...extra
});

export const line = (id: string, name: string, extra: Partial<Line> = {}): Line => ({
  id,
  position: 0,
  source: 'upload',
  name,
  category: 'Dresses',
  category_key: 'dresses',
  brand: 'Meadow',
  sizes: ['S', 'M', 'L'],
  intended_price: '120.00',
  cost: '48.00',
  needs_price: false,
  supplier_id: null,
  style_code_hint: '',
  product_id: null,
  link_source: 'none',
  excluded: false,
  excluded_at: null,
  purchase_order_id: null,
  flags: [],
  images: [],
  picture: null,
  revision: null,
  decision: null,
  qty_used: null,
  used_source: 'none',
  ...extra
});

export const card = (id: string, name: string, traceId: string, qty: string | null, extra: Partial<MemoCard> = {}): MemoCard => ({
  line_id: id,
  position: 0,
  name,
  brand: 'Meadow',
  category_key: 'dresses',
  picture: `/api/v1/buy/images/${id}/abcdefabcdef-card.webp`,
  chips: { taxonomy: ['clothing', 'dresses'], attributes: { length: 'midi' }, colours: [{ family: 'green', raw: 'sage' }] },
  sizes: ['S', 'M', 'L'],
  status: 'recommended',
  flags: [],
  number:
    qty === null
      ? null
      : traceChunk(
          traceId,
          'line.qty',
          `Buy ${qty} units: the reason.`,
          value(qty, 'units', String(Number(qty) - 6), String(Number(qty) + 9))
        ),
  split:
    qty === null
      ? null
      : {
          ...treeChunk(`memo.line.${hex(id)}.sizes`, `S 10, M ${Number(qty) - 20}, L 10.`, value(qty)),
          split: { L: 10, M: Number(qty) - 20, S: 10 }
        },
  price: treeChunk(`memo.line.${hex(id)}.price`, 'Retail $120.00, cost $48.00: a 60% margin.', value('120.00', 'usd')),
  fit: traceChunk(traceId, 'line.fit', '46 customers bought dresses at about this price here.'),
  notes: [],
  cut: null,
  decision: null,
  note: '',
  moved: null,
  owner: [],
  ...extra
});

export const summaryTree = (): Tree => ({
  root: 'summary.plan',
  nodes: {
    'summary.plan': node('summary.plan', 'The plan', null, ['summary.units', 'summary.cost', 'summary.revenue']),
    'summary.units': node('summary.units', 'Units', value('88')),
    'summary.cost': node('summary.cost', 'At cost', value('3820.00', 'usd')),
    'summary.revenue': node('summary.revenue', 'Expected revenue', value('8400.00', 'usd', '7100.00', '9800.00'))
  }
});

export const memoTree = (): Tree => ({
  root: 'memo.plan',
  nodes: {
    'memo.plan': node('memo.plan', 'Memo', null, ['memo.cover', 'memo.expected_margin']),
    'memo.cover': node('memo.cover', 'Spring 27', null),
    'memo.expected_margin': node('memo.expected_margin', 'Expected margin', value('4128.00', 'usd'))
  }
});

export const live = (extra: Partial<Live> = {}): Live => ({
  status: 'open',
  frozen_at: null,
  run: run(),
  orders: [],
  matches: [],
  waiting: null,
  actions: { decide: true, edit: true, share: true, link: false },
  ...extra
});

export const memoResponse = (
  overrides: { cards?: MemoCard[]; carried?: MemoCard[]; live?: Live; posture?: Tree | null } = {}
): MemoResponse => ({
  frozen: false,
  live: overrides.live ?? live(),
  posture: overrides.posture ?? null,
  memo: {
    version: 1,
    audience: 'owner',
    as_of: '2027-02-28',
    plan: {
      id: PLAN_ID,
      name: 'Spring 27',
      season_label: 'SS27',
      store: STORE,
      target_date: '2027-03-01',
      window_start: '2027-04-05',
      window_end: '2027-06-27'
    },
    trees: { summary: summaryTree(), memo: memoTree() },
    sections: [
      {
        kind: 'cover',
        cover: treeChunk('memo.cover', 'Spring 27 for Main: order by 1 Mar 2027, selling 5 Apr to 27 Jun 2027.'),
        basis: traceChunk(MONTH_TRACE, 'plan.basis', 'The forecast is measured but unproven here.')
      },
      {
        kind: 'totals',
        figures: [
          treeChunk('summary.units', '88 units over 2 styles.', value('88'), 'summary'),
          treeChunk('summary.cost', '$3,820.00 at cost.', value('3820.00', 'usd'), 'summary'),
          treeChunk('summary.revenue', 'About $8,400.00 expected.', value('8400.00', 'usd', '7100.00', '9800.00'), 'summary')
        ],
        expected_margin: treeChunk('memo.expected_margin', 'About $4,128.00 margin expected.', value('4128.00', 'usd'))
      },
      {
        kind: 'months',
        root: traceChunk(MONTH_TRACE, 'plan.months', 'The window, month by month.', value('45000.00', 'usd')),
        rows: [
          {
            row: traceChunk(
              MONTH_TRACE,
              'plan.month.2027_04',
              'April: about $14,000.00 expected.',
              value('14000.00', 'usd', '12000.00', '16000.00')
            ),
            details: [traceChunk(MONTH_TRACE, 'plan.month.2027_04.share', 'Dresses were 20% of April last year.')]
          },
          {
            row: traceChunk(MONTH_TRACE, 'plan.month.2027_05', 'May: about $16,000.00 expected.', value('16000.00', 'usd')),
            details: []
          }
        ]
      },
      {
        kind: 'items',
        cards: overrides.cards ?? [
          card(DRESS, 'Wrap Dress', DRESS_TRACE, '40'),
          card(TOP, 'Silk Cami', TOP_TRACE, '48', { category_key: 'tops' })
        ]
      },
      { kind: 'carried', cards: overrides.carried ?? [] },
      { kind: 'excluded', lines: [{ line_id: OLD, name: 'Old Scarf', excluded_at: '2027-02-20T10:00:00Z' }] },
      { kind: 'caveats', items: [treeChunk('memo.caveat.band', 'The store’s revenue forecast is measured but unproven here.')] },
      {
        kind: 'notes',
        plan_note: 'Keep the dresses light.',
        lines: [{ line_id: DRESS, name: 'Wrap Dress', note: 'the rep says best seller' }]
      }
    ]
  }
});

export const intakeFile = (extra: Partial<IntakeFile> = {}): IntakeFile => ({
  id: 'f1',
  filename: 'sheet.csv',
  format: 'csv',
  status: 'read',
  reason: '',
  lines_created: 9,
  lines_merged: 0,
  images_attached: 0,
  parked: [],
  warnings: [],
  ambiguous_price_column: null,
  price_means: '',
  created_at: '2027-02-28T14:59:00Z',
  read_at: '2027-02-28T15:00:10Z',
  ...extra
});

export const planDetail = (extra: Partial<PlanDetail> = {}): PlanDetail => ({
  id: PLAN_ID,
  name: 'Spring 27',
  season_label: 'SS27',
  location: STORE,
  target_date: '2027-03-01',
  window_start: '2027-04-05',
  window_end: '2027-06-27',
  target_sell_through: '0.800',
  sell_through_basis: 'policy',
  budget_cost: null,
  status: 'open',
  note: '',
  run: run(),
  created_at: '2027-02-27T10:00:00Z',
  lines: [
    line(DRESS, 'Wrap Dress', { revision: revision(DRESS_TRACE, 40) }),
    line(TOP, 'Silk Cami', { category_key: 'tops', revision: revision(TOP_TRACE, 48) })
  ],
  needs_price: [],
  files: [intakeFile()],
  parked: [],
  summary: summaryTree(),
  ...extra
});
