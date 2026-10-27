// One report for the drop: the direct run's and the onboarding run's, side by side.

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { ReconciliationReport } from 'api/posIntegrations.api';
import type { BulkDrop } from 'api/importDrops.api';
import IssueList from 'views/pos-integrations/components/IssueList';
import { GrossSalesTable, PostCommitTable, TotalsTable } from 'views/pos-integrations/components/ReportTables';

import { innerCircleView, onboardingAvailable } from './importDrop';

/** What Inner Circle did after a customer or sales import. Nothing when it did not run. */
export function InnerCircleSummary({ report }: { report: ReconciliationReport }) {
  const view = innerCircleView(report.inner_circle);
  if (!view) return null;
  return (
    <Alert severity={view.severity}>
      <AlertTitle>{view.title}</AlertTitle>
      <Box component="ul" sx={{ m: 0, pl: 2.5 }}>
        {view.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </Box>
    </Alert>
  );
}

function LaneReport({ title, report }: { title: string; report: ReconciliationReport }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle1">{title}</Typography>
      {report.totals?.length ? <TotalsTable rows={report.totals} /> : null}
      {report.gross_sales?.length ? <GrossSalesTable rows={report.gross_sales} /> : null}
      {report.post_commit ? <PostCommitTable section={report.post_commit} /> : null}
      {report.issues?.length ? <IssueList issues={report.issues} /> : null}
      <InnerCircleSummary report={report} />
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
      {alsoIn.length && onboardingAvailable(drop) ? (
        <Alert severity="info">
          The onboarding import is one run for your whole company, so approving this drop also imports:{' '}
          {alsoIn.map((source) => source.filename || source.source_id).join(', ')}.
        </Alert>
      ) : null}
    </Stack>
  );
}
