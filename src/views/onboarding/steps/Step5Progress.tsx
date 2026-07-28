import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { OnboardingState } from 'api/onboarding.api';
import JobProgress from '../components/JobProgress';
import type { WizardStep } from '../wizardState';

interface Step5ProgressProps {
  state: OnboardingState | undefined;
  goToStep: (step: WizardStep) => void;
}

export default function Step5Progress({ state, goToStep }: Step5ProgressProps) {
  const jobs = [...(state?.jobs ?? [])].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));

  if (jobs.length === 0) {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          No imports yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Upload a file to start your first import.
        </Typography>
        <Button variant="contained" onClick={() => goToStep(3)}>
          Upload files
        </Button>
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Each file moves through the pipeline on its own. Files that need your review will pause until you map them.
      </Typography>
      {state && jobs.map((job) => <JobProgress key={job.id} job={job} state={state} goToStep={goToStep} />)}
    </Stack>
  );
}
