// One report for the drop: the direct run's and the onboarding run's, side by side.

import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ReconciliationReport } from 'api/posIntegrations.api';
import type { BulkDrop } from 'api/importDrops.api';
import IssueList from 'views/pos-integrations/components/IssueList';
import { GrossSalesTable, PostCommitTable, TotalsTable } from 'views/pos-integrations/components/ReportTables';

function LaneReport({ title, report }: { title: string; report: ReconciliationReport }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">{title}</Typography>
      {report.totals?.length ? <TotalsTable rows={report.totals} /> : null}
      {report.gross_sales?.length ? <GrossSalesTable rows={report.gross_sales} /> : null}
      {report.post_commit ? <PostCommitTable section={report.post_commit} /> : null}
      {report.issues?.length ? <IssueList issues={report.issues} /> : null}
      {(report.notes ?? []).map((note) => (
        <Typography key={note} variant="body2" color="text.secondary">
          {note}
        </Typography>
      ))}
    </Stack>
  );
}

export default function DropReportPanel({ drop }: { drop: BulkDrop }) {
  const { direct, onboarding, also_in_onboarding_run: alsoIn } = drop.report;
  if (!direct && !onboarding) {
    return (
      <Typography variant="body2" color="text.secondary">
        The report appears here once the files have been read.
      </Typography>
    );
  }
  return (
    <Stack spacing={3}>
      {direct && Object.keys(direct).length ? <LaneReport title="Direct import" report={direct} /> : null}
      {onboarding && Object.keys(onboarding).length ? <LaneReport title="Onboarding" report={onboarding} /> : null}
      {alsoIn.length ? (
        <Alert severity="info">
          The onboarding import is one run for your whole company, so approving this drop also imports:{' '}
          {alsoIn.map((source) => source.filename || source.source_id).join(', ')}.
        </Alert>
      ) : null}
    </Stack>
  );
}
