// Owner trust T2 (docs/owner-trust-design.md §4.1): what she reads in "How we got this" and on a memo card carries
// no node key, no formula sign, no "n=" and no ISO month. Static renders (no DOM here), read as text.

import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it, vi } from 'vitest';

import type { Trace } from 'api/agentTrace.api';

import { ownerMemoView } from '../memo';
import { card, DRESS, DRESS_TRACE, memoResponse, node, planDetail, TOP, TOP_TRACE, traceChunk, treeChunk, value } from '../planFixtures';
import Memo from './Memo';
import TraceExplorer from './TraceExplorer';

vi.mock('utils/axios', () => ({
  default: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), put: vi.fn(), delete: vi.fn(), request: vi.fn() }
}));
vi.mock('react-apexcharts', () => ({ default: () => null }));

/** Each thing she must never read, with the name it is reported under. */
const BANNED: [string, RegExp][] = [
  ['a formula sign', /[×÷]/],
  ['a number followed by x', /\d(?:\.\d+)?x\b/],
  ["' = '", / = /],
  ['a formula function', /\b(?:min|max|ceil|floor|sum)\(/],
  ['a node key', /\b[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*\b/],
  ['a snake_case word', /\b[A-Za-z]+_[A-Za-z0-9_]+\b/],
  ['n=', /\bn=/],
  ['an ISO month', /(?<![\d-])\d{4}[-_](?:0[1-9]|1[0-2])(?![\d-])/]
];

/** The text she reads: style blocks and tags (and their attributes, where ids and anchors live) taken out, entities
 * read back. */
const textOf = (html: string) =>
  html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ');

const offences = (text: string) => BANNED.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);

const ev = (status: string, n: number | null) => ({ source: 'buying.planner', status, n, window: null, provenance: {}, series: null });

/** A line's chain, one node under the next, so opening at the last opens every row. Labels carry ISO months and
 * formulas carry signs and functions, as the planner stores them; one node has no sentence (its label shows). */
const CHAIN: Trace = {
  trace_id: DRESS_TRACE,
  subject: { type: 'buy_line', id: DRESS },
  revision: 3,
  as_of: '2027-02-28',
  engine_version: 'buy_planner/1',
  method_version: 1,
  fingerprint: 'f',
  root: 'line.qty',
  nodes: {
    'line.qty': node('line.qty', 'Units to buy', value('40', 'units', '34', '49'), ['line.r_style'], {
      formula: { text: 'ceil(Q_raw)', inputs: ['line.r_style'] },
      evidence: null,
      sentence: 'Buy 40 units (34 to 49): 39.2 to sell through at 80%, rounded up.'
    }),
    'line.r_style': node('line.r_style', 'Style revenue', value('4800.00', 'usd'), ['line.month.2026_11'], {
      formula: { text: 'R_cat × s ÷ N', inputs: ['line.month.2026_11'] },
      evidence: null,
      sentence: "$4,800.00 for this style: dresses' revenue at 1.2 times its fair share, shared across 10 styles."
    }),
    'line.month.2026_11': node('line.month.2026_11', 'Dresses 2026-11', value('4200.00', 'usd'), ['line.r_store.2026_11'], {
      formula: { text: 'R_store × share × event', inputs: ['line.r_store.2026_11'] },
      evidence: null,
      sentence: 'November 2026: about $4,200.00 of dresses, from what the store should take that month and the share dresses usually have.'
    }),
    'line.r_store.2026_11': node('line.r_store.2026_11', 'Store revenue 2026-11', value('21000.00', 'usd'), ['line.event.2026_11'], {
      evidence: ev('unproven', 30),
      sentence: 'November 2026: the store should take $21,000.00 over 30 days (measured, not yet proven).'
    }),
    'line.event.2026_11': node('line.event.2026_11', 'Event days 2026-11', value('1.18', 'ratio'), [], {
      evidence: ev('owner_stated', 5),
      sentence: ''
    })
  }
};

const renderExplorer = (trace: Trace) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(['buy-trace', trace.trace_id, null], { scope: 'company', location: null, trace });
  return renderToStaticMarkup(
    <QueryClientProvider client={client}>
      <TraceExplorer traceId={trace.trace_id} locationId={null} openKey="line.event.2026_11" />
    </QueryClientProvider>
  );
};

describe('How we got this: what she reads', () => {
  it('says each row as its sentence with the value and the status in words; never a key, a formula or a count', () => {
    const text = textOf(renderExplorer(CHAIN));
    expect(text).toContain('November 2026: about $4,200.00 of dresses');
    expect(text).toContain('Event days November 2026'); // no sentence: the label, its month in words
    expect(text).toContain('$21,000.00');
    expect(text).toContain('measured, not yet proven');
    expect(text).toContain('you told us');
    expect(offences(text)).toEqual([]);
  });
});

describe('A memo card: what she reads', () => {
  it('says an ISO month in words and never falls back to a node key', () => {
    const response = memoResponse({
      cards: [
        card(DRESS, 'Wrap Dress', DRESS_TRACE, '40', {
          number: traceChunk(
            DRESS_TRACE,
            'line.qty',
            'Buy 40 units: dresses sold best in 2026-11 last year.',
            value('40', 'units', '34', '49')
          )
        }),
        card(TOP, 'Silk Cami', TOP_TRACE, '48', { category_key: 'tops' })
      ]
    });
    const totals = response.memo.sections.find((s) => s.kind === 'totals');
    if (totals && totals.kind === 'totals') {
      totals.figures.push(treeChunk('summary.margin_flags', 'No style is below its category margin.', value('0', 'count'), 'summary'));
    }
    const view = ownerMemoView(response, planDetail().lines, 'http://localhost:8000/api/v1/');
    const text = textOf(renderToStaticMarkup(<Memo view={view} />));
    expect(text).toContain('dresses sold best in November 2026 last year');
    expect(text).toContain('This figure');
    expect(offences(text)).toEqual([]);
  });
});
