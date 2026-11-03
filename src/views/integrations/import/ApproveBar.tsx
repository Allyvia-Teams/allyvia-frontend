// Approve and import, with the reason it is off written beside it.

import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { BulkDrop } from 'api/importDrops.api';

import { approveReason, canApprove } from './importDrop';

interface Props {
  drop: BulkDrop;
  busy?: boolean;
  onApprove: () => void;
  /** Shown as "Try again" when restaging can help. */
  onRetry?: () => void;
}

export default function ApproveBar({ drop, busy, onApprove, onRetry }: Props) {
  const reason = approveReason(drop);
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'center' } }}>
      <Button variant="contained" disabled={!canApprove(drop) || busy} onClick={onApprove} aria-describedby="approve-reason">
        Approve and import
      </Button>
      {onRetry ? (
        <Button disabled={busy} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
      {reason ? (
        <Typography id="approve-reason" variant="body2" color="text.secondary">
          {reason}
        </Typography>
      ) : null}
    </Stack>
  );
}
