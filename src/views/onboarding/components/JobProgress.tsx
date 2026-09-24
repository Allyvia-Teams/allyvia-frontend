import { useEffect, useRef, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Collapse from '@mui/material/Collapse';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import Typography from '@mui/material/Typography';

import type { IngestPhase, IngestionJob, OnboardingState } from 'api/onboarding.api';
import { ACTIVE_PHASES, sourceDisplayName, type WizardStep } from '../wizardState';
import { useJobDetail } from '../hooks/useOnboardingQueries';
import JobErrorAlert from './JobErrorAlert';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

const PHASE_STEPS: Array<{ key: IngestPhase; label: string }> = [
  { key: 'landed', label: 'Landed' },
  { key: 'ingesting', label: 'Ingesting' },
  { key: 'await_map', label: 'Review & map' },
  { key: 'mapping_confirmed', label: 'Confirmed' },
  { key: 'normalizing', label: 'Normalizing' },
  { key: 'done', label: 'Analyzed' }
];

const snack = (message: string, color: 'success' | 'error' | 'info') =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

interface JobProgressProps {
  job: IngestionJob;
  state: OnboardingState;
  goToStep: (step: WizardStep) => void;
}

export default function JobProgress({ job: stateJob, state, goToStep }: JobProgressProps) {
  const isActive = ACTIVE_PHASES.includes(stateJob.phase);
  // GET /jobs/{id}/ is what advances Dataform status server-side during
  // 'normalizing' (5s server debounce) — /state/ alone never refreshes it.
  const detail = useJobDetail(stateJob.id, isActive);
  const job: IngestionJob = detail.data ?? stateJob;
  const displayName = sourceDisplayName(state, job.source);
  const [failuresOpen, setFailuresOpen] = useState(false);

  // Phase-transition snackbars (ImportJobProgress prevStatusRef pattern).
  const prevPhaseRef = useRef<IngestPhase | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev && prev !== job.phase) {
      if (job.phase === 'await_map') snack(`${displayName} is ready to review.`, 'info');
      if (job.phase === 'done') snack(`${displayName} is analyzed. Review the import on the last step to add it to Allyvia.`, 'success');
      if (job.phase === 'failed') snack(`${displayName} could not be processed.`, 'error');
    }
    prevPhaseRef.current = job.phase;
  }, [job.phase, displayName]);

  const phaseIndex = PHASE_STEPS.findIndex((p) => p.key === job.phase);
  const activeStep = job.phase === 'done' ? PHASE_STEPS.length : Math.max(phaseIndex, 0);

  const stats = job.stats ?? {};
  const normalize = stats.normalize;
  const failedActions = normalize?.failed_actions ?? [];
  const pastIngest = phaseIndex >= 2 || job.phase === 'done';

  return (
    <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, bgcolor: 'background.paper' }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, flex: 1 }}>
          {displayName}
        </Typography>
        {job.phase === 'await_map' && (
          <Button size="small" variant="contained" onClick={() => goToStep(4)}>
            Needs your review
          </Button>
        )}
      </Stack>

      {job.phase !== 'failed' && (
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 1 }}>
          {PHASE_STEPS.map((phase) => (
            <Step key={phase.key}>
              <StepLabel>{phase.label}</StepLabel>
            </Step>
          ))}
        </Stepper>
      )}

      {/* The alert is NOT exclusive with the stepper. It used to be, and that
          is how two prod jobs sat at mapping_confirmed for a week carrying a
          real error.kind 'dataform' ("400 Service account must be set when
          strict act as checks are enabled") while the wizard showed a silent
          stepper and no retry: trigger_normalization RECORDS an expected
          Dataform failure on the job and deliberately leaves the phase at
          mapping_confirmed (services.py — the confirm stays valid), so the
          only jobs whose error ever reached a human were the ones that got
          all the way to phase 'failed'. jobErrorPresentation returns null
          when there is nothing to say, so this renders only on a real error,
          and canRetryNormalize already allows the retry at
          mapping_confirmed. */}
      <JobErrorAlert job={job} goToStep={goToStep} />

      {pastIngest && (stats.total_rows !== undefined || stats.table_count !== undefined) && (
        <Stack direction="row" spacing={1} alignItems="center" useFlexGap sx={{ flexWrap: 'wrap', mt: 1 }}>
          <Typography variant="caption" color="text.secondary">
            {stats.total_rows !== undefined ? `${stats.total_rows.toLocaleString()} rows` : null}
            {stats.total_rows !== undefined && stats.table_count !== undefined ? ' · ' : null}
            {stats.table_count !== undefined ? `${stats.table_count} table${stats.table_count === 1 ? '' : 's'}` : null}
          </Typography>
          {(stats.tables ?? [])
            .filter((t) => t.sheet)
            .map((t) => (
              <Chip key={t.bq_table_id} size="small" variant="outlined" label={t.sheet} />
            ))}
        </Stack>
      )}

      {job.phase === 'normalizing' && normalize?.actions && (
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          {normalize.actions.succeeded} of {normalize.actions.total} actions succeeded
        </Typography>
      )}

      {failedActions.length > 0 && (
        <Box sx={{ mt: 1 }}>
          <Button size="small" onClick={() => setFailuresOpen((open) => !open)}>
            {failuresOpen ? 'Hide' : 'Show'} {failedActions.length} failed action{failedActions.length === 1 ? '' : 's'}
          </Button>
          <Collapse in={failuresOpen}>
            <Stack spacing={0.5} sx={{ mt: 1 }}>
              {failedActions.map((action) => (
                <Alert key={action.target} severity="warning" sx={{ py: 0 }}>
                  <Typography variant="caption">
                    {action.target}: {action.failure_reason}
                  </Typography>
                </Alert>
              ))}
            </Stack>
          </Collapse>
        </Box>
      )}
    </Box>
  );
}
