// Screen 4 — the reconciliation report, and the Approve gate.
//
// This is the screen the whole pipeline exists to produce. Its job is to let a
// merchant answer one question honestly: "did my data come across?" So the
// numbers come first, the caveats are stated rather than buried, and Approve
// is disabled with its reasons visible whenever a blocker stands.
//
// The report itself is ReconciliationPanel, shared with the onboarding
// wizard's "Import to Allyvia" step; this route only adds its own navigation.

import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Button from '@mui/material/Button';

import MainCard from 'ui-component/cards/MainCard';
import type { RunStatus } from 'api/posIntegrations.api';
import ReconciliationPanel from './components/ReconciliationPanel';

export default function ReconciliationReport() {
  const { runId } = useParams<{ runId: string }>();
  const navigate = useNavigate();
  const [status, setStatus] = useState<RunStatus | undefined>(undefined);

  if (!runId) return null;
  return (
    <MainCard title={status === 'completed' ? 'Import complete' : 'Import summary'}>
      <ReconciliationPanel
        runId={runId}
        onStatusChange={setStatus}
        actions={(current) => (
          <>
            {current === 'completed' && (
              <Button variant="contained" onClick={() => navigate('/integrations/pos')}>
                Done
              </Button>
            )}
            {current !== 'awaiting_approval' && current !== 'completed' && (
              <Button onClick={() => navigate(`/integrations/pos/runs/${runId}`)}>Back to progress</Button>
            )}
          </>
        )}
      />
    </MainCard>
  );
}
