import { beforeEach, describe, expect, it, vi } from 'vitest';

const list = vi.fn();
const rationale = vi.fn();
const submitFeedback = vi.fn();
const dismiss = vi.fn();

// The real module pulls in utils/axios, which dies under vitest. The adapter
// imports it lazily, so this mock is only reached by the live-mode tests.
vi.mock('api/agent.api', () => ({
  AgentAPI: { Recommendations: { list, rationale, submitFeedback, dismiss } }
}));

import { countByCategory, dismissInsight, getInsightDetail, getInsights, InsightsDisabledError, sortByImpact } from './adapter';
import { getInsightsMode } from './flag';
import { INSIGHTS_MOCK } from './mock/insights.mock';

beforeEach(() => {
  list.mockReset();
  rationale.mockReset();
  submitFeedback.mockReset();
  dismiss.mockReset();
});

describe('insights mock', () => {
  it('has the five design-reference recommendations with their fact counts', () => {
    const recs = INSIGHTS_MOCK.recommendations;
    expect(recs.map((r) => r.id)).toEqual([
      'rec-mara-reorder',
      'rec-saturday-shift',
      'rec-linen-markdown',
      'rec-inner-circle-invite',
      'rec-spring-deposit'
    ]);
    expect(recs.map((r) => r.facts.length)).toEqual([6, 5, 5, 4, 5]);
  });

  it('has a signalCount matching each card’s fact count and four rationale steps', () => {
    for (const rec of INSIGHTS_MOCK.recommendations) {
      expect(rec.signalCount).toBe(rec.facts.length);
      expect(rec.rationale.steps).toHaveLength(4);
    }
  });

  it('carries the payload header', () => {
    expect(INSIGHTS_MOCK.storeName).toBe('Juniper & Rye');
    expect(INSIGHTS_MOCK.mode).toBe('save');
    expect(INSIGHTS_MOCK.refreshedAt).toBe('today at 7:02 AM');
  });
});

describe('sortByImpact', () => {
  it('orders by impact amount, largest first', () => {
    expect(sortByImpact(INSIGHTS_MOCK.recommendations).map((r) => r.id)).toEqual([
      'rec-spring-deposit',
      'rec-linen-markdown',
      'rec-inner-circle-invite',
      'rec-mara-reorder',
      'rec-saturday-shift'
    ]);
  });

  it('does not reorder its input', () => {
    const before = INSIGHTS_MOCK.recommendations.map((r) => r.id);
    sortByImpact(INSIGHTS_MOCK.recommendations);
    expect(INSIGHTS_MOCK.recommendations.map((r) => r.id)).toEqual(before);
  });
});

describe('countByCategory', () => {
  it('counts one of each category in the mock', () => {
    expect(countByCategory(INSIGHTS_MOCK.recommendations)).toEqual({ inventory: 1, pricing: 1, staffing: 1, inner_circle: 1, cash: 1 });
  });

  it('reports every category, zero when empty', () => {
    expect(countByCategory([])).toEqual({ inventory: 0, pricing: 0, staffing: 0, inner_circle: 0, cash: 0 });
  });
});

describe('getInsightsMode', () => {
  it('uses the env value when it is one of the three modes', () => {
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: 'off', DEV: true })).toBe('off');
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: 'mock', DEV: false })).toBe('mock');
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: 'live', DEV: false })).toBe('live');
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: ' LIVE ', DEV: false })).toBe('live');
  });

  it('defaults to mock under vite dev and off otherwise', () => {
    expect(getInsightsMode({ DEV: true })).toBe('mock');
    expect(getInsightsMode({ DEV: false })).toBe('off');
    expect(getInsightsMode({})).toBe('off');
  });

  it('treats an unknown value as unset', () => {
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: 'true', DEV: true })).toBe('mock');
    expect(getInsightsMode({ VITE_INSIGHTS_REDESIGN: 'on', DEV: false })).toBe('off');
  });
});

