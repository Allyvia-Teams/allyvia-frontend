import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationsState } from './useRecommendations';
vi.mock('./RecommendationFeedback', () => ({
  useRecommendationFeedback: () => ({ hidden: false, dimmed: false }),
  FeedbackControls: () => <button>Feedback controls</button>,
  BackFromSnoozeHint: () => null,
  ReasonChips: () => null
}));
vi.mock('./FeedbackBanner', () => ({ FeedbackBanner: () => <div>Weekly feedback</div> }));
const state = {
  recommendations: [0.1, 0.9, 0.4, 0.8, 0.7].map((urgency, id) => ({
    id: String(id),
    recommendation_text: `Action ${id}. Reason ${id}. More supporting detail.`,
    urgency_score: urgency,
    confidence_score: 0.8,
    predicted_impact_dollars: '276',
    impact_source: 'llm_estimate'
  })),
  isLoading: false,
  isError: false,
  working: false
} as RecommendationsState;
describe('dashboard priorities', () => {
  it('shows only the three most urgent items, in order, with access to the rest', () => {
    const html = renderToStaticMarkup(<RecommendationCard state={state} />);
    expect(html).toContain('Top priorities');
    expect(html).not.toContain('Action 0');
    expect(html).not.toContain('Action 2');
    expect(html.indexOf('Action 1')).toBeLessThan(html.indexOf('Action 3'));
    expect(html.indexOf('Action 3')).toBeLessThan(html.indexOf('Action 4'));
    expect(html).toContain('View all recommendations');
    expect(html).toContain('Weekly feedback');
  });
  it('keeps reasoning and controls in initially closed native disclosures', () => {
    const html = renderToStaticMarkup(<RecommendationCard state={state} />);
    expect(html.match(/<details/g)).toHaveLength(3);
    expect(html).not.toMatch(/<details[^>]* open/);
    expect(html).toContain('View reasoning');
    const disclosures = html.match(/<details[\s\S]*?<\/details>/g)!;
    for (const disclosure of disclosures) {
      expect(disclosure).toContain('Feedback controls');
      expect(disclosure).not.toContain('Confidence 80%');
      expect(disclosure).not.toContain('Model estimate');
    }
    const visible = html.replace(/<details[\s\S]*?<\/details>/g, '');
    expect(visible).toContain('Confidence 80%');
    expect(visible).toContain('High urgency');
    expect(visible).toContain('+$276');
    expect(visible).toContain('Model estimate');
  });
});
