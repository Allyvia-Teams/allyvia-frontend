import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import GoogleDriveConnection from 'ui-component/GoogleDriveConnection';
import SourceCard, { type ChipState } from '../components/SourceCard';
import { useIntegrationStatuses } from '../hooks/useOnboardingQueries';

interface Step2IntegrationsProps {
  companyId: string;
}

const stateFor = (isLoading: boolean, isError: boolean, connected: boolean | undefined): ChipState => {
  if (isLoading) return 'loading';
  if (isError) return 'unknown';
  return connected ? 'connected' : 'disconnected';
};

// Phase 4 scope: status + OAuth only. Integration-backed DataSource rows
// (automatic imports) arrive with Phase 5 — hence the info alert.
// QB/Square use the existing full-page OAuth flows — acceptable because on
// return, /onboarding re-derives its position from backend state. Drive uses
// the popup + postMessage dialog, which never leaves the wizard.
export default function Step2Integrations({ companyId }: Step2IntegrationsProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const { qb, square, drive } = useIntegrationStatuses(companyId);

  const qbState = stateFor(qb.isLoading, qb.isError, qb.data?.is_connected);
  const squareState = stateFor(square.isLoading, square.isError, square.data?.connected);
  const driveState = stateFor(drive.isLoading, drive.isError, drive.data?.connected);

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Connect the tools you already use. You can skip this and upload files directly in the next step.
      </Typography>

      <Alert severity="info">Connected sources will import automatically in an upcoming release. For now, continue to upload files.</Alert>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="QuickBooks"
            description="Sync invoices, customers, and accounting entries."
            state={qbState}
            primaryLabel={qbState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => navigate('/integrations/quickbooks')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Square"
            description="Connect POS for sales, inventory, and payment data."
            state={squareState}
            primaryLabel={squareState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => navigate('/integrations/square')}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Google Drive"
            description="Import spreadsheets straight from your Drive."
            state={driveState}
            primaryLabel={driveState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => setDriveDialogOpen(true)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Stripe"
            description="Payments and payouts — coming soon."
            state="coming-soon"
            primaryLabel="Unavailable"
            disabled
          />
        </Grid>
      </Grid>

      {driveDialogOpen && (
        <GoogleDriveConnection
          open={driveDialogOpen}
          onClose={() => setDriveDialogOpen(false)}
          onConnected={() => {
            qc.invalidateQueries({ queryKey: ['onboarding-int-drive'] });
          }}
        />
      )}
    </Stack>
  );
}
