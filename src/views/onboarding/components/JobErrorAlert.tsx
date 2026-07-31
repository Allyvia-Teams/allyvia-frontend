import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';

import type { IngestionJob } from 'api/onboarding.api';
import { canRetryNormalize, jobErrorPresentation } from '../wizardState';
import { useRetryNormalize } from '../hooks/useOnboardingQueries';
import type { WizardStep } from '../wizardState';

interface JobErrorAlertProps {
  job: IngestionJob;
  goToStep: (step: WizardStep) => void;
}

// error.kind → human copy + the one action that actually helps.
export default function JobErrorAlert({ job, goToStep }: JobErrorAlertProps) {
  const retryMutation = useRetryNormalize();
  const presentation = jobErrorPresentation(job.error);
  if (!presentation) return null;

  const retryButton =
    presentation.action === 'retry-normalize' && canRetryNormalize(job) ? (
      <Button
        color="inherit"
        size="small"
        disabled={retryMutation.isPending}
        startIcon={retryMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
        onClick={() => retryMutation.mutate(job.id)}
      >
        Retry normalization
      </Button>
    ) : null;

  return (
    <Alert severity="error" sx={{ mt: 1 }}>
      <AlertTitle>{presentation.title}</AlertTitle>
      {presentation.description}
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        {retryButton}
        {presentation.action === 'reupload' && (
          <Button color="inherit" size="small" onClick={() => goToStep(3)}>
            Re-upload file
          </Button>
        )}
        {presentation.action === 'support' && (
          <>
            <Button color="inherit" size="small" component="a" href="mailto:support@allyvia.co">
              Contact support
            </Button>
            <Button color="inherit" size="small" onClick={() => goToStep(3)}>
              Re-upload corrected file
            </Button>
          </>
        )}
      </Stack>
    </Alert>
  );
}
