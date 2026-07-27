import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

// ChipState pattern lifted from ui-component/settings/Integrations.tsx.
export type ChipState = 'connected' | 'disconnected' | 'coming-soon' | 'loading' | 'unknown';

const chipFor = (state: ChipState) => {
  switch (state) {
    case 'connected':
      return <Chip size="small" label="Connected" color="success" variant="outlined" />;
    case 'disconnected':
      return <Chip size="small" label="Not connected" variant="outlined" />;
    case 'coming-soon':
      return <Chip size="small" label="Coming soon" variant="outlined" />;
    case 'loading':
      return <Skeleton variant="rounded" width={100} height={22} />;
    default:
      return <Chip size="small" label="Unknown" variant="outlined" />;
  }
};

export interface SourceCardProps {
  name: string;
  description: string;
  state: ChipState;
  primaryLabel: string;
  onPrimary?: () => void;
  disabled?: boolean;
  // Phase 5: "Import data" secondary action + a per-card import status line.
  secondaryLabel?: string;
  onSecondary?: () => void;
  secondaryBusy?: boolean;
  statusLine?: ReactNode;
}

export default function SourceCard({
  name,
  description,
  state,
  primaryLabel,
  onPrimary,
  disabled,
  secondaryLabel,
  onSecondary,
  secondaryBusy,
  statusLine
}: SourceCardProps) {
  return (
    <Box
      sx={{
        p: 2,
        height: '100%',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
        gap: 1
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {name}
        </Typography>
        {chipFor(state)}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
        {description}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Tooltip title={state === 'coming-soon' ? 'Coming soon — not yet available' : ''}>
          <span>
            <Button
              size="small"
              variant={state === 'connected' ? 'outlined' : 'contained'}
              onClick={onPrimary}
              disabled={disabled || state === 'loading'}
              sx={disabled ? { cursor: 'not-allowed' } : undefined}
            >
              {primaryLabel}
            </Button>
          </span>
        </Tooltip>
        {secondaryLabel && (
          <Button
            size="small"
            variant="contained"
            onClick={onSecondary}
            disabled={secondaryBusy || state === 'loading'}
            startIcon={secondaryBusy ? <CircularProgress size={14} color="inherit" /> : undefined}
          >
            {secondaryLabel}
          </Button>
        )}
      </Stack>
      {statusLine && <Box>{statusLine}</Box>}
    </Box>
  );
}
