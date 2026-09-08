// Screen 3 — migration progress.
//
// Polls the run and shows per-entity counts while the server works. The
// important thing this screen says, repeatedly, is that nothing has been
// written yet: a progress bar naturally reads as "it's happening", and at this
// stage it isn't.

import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import type { RunStatus } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';
import { isRunActive, useCancelRun, useRunPolling } from './hooks/usePosIntegrations';

const STATUS_TEXT: Record<RunStatus, string> = {
  pending: 'Queued.',
  extracting: 'Reading your files…',
  validating: 'Checking every record…',
  awaiting_approval: 'Ready for you to review.',
  committing: 'Importing into Allyvia…',
  completed: 'Done.',
  failed: 'Something went wrong.',
  cancelled: 'Cancelled.'
};

const ENTITY_ORDER = ['customer', 'product', 'variant', 'inventory_level', 'order'];

export default function MigrationProgress() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const { data: run, isLoading } = useRunPolling(runId);
  const cancelRun = useCancelRun(runId ?? '');

  // As soon as there is something to review, take them to it. Leaving a
  // finished run sitting on a progress screen is how a merchant concludes the
  // import is stuck.
  useEffect(() => {
    if (run?.status === 'awaiting_approval' && runId) {
      navigate(`/integrations/pos/runs/${runId}/report`, { replace: true });
    }
  }, [run?.status, runId, navigate]);

  if (isLoading || !run) {
    return (
      <MainCard title="Reading your data">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  const active = isRunActive(run.status);
  const rows = ENTITY_ORDER.filter((entity) => run.progress?.[entity]).map((entity) => ({
    entity,
    ...run.progress[entity]
  }));

  return (
    <MainCard title="Reading your data">
      <Stack spacing={3}>
        <Box>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
            <Typography variant="h4">{STATUS_TEXT[run.status]}</Typography>
            {active && (
              <Button size="small" color="inherit" onClick={() => cancelRun.mutate()} disabled={cancelRun.isPending}>
                Cancel
              </Button>
            )}
          </Stack>
          {active && <LinearProgress />}
        </Box>

        {active && (
          <Alert severity="info">
            Nothing has been written to Allyvia yet. We’re reading and checking your files first, and you’ll get a summary to approve before
            anything is imported.
          </Alert>
        )}

        {run.status === 'failed' && (
          <Alert severity="error">
            <AlertTitle>This import stopped</AlertTitle>
            {run.error?.message || 'An unexpected error occurred.'}
          </Alert>
        )}

        {run.status === 'cancelled' && <Alert severity="info">Cancelled. Nothing was written to Allyvia.</Alert>}

        {rows.length > 0 && (
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Data</TableCell>
                  <TableCell align="right">Read</TableCell>
                  <TableCell align="right">Checked</TableCell>
                  <TableCell align="right">Problems</TableCell>
                  <TableCell align="right">Imported</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.entity}>
                    <TableCell>{ENTITY_LABELS[row.entity] ?? row.entity}</TableCell>
                    <TableCell align="right">{row.staged ?? row.extracted ?? 0}</TableCell>
                    <TableCell align="right">{row.valid ?? '—'}</TableCell>
                    <TableCell align="right">{row.invalid ?? '—'}</TableCell>
                    <TableCell align="right">{row.committed ?? '—'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Stack direction="row" spacing={1}>
          {!active && run.status !== 'cancelled' && (
            <Button variant="contained" onClick={() => navigate(`/integrations/pos/runs/${run.id}/report`)}>
              See the summary
            </Button>
          )}
          <Button onClick={() => navigate('/integrations/pos')}>Back to integrations</Button>
        </Stack>
      </Stack>
    </MainCard>
  );
}