describe('getInsights', () => {
  it('returns a copy of the mock in mock mode, without a network call', async () => {
    const payload = await getInsights({ mode: 'mock', mockDelayMs: 0 });
    expect(payload).toEqual(INSIGHTS_MOCK);
    expect(payload).not.toBe(INSIGHTS_MOCK);
    payload.recommendations.pop();
    expect(INSIGHTS_MOCK.recommendations).toHaveLength(5);
    expect(list).not.toHaveBeenCalled();
  });

  it('throws InsightsDisabledError when off', async () => {
    await expect(getInsights({ mode: 'off' })).rejects.toBeInstanceOf(InsightsDisabledError);
  });

  it('maps the pending list in live mode, keeping backend order', async () => {
    list.mockResolvedValue({
      recommendations: [
        {
          id: 'p1',
          recommendation_id: 'r1',
          generated_at: '2026-11-06T12:02:00Z',
          expires_at: '2026-11-08T00:00:00Z',
          displayed_at: null,
          dismissed_at: null,
          recommendation_text: 'Reorder the wool socks. You sell out by Friday.',
          urgency_score: 0.8,
          impact_score: 0.6,
          confidence_score: 0.6,
          predicted_impact_dollars: '120.40',
          signal_sources: {},
          rec_type: 'reorder',
          driving_signals: ['sales_trend', 'inventory_status']
        },
        {
          id: 'p2',
          recommendation_id: 'r2',
          generated_at: '2026-11-06T11:00:00Z',
          expires_at: '2026-11-08T00:00:00Z',
          displayed_at: null,
          dismissed_at: null,
          recommendation_text: 'Move the deposit.',
          urgency_score: 0.5,
          impact_score: 0.9,
          confidence_score: 0.9,
          predicted_impact_dollars: '900.00',
          signal_sources: {},
          sector: 'finance'
        }
      ],
      alerts: [],
      ongoing: []
    });
    const payload = await getInsights({ mode: 'live' });
    expect(list).toHaveBeenCalledWith();
    expect(payload.recommendations.map((r) => r.id)).toEqual(['p1', 'p2']);
    const [first, second] = payload.recommendations;
    expect(first).toMatchObject({
      category: 'inventory',
      title: 'Reorder the wool socks.',
      summary: 'You sell out by Friday.',
      confidence: 'medium',
      impact: { amount: 120, label: 'estimated impact', signed: true },
      primaryAction: { label: 'Review', kind: 'purchase_order' },
      signalCount: 2
    });
    expect(second).toMatchObject({ category: 'cash', confidence: 'high', primaryAction: { kind: 'payment' } });
  });
});

describe('getInsightDetail', () => {
  it('returns the fixture rationale in mock mode', async () => {
    const detail = await getInsightDetail('rec-spring-deposit', { mode: 'mock' });
    expect(detail.facts).toHaveLength(5);
    expect(detail.rationale.steps[0]).toBe('Projected cash day by day through the end of November');
  });

  it('maps the rationale endpoint in live mode', async () => {
    rationale.mockResolvedValue({
      recommendation_id: 'r1',
      rec_type: 'reorder',
      engine_version: 'x',
      generated_at: null,
      summary: { text: 'Socks are selling fast.', source: 'llm' },
      signals: [
        { key: 'sales_trend', source: 'pos', cited: true, facts: { units_last_7_days: 14, trend: 'up' } },
        { key: 'weather', source: 'weather', cited: false, facts: { low_f: 28 } },
        { key: 'supplier_risk', source: 'po', cited: true, abstained: true, facts: { x: 1 } }
      ],
      ground_truth: [{ metric: 'weekly_units', baseline_value: '6', baseline_window_days: 56, method: null, source: 'inventory_status' }],
      expected_value: null,
      learned_facts: [],
      computation: null
    });
    const detail = await getInsightDetail('p1', { mode: 'live' });
    expect(rationale).toHaveBeenCalledWith('p1');
    expect(detail.rationale).toEqual({ narrative: 'Socks are selling fast.', steps: [] });
    expect(detail.signalCount).toBe(1);
    expect(detail.facts).toEqual([
      { source: 'sales_history', label: 'Units Last 7 Days', value: '14', sub: 'Sales Trend' },
      { source: 'sales_history', label: 'Trend', value: 'up', sub: 'Sales Trend' },
      { source: 'inventory', label: 'Weekly Units', value: '6', sub: '56-day baseline' }
    ]);
  });
});

describe('dismissInsight', () => {
  it('makes no request in mock mode and logs the call with its reason', async () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    await dismissInsight('rec-mara-reorder', 'not_relevant', { mode: 'mock' });
    expect(submitFeedback).not.toHaveBeenCalled();
    expect(dismiss).not.toHaveBeenCalled();
    expect(info).toHaveBeenCalledWith('[insights-redesign] dismissInsight(rec-mara-reorder, "not_relevant") (mock: no request)');
    info.mockRestore();
  });

  it('sends a thumbs-down with a reason code in live mode, never the bare dismiss', async () => {
    await dismissInsight('p1', 'already_doing_it', { mode: 'live' });
    expect(submitFeedback).toHaveBeenCalledWith('p1', { sentiment: 'down', reasonCode: 'already_doing_it', reasonText: undefined });
    expect(dismiss).not.toHaveBeenCalled();
  });

  it('sends free text as reason_text, and no reason at all when none is given', async () => {
    await dismissInsight('p1', 'We stopped carrying it', { mode: 'live' });
    expect(submitFeedback).toHaveBeenLastCalledWith('p1', {
      sentiment: 'down',
      reasonCode: undefined,
      reasonText: 'We stopped carrying it'
    });
    await dismissInsight('p2', undefined, { mode: 'live' });
    expect(submitFeedback).toHaveBeenLastCalledWith('p2', { sentiment: 'down', reasonCode: undefined, reasonText: undefined });
  });
});
