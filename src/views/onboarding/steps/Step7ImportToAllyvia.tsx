import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { OnboardingState } from 'api/onboarding.api';
import type { RunStatus } from 'api/posIntegrations.api';
import ReconciliationPanel from 'views/pos-integrations/components/ReconciliationPanel';
import ImportStateBanner from '../components/ImportStateBanner';
import { commitStateName, type WizardStep } from '../wizardState';

interface Step7Props {
  state: OnboardingState | undefined;
  goToStep: (step: WizardStep) => void;
}

// Step 7 — the only step that puts data into Allyvia.
//
// Steps 5–6 read and check files into the warehouse; nothing there touches a
// live screen. This step shows the import summary the server prepared from
// that data (the same report the POS importer shows — one component, one set
// of numbers) and one primary action: put it into Allyvia. Nothing is written
// until that button is pressed, and it is disabled while any blocker stands.
export default function Step7ImportToAllyvia({ state, goToStep }: Step7Props) {
  const client = useQueryClient();
  const commit = state?.commit;
  const runId = commit?.run?.id;
  const name = commitStateName(state);

  // The wizard's own state (stepper checkmark, step-6 banner) follows the run.
  const onStatusChange = useCallback(
    (_status: RunStatus | undefined) => {
      client.invalidateQueries({ queryKey: ['onboarding-state'] });
    },
    [client]
  );

  const analyzedButNoReport = !runId || name === 'analyzed' || name === 'analyzing';

  return (
    <Stack spacing={2}>
      <ImportStateBanner state={state} />

      {analyzedButNoReport ? (
        <Box sx={{ py: 5, textAlign: 'center' }}>
          {name === 'analyzing' ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 1 }}>
                Still reading your files
              </Typography>
              <Button variant="outlined" onClick={() => goToStep(5)}>
                See analysis progress
              </Button>
            </>
          ) : (
            <Stack spacing={1.5} alignItems="center">
              <CircularProgress size={28} />
              <Typography variant="body2" color="text.secondary">
                Preparing your import summary. This page updates on its own.
              </Typography>
            </Stack>
          )}
        </Box>
      ) : (
        <ReconciliationPanel
          key={runId}
          runId={runId}
          approveLabel="Put this data into Allyvia"
          onStatusChange={onStatusChange}
          actions={(status) =>
            status === 'completed' ? (
              <Button variant="outlined" onClick={() => goToStep(3)}>
                Upload more data
              </Button>
            ) : null
          }
        />
      )}
    </Stack>
  );
}
