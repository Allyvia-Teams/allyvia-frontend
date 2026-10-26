import { describe, expect, it } from 'vitest';

import type { Trace } from 'api/agentTrace.api';

import { node, value } from './planFixtures';
import { flatten, pathTo, seriesOf, valueText } from './traceTree';

const trace = (): Trace => ({
  trace_id: 't1',
  subject: { type: 'buy_line', id: 'l1' },
  revision: 3,
  as_of: '2027-02-28',
  engine_version: 'buy_planner/b5',
  method_version: 1,
  fingerprint: 'f',
  root: 'line.qty',
  nodes: {
    'line.qty': node('line.qty', 'Units to order', value('40', 'units', '34', '49'), ['line.q_raw', 'line.sell_through']),
    'line.q_raw': node('line.q_raw', 'To buy, before rounding', value('39.25'), ['line.units']),
    'line.units': node('line.units', 'Units expected to sell', value('31.4'), ['line.r_style', 'line.price']),
    'line.r_style': node('line.r_style', "This style's share", value('3768.00', 'usd'), []),
    'line.price': node('line.price', 'Retail price', value('120.00', 'usd'), [], {
      evidence: { source: 'buying.BuyLine.intended_price', status: 'owner_stated', n: null, window: null, provenance: {}, series: null }
    }),
    'line.sell_through': node('line.sell_through', 'Target sell-through', value('0.8000', 'ratio'), [], {
      evidence: {
        source: 'buying.BuyPlan.target_sell_through',
        status: 'policy',
        n: null,
        window: null,
        provenance: {},
        series: [
          { x: 1, y: 3 },
          { x: 2, y: 5 }
        ]
      }
    })
  }
});

describe('flatten: the tree root-first, as deep as she opens it', () => {
  it('shows the root and its children by default, with depth and breadcrumbs', () => {
    const rows = flatten(trace(), new Set());
    expect(rows.map((r) => [r.key, r.depth])).toEqual([
      ['line.qty', 0],
      ['line.q_raw', 1],
      ['line.sell_through', 1]
    ]);
    expect(rows[1].breadcrumbs).toEqual(['Units to order']);
    expect(rows[1].hasChildren).toBe(true);
    expect(rows[2].hasChildren).toBe(false);
  });

  it('goes three levels down as she opens them, root-first', () => {
    const rows = flatten(trace(), new Set(['line.q_raw', 'line.units']));
    expect(rows.map((r) => r.key)).toEqual(['line.qty', 'line.q_raw', 'line.units', 'line.r_style', 'line.price', 'line.sell_through']);
    expect(rows.find((r) => r.key === 'line.r_style')?.breadcrumbs).toEqual([
      'Units to order',
      'To buy, before rounding',
      'Units expected to sell'
    ]);
    expect(rows.find((r) => r.key === 'line.r_style')?.depth).toBe(3);
  });

  it('never loops on a node that names itself or an ancestor, and skips children it does not have', () => {
    const t = trace();
    t.nodes['line.units'].children.push('line.qty', 'line.missing');
    const rows = flatten(t, new Set(['line.q_raw', 'line.units']));
    expect(rows.filter((r) => r.key === 'line.qty')).toHaveLength(1);
    expect(rows.some((r) => r.key === 'line.missing')).toBe(false);
  });

  it('finds the way to a key, to open See the numbers at it', () => {
    expect(pathTo(trace(), 'line.r_style')).toEqual(['line.qty', 'line.q_raw', 'line.units']);
    expect(pathTo(trace(), 'line.nothing')).toBeNull();
    expect(pathTo(trace(), 'line.qty')).toEqual([]);
  });
});

describe('the words beside a node', () => {
  it('prints the value with its unit and range, and the evidence status in words', () => {
    const rows = flatten(trace(), new Set(['line.q_raw', 'line.units']));
    expect(rows[0].valueText).toBe('40 (34–49) units');
    expect(rows.find((r) => r.key === 'line.r_style')?.valueText).toBe('$3,768.00');
    expect(rows.find((r) => r.key === 'line.price')?.statusText).toBe('owner stated');
    expect(rows.find((r) => r.key === 'line.sell_through')?.valueText).toBe('0.8');
    expect(valueText(null)).toBe('');
    expect(valueText(value(null))).toBe('—');
    expect(valueText(value('58.5', 'pct'))).toBe('58.5%');
    expect(valueText(value('1.3', 'ratio'))).toBe('1.3');
    expect(valueText(value('12', 'days'))).toBe('12 days');
  });

  it('reads a series as points for a line chart, and nothing that is not one', () => {
    const t = trace();
    expect(seriesOf(t.nodes['line.sell_through'])).toEqual([
      { x: 1, y: 3 },
      { x: 2, y: 5 }
    ]);
    expect(seriesOf(t.nodes['line.qty'])).toBeNull();
    expect(seriesOf({ ...t.nodes['line.qty'], evidence: { ...t.nodes['line.qty'].evidence!, series: ['x', { x: 'a' }] } })).toBeNull();
  });
});
