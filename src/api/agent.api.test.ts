import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot be imported under vitest's node environment — it pulls in
// utils/mockApi.ts, which reads localStorage at module load. A factory mock
// replaces the module outright so the real one is never evaluated, which is
// what lets the transport layer itself be tested rather than only the pure
// payload builder.
const post = vi.fn();
const get = vi.fn();

vi.mock('utils/axios', () => ({
  default: { post: (...args: unknown[]) => post(...args), get: (...args: unknown[]) => get(...args) }
}));

import { AgentAPI } from './agent.api';

beforeEach(() => {
  post.mockReset();
  get.mockReset();
  post.mockResolvedValue({ data: { status: 'recorded' } });
  get.mockResolvedValue({ data: {} });
});

describe('AgentAPI.Recommendations.submitFeedback', () => {
  it('posts to the per-recommendation feedback endpoint', async () => {
    await AgentAPI.Recommendations.submitFeedback('rec-1', { sentiment: 'up' });

    const [url, body] = post.mock.calls[0];
    expect(url).toBe('/agent/recommendations/rec-1/feedback/');
    expect(body).toEqual({ sentiment: 'up' });
  });

  it('sends the chosen chip as reason_code', async () => {
    await AgentAPI.Recommendations.submitFeedback('rec-2', {
      sentiment: 'down',
      reasonCode: 'cash_flow_timing'
    });

    expect(post.mock.calls[0][1]).toEqual({ sentiment: 'down', reason_code: 'cash_flow_timing' });
  });

  it('sends a bare down when the chips are skipped', async () => {
    // The backend records this as `other`; we must not send `other` ourselves.
    await AgentAPI.Recommendations.submitFeedback('rec-3', { sentiment: 'down' });

    expect(post.mock.calls[0][1]).toEqual({ sentiment: 'down' });
  });

  it('carries the optional free text alongside the chip', async () => {
    await AgentAPI.Recommendations.submitFeedback('rec-4', {
      sentiment: 'down',
      reasonCode: 'data_looks_wrong',
      reasonText: '  our count says 40  '
    });

    expect(post.mock.calls[0][1]).toEqual({
      sentiment: 'down',
      reason_code: 'data_looks_wrong',
      reason_text: 'our count says 40'
    });
  });

  it('returns the idempotency status so a repeat tap is distinguishable', async () => {
    post.mockResolvedValueOnce({ data: { status: 'unchanged' } });

    const result = await AgentAPI.Recommendations.submitFeedback('rec-5', { sentiment: 'up' });
    expect(result.status).toBe('unchanged');
  });

  it('re-posting the same sentiment is a plain repeat, not a special case', async () => {
    // The endpoint is idempotent per (pending, sentiment), so the client has
    // nothing to guard — this documents that we genuinely just send it again.
    await AgentAPI.Recommendations.submitFeedback('rec-6', { sentiment: 'down', reasonCode: 'too_risky' });
    await AgentAPI.Recommendations.submitFeedback('rec-6', { sentiment: 'down', reasonCode: 'too_risky' });

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[0]).toEqual(post.mock.calls[1]);
  });

  it('un-dismisses via a plain up on the same recommendation', async () => {
    await AgentAPI.Recommendations.submitFeedback('rec-7', { sentiment: 'down', reasonCode: 'not_relevant' });
    await AgentAPI.Recommendations.submitFeedback('rec-7', { sentiment: 'up' });

    expect(post.mock.calls[1][0]).toBe('/agent/recommendations/rec-7/feedback/');
    expect(post.mock.calls[1][1]).toEqual({ sentiment: 'up' });
  });
});

describe('AgentAPI.Recommendations.snooze', () => {
  it('posts the day count to the snooze endpoint', async () => {
    await AgentAPI.Recommendations.snooze('rec-8', 7);

    expect(post.mock.calls[0][0]).toBe('/agent/recommendations/rec-8/snooze/');
    expect(post.mock.calls[0][1]).toEqual({ days: 7 });
  });

  it('clamps out-of-range days rather than letting the server 400', async () => {
    await AgentAPI.Recommendations.snooze('rec-9', 90);
    expect(post.mock.calls[0][1]).toEqual({ days: 30 });

    await AgentAPI.Recommendations.snooze('rec-9', 0);
    expect(post.mock.calls[1][1]).toEqual({ days: 1 });
  });
});

describe('AgentAPI.Savings.getSavings', () => {
  it('reads the savings endpoint', async () => {
    get.mockResolvedValueOnce({
      data: { realized_total_dollars: 1420, by_type: { reorder: 900, staffing: 520 }, window: 'ytd', recommendation_count: 3 }
    });

    const savings = await AgentAPI.Savings.getSavings();

    expect(get).toHaveBeenCalledWith('/agent/savings/');
    expect(savings.realized_total_dollars).toBe(1420);
    expect(savings.by_type).toEqual({ reorder: 900, staffing: 520 });
    expect(savings.window).toBe('ytd');
    expect(savings.recommendation_count).toBe(3);
  });
});

describe('AgentAPI.Feedback.isDue', () => {
  it('carries the verified-result anchor when there is one', async () => {
    get.mockResolvedValueOnce({
      data: { due: true, anchor: { rec_id: 'rec-1', dollar_value: 320, metric: 'stockouts avoided', window: 'last 30 days' } }
    });

    const due = await AgentAPI.Feedback.isDue();

    expect(get).toHaveBeenCalledWith('/agent/feedback/');
    expect(due.due).toBe(true);
    expect(due.anchor?.dollar_value).toBe(320);
    expect(due.anchor?.metric).toBe('stockouts avoided');
  });

  it('tolerates a null anchor', async () => {
    get.mockResolvedValueOnce({ data: { due: true, anchor: null } });

    const due = await AgentAPI.Feedback.isDue();
    expect(due.anchor).toBeNull();
  });
});
