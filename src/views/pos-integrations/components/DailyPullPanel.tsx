// The daily pull, on the connection settings screen.
//
// While a merchant runs both systems side by side, Allyvia reads the old one
// once a day. This says when it last did, how that went, and what came across,
// and lets the merchant ask for a pull now instead of waiting for tomorrow.

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { PosConnection } from 'api/posIntegrations.api';
import { usePullNow } from '../hooks/usePosIntegrations';
import { committedSummary, lastPullDetail, lastPullLine, pullNowBlocker, relativeTime } from '../syncStatus';

export default function DailyPullPanel({ connection }: { connection: PosConnection }) {
  const pullNow = usePullNow(connection.id);
  const sync = connection.sync;
  const last = sync?.last_pull ?? null;
  const line = lastPullLine(sync);
  const detail = lastPullDetail(sync);
  const blocker = pullNowBlocker(connection);
  const pulling = !!sync?.pull_requested_at;
  const lastSuccess = relativeTime(sync?.last_successful_pull_at);

  return (
    <Stack spacing={1.5}>
      {connection.mode !== 'ongoing' ? (
        <Typography variant="body2" color="text.secondary">
          Only runs for connections kept in sync. Turn on keep in sync above and Allyvia reads {connection.provider_label} once a day.
        </Typography>
      ) : !line ? (
        <Typography variant="body2" color="text.secondary">
          No pull has run yet. Allyvia reads {connection.provider_label} once a day and brings across anything new.
        </Typography>
      ) : (
        <Stack spacing={0.5}>
          <Typography variant="body2">{line}</Typography>
          {last?.status === 'succeeded' && (
            <Typography variant="body2" color="text.secondary">
              Brought across: {committedSummary(last.committed)}.
            </Typography>
          )}
          {!!last?.held && (
            <Typography variant="body2" color="text.secondary">
              {last.held} {last.held === 1 ? 'row is' : 'rows are'} waiting for a store. Choose one under Locations.
            </Typography>
          )}
          {detail && <Alert severity={last?.status === 'failed' ? 'error' : 'info'}>{detail}</Alert>}
          {last?.status !== 'succeeded' && (
            <Typography variant="caption" color="text.secondary">
              {lastSuccess ? `Last successful pull: ${lastSuccess}` : 'No pull has succeeded yet.'}
            </Typography>
          )}
        </Stack>
      )}

      <Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="outlined" size="small" onClick={() => pullNow.mutate()} disabled={!!blocker || pullNow.isPending}>
            Pull now
          </Button>
          {(pulling || pullNow.isPending) && <CircularProgress size={18} />}
          {blocker && connection.mode === 'ongoing' && (
            <Typography variant="caption" color="text.secondary">
              {blocker}
            </Typography>
          )}
        </Stack>
      </Box>
    </Stack>
  );
}
