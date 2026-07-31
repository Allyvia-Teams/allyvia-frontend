import { useCallback, useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { OnboardingState } from 'api/onboarding.api';
import { AllyviaStats } from 'ui-component/common';
import JobHealthCard from '../components/JobHealthCard';
import type { WizardStep } from '../wizardState';

interface Step6DataHealthProps {
  state: OnboardingState | undefined;
  goToStep: (step: WizardStep) => void;
}

// No catalog endpoint until Phase 6 — health is assembled from /state/ job
// stats plus per-table rejected-row summaries as the cards load.
export default function Step6DataHealth({ state, goToStep }: Step6DataHealthProps) {
  const [rejectedTotals, setRejectedTotals] = useState<Record<string, number>>({});
  const onRejectedTotal = useCallback((tableId: string, total: number) => {
    setRejectedTotals((prev) => (prev[tableId] === total ? prev : { ...prev, [tableId]: total }));
  }, []);

  const jobs = state?.jobs ?? [];
  const doneJobs = jobs.filter((job) => job.phase === 'done');
  const failedJobs = jobs.filter((job) => job.phase === 'failed');
  const healthJobs = [...doneJobs, ...failedJobs].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  const rowsLoaded = doneJobs.reduce((sum, job) => sum + (job.stats?.total_rows ?? 0), 0);
  const tablesCreated = doneJobs.reduce((sum, job) => sum + (job.stats?.table_count ?? 0), 0);
  const tablesWithRejects = Object.values(rejectedTotals).filter((total) => total > 0).length;
  const needsAttention = failedJobs.length + tablesWithRejects;

  if (healthJobs.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          No finished imports yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Data health appears here once an import completes.
        </Typography>
        <Button variant="contained" onClick={() => goToStep(3)}>
          Upload files
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 6, md: 3 }}>
          <AllyviaStats title="Files imported" value={doneJobs.length} theme="success" />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AllyviaStats title="Rows loaded" value={rowsLoaded.toLocaleString()} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AllyviaStats title="Tables created" value={tablesCreated} />
        </Grid>
        <Grid size={{ xs: 6, md: 3 }}>
          <AllyviaStats title="Needs attention" value={needsAttention} theme={needsAttention > 0 ? 'warning' : 'default'} />
        </Grid>
      </Grid>

      {state &&
        healthJobs.map((job) => (
          <JobHealthCard key={job.id} job={job} state={state} goToStep={goToStep} onRejectedTotal={onRejectedTotal} />
        ))}

      <Box>
        <Button variant="outlined" onClick={() => goToStep(3)}>
          Upload more data
        </Button>
      </Box>
    </Stack>
  );
}
