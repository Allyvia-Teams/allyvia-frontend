// Development-only preview. Sample data, no authenticated API or mutation calls.
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { RecommendationCard } from './RecommendationCard';
import type { RecommendationsState } from './useRecommendations';
import type { PendingRecommendation } from 'api/agent.api';

const examples = [
  [
    'Reorder your bestselling candles before the weekend.',
    'Only 8 remain, and you sold 23 last week. At the current pace, stock could run out before your next delivery. Review your supplier lead time and order enough to cover the weekend.',
    'reorder',
    0.95,
    '276'
  ],
  [
    'Review Friday evening’s staffing.',
    'Expected demand is higher than the coverage on your current roster. Your last three Fridays were busiest between 4 and 7 pm. Consider moving one shift into that window.',
    'staffing',
    0.82,
    null
  ],
  [
    'Follow up on your delayed supplier delivery.',
    'The delivery is two days late and includes items running low. Confirm a revised arrival date before placing a replacement order.',
    'supplier',
    0.74,
    null
  ],
  [
    'Review slow-moving seasonal stock.',
    'Several seasonal items have not sold in the last two weeks. Check whether a display change could help before considering a markdown.',
    'overstock',
    0.45,
    '124'
  ],
  [
    'Plan next week’s customer follow-up.',
    'A small group of regular customers has not returned recently. Review their purchase history before choosing a relevant offer.',
    'other',
    0.3,
    null
  ]
] as const;
const recommendations: PendingRecommendation[] = examples.map(([title, body, type, urgency, impact], index) => ({
  id: `preview-${index}`,
  recommendation_id: `preview-${index}`,
  generated_at: '2026-11-04T08:00:00Z',
  expires_at: '2026-11-11T08:00:00Z',
  displayed_at: null,
  dismissed_at: null,
  recommendation_text: `${title} ${body}`,
  rec_type: type,
  urgency_score: urgency,
  impact_score: 0.7,
  confidence_score: 0.86,
  predicted_impact_dollars: impact,
  impact_source: 'llm_estimate',
  signal_sources: {},
  driving_signals: []
}));
const state = { recommendations, isLoading: false, isError: false, working: false } as RecommendationsState;
export default function DashboardPreview() {
  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default', p: { xs: 2, md: 4 } }}>
      <Box sx={{ maxWidth: 1050, mx: 'auto' }}>
        <Typography variant="overline" color="text.secondary">
          Local preview · sample data
        </Typography>
        <Typography variant="h2" sx={{ mt: 1, mb: 1 }}>
          Dashboard
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Review the simplified recommendations. Open “View reasoning” or “View all recommendations” to explore.
        </Typography>
        <RecommendationCard state={state} preview />
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 2 }}>
          Preview only. Account actions and feedback submission are disabled.
        </Typography>
      </Box>
    </Box>
  );
}
