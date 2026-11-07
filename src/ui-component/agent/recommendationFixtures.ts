// Test fixtures for the shared recommendation row and its surfaces.
import type { PendingRecommendation } from 'api/agent.api';

export const pendingRec = (overrides: Partial<PendingRecommendation> = {}): PendingRecommendation => ({
  id: 'pending-1',
  recommendation_id: 'rec-1',
  generated_at: '2026-11-06T06:00:00Z',
  expires_at: '2026-11-07T06:00:00Z',
  displayed_at: null,
  dismissed_at: null,
  recommendation_text: 'Reorder the linen shirt. It runs out on Friday at current sales.',
  urgency_score: 0.9,
  impact_score: 0.6,
  confidence_score: 0.7,
  predicted_impact_dollars: null,
  signal_sources: {},
  rec_type: 'reorder',
  driving_signals: [],
  ...overrides
});
