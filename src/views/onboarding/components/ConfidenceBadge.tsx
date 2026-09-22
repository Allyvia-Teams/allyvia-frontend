import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { MappingSource } from 'api/onboarding.api';
import { confidenceBand, type ConfidenceBand } from '../mapping';

// 4-state confidence chip. The fourth state matters: confidence === null is
// the degraded deterministic-only path — "Needs review", not a low score.
const CONFIG: Record<ConfidenceBand, { label: string; color: 'success' | 'warning' | 'error' | 'default' }> = {
  high: { label: 'High', color: 'success' }, // ≥ 0.9 (exact alias = 1.0, strong fuzzy ≤ 0.95)
  medium: { label: 'Medium', color: 'warning' }, // 0.6–0.9
  low: { label: 'Low', color: 'error' }, // < 0.6 (Gemini gate-capped 0.5 lands here)
  review: { label: 'Needs review', color: 'default' } // confidence === null
};

const SOURCE_LABELS: Record<MappingSource, string> = {
  deterministic: 'Matched by name',
  gemini: 'Suggested by AI',
  memory: 'From a previous upload',
  manual: 'Set manually'
};

interface ConfidenceBadgeProps {
  confidence: number | null | undefined;
  source?: MappingSource;
}

export default function ConfidenceBadge({ confidence, source }: ConfidenceBadgeProps) {
  const band = confidenceBand(confidence);
  const config = CONFIG[band];
  const parts: string[] = [];
  if (source) parts.push(SOURCE_LABELS[source] ?? source);
  if (confidence !== null && confidence !== undefined) parts.push(`Confidence ${Math.round(confidence * 100)}%`);
  const tooltip = parts.join(' · ');

  const chip = <Chip size="small" variant="outlined" color={config.color} label={config.label} />;
  if (!tooltip) return chip;
  return (
    <Tooltip title={tooltip}>
      <span>{chip}</span>
    </Tooltip>
  );
}
