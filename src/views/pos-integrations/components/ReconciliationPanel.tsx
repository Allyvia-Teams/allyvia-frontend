// The reconciliation report and its Approve gate, as ONE component.
//
// Rendered by the integrations report route (ReconciliationReport) and by the
// onboarding wizard's final step, so a merchant sees the same numbers, the same
// caveats and the same blocked button whichever door they came in by. A second
// report UI is how the two would drift.
//
// The gate is structural, not cosmetic: Approve is disabled whenever the
// server's `can_approve` is false (any blocker), and the server refuses an
// approve with blockers regardless (409).

import { useEffect, useState, type ReactNode } from 'react';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { RunStatus } from 'api/posIntegrations.api';
import DuplicateResolver from './DuplicateResolver';
import IssueList from './IssueList';
import SampleAuditDrawer from './SampleAuditDrawer';
import { GrossSalesTable, InventoryTable, MonthlySalesTable, PostCommitTable, TotalsTable } from './ReportTables';
import { useApproveRun, useReport, useResolveDuplicates, useRunPolling, useSkipInvalid } from '../hooks/usePosIntegrations';

export interface ReconciliationPanelProps {
  runId: string;
  /** Label of the primary action. The wizard says what it does in plain words. */
  approveLabel?: string;
  /** Extra buttons beside Approve (navigation belongs to the caller). */
  actions?: (status: RunStatus | undefined) => ReactNode;
  /** Called whenever the run's status changes — the wizard refreshes its state. */
  onStatusChange?: (status: RunStatus | undefined) => void;
}

export default function ReconciliationPanel({
  runId,
  approveLabel = 'Approve & import',
  actions,
  onStatusChange
}: ReconciliationPanelProps) {
  const [auditOpen, setAuditOpen] = useState(false);

  const { data: run } = useRunPolling(runId);
  const { data: report, isLoading } = useReport(runId);
  const approveRun = useApproveRun(runId);
  const resolveDuplicates = useResolveDuplicates(runId);
  const skipInvalid = useSkipInvalid(runId);

  const status = run?.status;
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  if (isLoading || !report) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
        <CircularProgress />
      </Box>
    );
  }

  const awaiting = status === 'awaiting_approval';
  const committing = status === 'committing';
  const completed = status === 'completed';
  const invalidTotal = report.totals.reduce((sum, row) => sum + (row.invalid ?? 0), 0);

  return (
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
            {approveRun.isPending ? 'Starting…' : approveLabel}
          </Button>
        )}
        {actions?.(status)}
      </Stack>

      <SampleAuditDrawer open={auditOpen} samples={report.sample_audit} onClose={() => setAuditOpen(false)} />
    </Stack>
  );
}
