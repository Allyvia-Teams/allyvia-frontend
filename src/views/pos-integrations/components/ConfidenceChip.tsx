// How a column was matched, and how sure we are.
//
// Mirrors views/onboarding/components/ConfidenceBadge so the two import paths
// look and read the same way to a merchant, but keyed on THIS pipeline's
// vocabulary: a preset hit and a synonym hit are different kinds of confident,
// and saying which one is what lets someone decide where to look first.

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';

import type { MappingSource } from 'api/posIntegrations.api';

const SOURCE_LABELS: Record<MappingSource, string> = {
  preset: 'Recognised from this provider’s export format',
  exact: 'Column name matches the field exactly',
  synonym: 'Matched by a known alternative spelling',
  duplicate: 'Another column already fills this field',
  unmapped: 'No match — kept as extra data'
};

interface Props {
  confidence: number;
  source: MappingSource;
}

export default function ConfidenceChip({ confidence, source }: Props) {
  const label = source === 'unmapped' || source === 'duplicate' ? 'Unmapped' : `${Math.round(confidence * 100)}%`;
  const color: 'success' | 'warning' | 'default' =
    source === 'unmapped' || source === 'duplicate' ? 'default' : confidence >= 0.85 ? 'success' : 'warning';

  return (
    <Tooltip title={SOURCE_LABELS[source] ?? source}>
      <Chip size="small" variant="outlined" color={color} label={label} />
    </Tooltip>
  );
}
