// Screen 4 — the reconciliation report, and the Approve gate.
//
// This is the screen the whole pipeline exists to produce. Its job is to let a
// merchant answer one question honestly: "did my data come across?" So the
// numbers come first, the caveats are stated rather than buried, and Approve
// is disabled with its reasons visible whenever a blocker stands.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import DuplicateResolver from './components/DuplicateResolver';
import IssueList from './components/IssueList';
import SampleAuditDrawer from './components/SampleAuditDrawer';
import { GrossSalesTable, InventoryTable, MonthlySalesTable, PostCommitTable, TotalsTable } from './components/ReportTables';
import { useApproveRun, useReport, useResolveDuplicates, useRunPolling, useSkipInvalid } from './hooks/usePosIntegrations';

export default function ReconciliationReport() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: run } = useRunPolling(runId);
  const { data: report, isLoading } = useReport(runId);
  const approveRun = useApproveRun(runId ?? '');
  const resolveDuplicates = useResolveDuplicates(runId ?? '');
  const skipInvalid = useSkipInvalid(runId ?? '');

  if (isLoading || !report) {
    return (
      <MainCard title="Import summary">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  const status = run?.status;
  const awaiting = status === 'awaiting_approval';
  const committing = status === 'committing';
  const completed = status === 'completed';
  const invalidTotal = report.totals.reduce((sum, row) => sum + (row.invalid ?? 0), 0);

  return (
    <MainCard title={completed ? 'Import complete' : 'Import summary'}>
      <Stack spacing={3}>
        {completed && report.post_commit?.ok && (
          <Alert severity="success">
            <AlertTitle>Your data is in Allyvia</AlertTitle>
            Everything below was imported and verified.
          </Alert>
        )}

        {committing && (
          <Alert severity="info">
            <AlertTitle>Importing now</AlertTitle>
            This can take a few minutes for a long sales history. You can leave this page — it will keep going.
          </Alert>
        )}

        {status === 'failed' && (
          <Alert severity="error">
            <AlertTitle>This import stopped</AlertTitle>
            {run?.error?.message || 'An unexpected error occurred.'}
          </Alert>
        )}

        {awaiting && !report.can_approve && (
          <Alert severity="error">
            <AlertTitle>
              {report.blocker_count} thing{report.blocker_count === 1 ? '' : 's'} to sort out first
            </AlertTitle>
            <Typography variant="body2" gutterBottom>
              We won’t import anything while these stand — they’re the cases where importing would give you data you can’t trust.
            </Typography>
            {invalidTotal > 0 && (
              <Button
                size="small"
                variant="outlined"
                color="inherit"
                disabled={skipInvalid.isPending}
                onClick={() => skipInvalid.mutate(undefined)}
              >
                Leave the {invalidTotal} problem record{invalidTotal === 1 ? '' : 's'} out and continue
              </Button>
            )}
          </Alert>
        )}

        {awaiting && report.can_approve && (
          <Alert severity={report.warning_count ? 'warning' : 'success'}>
            <AlertTitle>Ready to import</AlertTitle>
            {report.warning_count
              ? `Everything checks out, with ${report.warning_count} thing${report.warning_count === 1 ? '' : 's'} worth a look below.`
              : 'Everything checks out.'}
          </Alert>
        )}

        {report.notes.map((note) => (
          <Alert key={note} severity="info" variant="outlined">
            {note}
          </Alert>
        ))}

        <TotalsTable rows={report.totals} />
        <GrossSalesTable rows={report.gross_sales} />
        <MonthlySalesTable rows={report.monthly_sales} />
        <InventoryTable rows={report.inventory} />

        {report.post_commit && <PostCommitTable section={report.post_commit} />}

        {awaiting && report.duplicates.length > 0 && (
          <>
            <Divider />
            <DuplicateResolver
              groups={report.duplicates}
              disabled={!awaiting}
              saving={resolveDuplicates.isPending}
              onSave={(decisions) => resolveDuplicates.mutate(decisions)}
            />
          </>
        )}

        {report.issues.length > 0 && (
          <>
            <Divider />
            <IssueList issues={report.issues} />
          </>
        )}

        <Divider />

        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button variant="outlined" onClick={() => setAuditOpen(true)}>
            Spot check the data
          </Button>
          {awaiting && (
            <Button variant="contained" disabled={!report.can_approve || approveRun.isPending} onClick={() => approveRun.mutate()}>
              {approveRun.isPending ? 'Starting…' : 'Approve & import'}
            </Button>
          )}
          {completed && (
            <Button variant="contained" onClick={() => navigate('/integrations/pos')}>
              Done
            </Button>
          )}
          {!awaiting && !completed && <Button onClick={() => navigate(`/integrations/pos/runs/${runId}`)}>Back to progress</Button>}
        </Stack>
      </Stack>

      <SampleAuditDrawer open={auditOpen} samples={report.sample_audit} onClose={() => setAuditOpen(false)} />
    </MainCard>
  );
}
