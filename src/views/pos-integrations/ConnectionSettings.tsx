// Screen 5 — connection settings.
//
// Mode, sync health, locations, the nightly drift result, and disconnect. The drift panel
// is the one that matters for an ongoing connection: sync fails silently by
// nature, so a screen that only ever says "Connected" would be lying by
// omission on the day it stops working.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import { ENTITY_LABELS } from 'api/posIntegrations.api';
import DailyPullPanel from './components/DailyPullPanel';
import LocationMappingStep from './components/LocationMappingStep';
import {
  DISCONNECTED_MESSAGE,
  snack,
  useConnection,
  useDisconnect,
  useRuns,
  useSyncPolling,
  useUpdateConnection
} from './hooks/usePosIntegrations';
import { disconnectView, finalPullError, shouldPollSync } from './syncStatus';

const RUN_STATUS_LABELS: Record<string, string> = {
  pending: 'Queued',
  extracting: 'Reading',
  validating: 'Checking',
  awaiting_approval: 'Waiting for you',
  committing: 'Importing',
  completed: 'Imported',
  failed: 'Failed',
  cancelled: 'Cancelled'
};

const formatDate = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

export default function ConnectionSettings() {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: connection, isLoading } = useConnection(connectionId);
  const { data: runs } = useRuns(connectionId);
  const updateConnection = useUpdateConnection(connectionId ?? '');
  const disconnect = useDisconnect();

  // A pull or a final pull runs on the worker: follow it until it ends.
  useSyncPolling(connectionId, shouldPollSync(connection));

  // A final pull that finished disconnects the connection on the worker. Once
  // this screen has watched that happen, leave the way a 204 always has; a
  // connection that was already disconnected when opened stays on screen.
  const view = connection ? disconnectView(connection) : 'idle';
  const sawFinalPull = useRef(false);
  useEffect(() => {
    if (view === 'pulling') sawFinalPull.current = true;
    if (view === 'done' && sawFinalPull.current) {
      sawFinalPull.current = false;
      snack(DISCONNECTED_MESSAGE, 'success');
      navigate('/integrations/pos');
    }
  }, [view, navigate]);

  const runDisconnect = async (finalPull: boolean) => {
    if (!connection) return;
    try {
      const result = await disconnect.mutateAsync({ id: connection.id, finalPull });
      setConfirmOpen(false);
      // 204: gone at once. 202: the final pull is running; stay and follow it.
      if (!result) {
        sawFinalPull.current = false;
        navigate('/integrations/pos');
      }
    } catch {
      // The hook has already said why; a 503 leaves the failed state on screen.
      setConfirmOpen(false);
    }
  };

  if (isLoading || !connection) {
    return (
      <MainCard title="Connection settings">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  const drift = connection.latest_drift;
  const supportsOngoing = connection.provider !== 'csv';
  const refusedTopics = Object.keys(connection.webhooks?.errors ?? {});
  const hasLocations = Object.keys(connection.locations ?? {}).length > 0;
  const isConnected = connection.status !== 'disconnected';

  return (
    <MainCard title={connection.provider_label}>
      <Stack spacing={3}>
        {connection.status === 'needs_reauth' && (
          <Alert
            severity="error"
            action={
              <Button size="small" color="inherit" onClick={() => navigate(`/integrations/pos/connect/${connection.provider}`)}>
                Reconnect
              </Button>
            }
          >
            <AlertTitle>Reconnect needed</AlertTitle>
            Allyvia can no longer read from {connection.provider_label}. Nothing is being synced until you reconnect.
          </Alert>
        )}

        {view === 'pulling' && (
          <Alert severity="info" icon={<CircularProgress size={20} />}>
            <AlertTitle>Final pull running</AlertTitle>
            Allyvia is reading {connection.provider_label} one last time. It disconnects as soon as that finishes. You can leave this page.
          </Alert>
        )}

        {view === 'failed' && (
          <Alert severity="error">
            <AlertTitle>The final pull did not finish</AlertTitle>
            <Typography variant="body2" sx={{ mb: 1.5 }}>
              {finalPullError(connection)} {connection.provider_label} is still connected.
            </Typography>
            <Stack direction="row" spacing={1}>
              <Button size="small" variant="contained" color="error" disabled={disconnect.isPending} onClick={() => runDisconnect(true)}>
                Try again
              </Button>
              <Button size="small" color="inherit" disabled={disconnect.isPending} onClick={() => runDisconnect(false)}>
                Disconnect without the final pull
              </Button>
            </Stack>
          </Alert>
        )}

        {connection.status === 'needs_attention' && (
          <Alert severity="warning">
            <AlertTitle>The numbers have drifted</AlertTitle>
            Our nightly check found more of a gap than expected between {connection.provider_label} and Allyvia. See below.
          </Alert>
        )}

        {connection.mode === 'ongoing' && refusedTopics.length > 0 && (
          <Alert severity="warning">
            <AlertTitle>Some changes will not reach Allyvia</AlertTitle>
            {connection.provider_label} refused these updates: {refusedTopics.join(', ')}.{' '}
            {Object.values(connection.webhooks?.errors ?? {}).some((message) => /protected customer data/i.test(message))
              ? 'They contain protected customer data, which the app has not been approved for. Once it is, turn sync off and on again to subscribe.'
              : 'Turn sync off and on again to retry.'}
          </Alert>
        )}

        <Box>
          <Typography variant="h5" gutterBottom>
            How it’s set up
          </Typography>
          <Stack spacing={1.5}>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 140 }}>
                Status
              </Typography>
              <Chip
                size="small"
                variant="outlined"
                label={connection.status.replace(/_/g, ' ')}
                color={connection.status === 'active' ? 'success' : 'default'}
              />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 140 }}>
                Mode
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {connection.mode === 'ongoing' ? 'Keeping in sync' : 'One-time import'}
                {!supportsOngoing && ' — a spreadsheet is a snapshot, so there is nothing to keep in sync.'}
              </Typography>
            </Stack>
            {supportsOngoing && connection.status === 'active' && (
              <FormControlLabel
                control={
                  <Switch
                    checked={connection.mode === 'ongoing'}
                    disabled={updateConnection.isPending}
                    onChange={(event) => updateConnection.mutate({ mode: event.target.checked ? 'ongoing' : 'one_time' })}
                  />
                }
                label={
                  <Stack>
                    <Typography variant="body2">Keep in sync after the import</Typography>
                    <Typography variant="caption" color="text.secondary">
                      New sales, products, customers and stock changes in {connection.provider_label} come across as they happen.
                    </Typography>
                  </Stack>
                }
              />
            )}
            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" sx={{ minWidth: 140 }}>
                Currency
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {connection.default_currency}
              </Typography>
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={connection.auto_commit}
                  disabled={updateConnection.isPending}
                  onChange={(event) => updateConnection.mutate({ auto_commit: event.target.checked })}
                />
              }
              label={
                <Stack>
                  <Typography variant="body2">Import automatically when everything is clean</Typography>
                  <Typography variant="caption" color="text.secondary">
                    Only skips your approval when there is nothing at all to flag — not even a warning.
                  </Typography>
                </Stack>
              }
            />
          </Stack>
        </Box>

        {hasLocations && connection.status !== 'disconnected' && (
          <>
            <Divider />
            <Box>
              <Typography variant="h5" gutterBottom>
                Locations
              </Typography>
              <LocationMappingStep connectionId={connection.id} providerLabel={connection.provider_label} />
            </Box>
          </>
        )}

        {supportsOngoing && isConnected && (
          <>
            <Divider />
            <Box>
              <Typography variant="h5" gutterBottom>
                Daily pull
              </Typography>
              <DailyPullPanel connection={connection} />
            </Box>
          </>
        )}

        <Divider />

        <Box>
          <Typography variant="h5" gutterBottom>
            Nightly check
          </Typography>
          {!drift && (
            <Typography variant="body2" color="text.secondary">
              {connection.mode === 'ongoing'
                ? 'No check has run yet. We compare your old system with Allyvia every night.'
                : 'Only runs for connections kept in sync.'}
            </Typography>
          )}
          {drift && (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Last checked {formatDate(drift.generated_at)}
              </Typography>
              {drift.error ? (
                <Alert severity="error">{drift.error}</Alert>
              ) : (
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell align="right">In {connection.provider_label}</TableCell>
                      <TableCell align="right">In Allyvia</TableCell>
                      <TableCell align="right">Gap</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {Object.entries(drift.entities).map(([entity, row]) => (
                      <TableRow key={entity}>
                        <TableCell>{ENTITY_LABELS[entity] ?? entity}</TableCell>
                        <TableCell align="right">{row.source}</TableCell>
                        <TableCell align="right">{row.allyvia}</TableCell>
                        <TableCell align="right">
                          <Typography component="span" variant="body2" color={row.over_threshold ? 'error.main' : 'text.secondary'}>
                            {(row.divergence * 100).toFixed(2)}%
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Stack>
          )}
        </Box>

        <Divider />

        <Box>
          <Typography variant="h5" gutterBottom>
            Imports
          </Typography>
          {!runs?.length && (
            <Typography variant="body2" color="text.secondary">
              Nothing imported yet.
            </Typography>
          )}
          {!!runs?.length && (
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Started</TableCell>
                  <TableCell>Kind</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" />
                </TableRow>
              </TableHead>
              <TableBody>
                {runs.map((run) => (
                  <TableRow key={run.id} hover>
                    <TableCell>{formatDate(run.started_at ?? run.created_at)}</TableCell>
                    <TableCell>{run.kind}</TableCell>
                    <TableCell>{RUN_STATUS_LABELS[run.status] ?? run.status}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => navigate(`/integrations/pos/runs/${run.id}/report`)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Box>

        <Divider />

        <Stack direction="row" spacing={1}>
          <Button variant="contained" onClick={() => navigate(`/integrations/pos/connect/${connection.provider}`)}>
            Import more data
          </Button>
          <Button
            color="error"
            onClick={() => setConfirmOpen(true)}
            disabled={disconnect.isPending || !isConnected || view === 'pulling' || view === 'failed'}
          >
            Disconnect
          </Button>
          <Button onClick={() => navigate('/integrations/pos')}>Back</Button>
        </Stack>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Disconnect {connection.provider_label}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {supportsOngoing
              ? `Allyvia pulls from ${connection.provider_label} one last time, then disconnects. Everything imported stays in Allyvia and becomes editable and sellable here. Nothing is deleted.`
              : `Everything imported stays in Allyvia. Nothing is deleted.`}{' '}
            If you reconnect later, we’ll recognise what was already imported instead of duplicating it.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Keep it</Button>
          <Button color="error" disabled={disconnect.isPending} onClick={() => runDisconnect(true)}>
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
