// The ✓ / ⚠ / ✗ used on every reconciliation row.
//
// Three states and no more. A merchant reading this table is deciding whether
// to trust a number; a fourth shade of "probably fine" would only make that
// decision harder.

import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

import type { CheckStatus } from 'api/posIntegrations.api';

const CONFIG: Record<CheckStatus, { label: string; color: 'success' | 'warning' | 'error'; Icon: typeof CheckCircleOutlineIcon }> = {
  ok: { label: 'Matches', color: 'success', Icon: CheckCircleOutlineIcon },
  warn: { label: 'Check this', color: 'warning', Icon: WarningAmberIcon },
  blocker: { label: 'Must be fixed', color: 'error', Icon: ErrorOutlineIcon }
};

interface Props {
  status: CheckStatus;
  note?: string;
  compact?: boolean;
}

export default function StatusChip({ status, note, compact }: Props) {
  const config = CONFIG[status] ?? CONFIG.warn;
  const { Icon } = config;
  const chip = (
    <Chip
      size="small"
      variant="outlined"
      color={config.color}
      icon={<Icon fontSize="small" />}
      label={compact ? undefined : config.label}
      sx={compact ? { '& .MuiChip-label': { display: 'none' }, pl: 0.75 } : undefined}
    />
  );
  return note ? (
    <Tooltip title={note}>
      <span>{chip}</span>
    </Tooltip>
  ) : (
    chip
  );
}
