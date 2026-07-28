import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import Grid from '@mui/material/Grid';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import GoogleDriveConnection from 'ui-component/GoogleDriveConnection';
import stripeApi from 'api/stripe.api';
import type { OnboardingState, SourceKind } from 'api/onboarding.api';
import SourceCard, { type ChipState } from '../components/SourceCard';
import DriveFilePickerDialog from '../components/DriveFilePickerDialog';
import { useImportIntegration, useIntegrationStatuses } from '../hooks/useOnboardingQueries';
import { integrationImportStatus, type WizardStep } from '../wizardState';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface Step2IntegrationsProps {
  companyId: string;
  state: OnboardingState | undefined;
  goToStep: (step: WizardStep) => void;
}

const stateFor = (isLoading: boolean, isError: boolean, connected: boolean | undefined): ChipState => {
  if (isLoading) return 'loading';
  if (isError) return 'unknown';
  return connected ? 'connected' : 'disconnected';
};

const snack = (message: string, color: 'success' | 'error' | 'warning') =>
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

// Per-card import status line, derived from /state/ (sources' last_export +
// their latest jobs). Rendered only once the kind has ever been imported.
function ImportStatusLine({
  state,
  kind,
  goToStep,
  onRetry
}: {
  state: OnboardingState | undefined;
  kind: SourceKind;
  goToStep: (step: WizardStep) => void;
  onRetry?: () => void;
}) {
  if (!state) return null;
  const info = integrationImportStatus(state, kind);
  if (info.status === null) return null;
  switch (info.status) {
    case 'importing': {
      const landed = info.total - info.importing;
      return (
        <Typography variant="caption" color="text.secondary">
          {info.total > 1 ? `Importing ${landed} of ${info.total}…` : 'Importing…'}
        </Typography>
      );
    }
    case 'imported':
      return (
        <Typography variant="caption" color="success.main">
          Imported
        </Typography>
      );
    case 'attention':
      return (
        <Typography variant="caption" color="warning.main">
          Needs review —{' '}
          <Link component="button" type="button" variant="caption" onClick={() => goToStep(4)}>
            review &amp; map
          </Link>
        </Typography>
      );
    default:
      return (
        <Typography variant="caption" color="error">
          Import failed{info.message ? `: ${info.message}` : ''}
          {onRetry && (
            <>
              {' — '}
              <Link component="button" type="button" variant="caption" onClick={onRetry}>
                Retry
              </Link>
            </>
          )}
        </Typography>
      );
  }
}

// Phase 5: connected cards import for real — "Import data" runs the
// synchronous per-entity export fan-out; per-card status lines ride /state/.
// QB/Square use the existing full-page OAuth flows — acceptable because on
// return, /onboarding re-derives its position from backend state. Drive uses
// the popup + postMessage dialog, which never leaves the wizard. Stripe
// connect redirects to the Stripe-hosted onboarding link (admin-gated).
export default function Step2Integrations({ companyId, state, goToStep }: Step2IntegrationsProps) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [driveDialogOpen, setDriveDialogOpen] = useState(false);
  const [drivePickerOpen, setDrivePickerOpen] = useState(false);
  const [stripeLinkBusy, setStripeLinkBusy] = useState(false);
  const { qb, square, drive, stripe } = useIntegrationStatuses(companyId);

  const importSquare = useImportIntegration('square');
  const importQuickbooks = useImportIntegration('quickbooks');
  const importStripe = useImportIntegration('stripe');

  const qbState = stateFor(qb.isLoading, qb.isError, qb.data?.is_connected);
  const squareState = stateFor(square.isLoading, square.isError, square.data?.connected);
  const driveState = stateFor(drive.isLoading, drive.isError, drive.data?.connected);
  // 403 (non-admin) or any error degrades the chip to 'unknown' — never blocks.
  const stripeState = stateFor(stripe.isLoading, stripe.isError, stripe.data?.connected);

  // Single-use hosted Account Link; full-page redirect like the QB/Square
  // OAuth flows (the wizard re-derives its position on return).
  const openStripeOnboarding = async () => {
    setStripeLinkBusy(true);
    try {
      const link = await stripeApi.createOnboardingLink(companyId);
      window.location.assign(link.url);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      snack(detail || 'Could not start Stripe onboarding. Ask an admin to connect Stripe.', 'error');
      setStripeLinkBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Connect the tools you already use, then import their data with one click. You can also skip this and upload files directly in the
        next step.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="QuickBooks"
            description="Sync invoices, customers, and accounting entries."
            state={qbState}
            primaryLabel={qbState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => navigate('/integrations/quickbooks')}
            secondaryLabel={qbState === 'connected' ? 'Import data' : undefined}
            onSecondary={() => importQuickbooks.mutate()}
            secondaryBusy={importQuickbooks.isPending}
            statusLine={<ImportStatusLine state={state} kind="quickbooks" goToStep={goToStep} onRetry={() => importQuickbooks.mutate()} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Square"
            description="Connect POS for sales, inventory, and payment data."
            state={squareState}
            primaryLabel={squareState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => navigate('/integrations/square')}
            secondaryLabel={squareState === 'connected' ? 'Import data' : undefined}
            onSecondary={() => importSquare.mutate()}
            secondaryBusy={importSquare.isPending}
            statusLine={<ImportStatusLine state={state} kind="square" goToStep={goToStep} onRetry={() => importSquare.mutate()} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Google Drive"
            description="Import spreadsheets straight from your Drive."
            state={driveState}
            primaryLabel={driveState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={() => setDriveDialogOpen(true)}
            secondaryLabel={driveState === 'connected' ? 'Import from Drive' : undefined}
            onSecondary={() => setDrivePickerOpen(true)}
            statusLine={<ImportStatusLine state={state} kind="google_drive" goToStep={goToStep} onRetry={() => setDrivePickerOpen(true)} />}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <SourceCard
            name="Stripe"
            description="Import charges, customers, and products from Stripe."
            state={stripeState}
            primaryLabel={stripeState === 'connected' ? 'Manage' : 'Connect'}
            onPrimary={openStripeOnboarding}
            disabled={stripeLinkBusy}
            secondaryLabel={stripeState === 'connected' ? 'Import data' : undefined}
            onSecondary={() => importStripe.mutate()}
            secondaryBusy={importStripe.isPending}
            statusLine={<ImportStatusLine state={state} kind="stripe" goToStep={goToStep} onRetry={() => importStripe.mutate()} />}
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

      <DriveFilePickerDialog open={drivePickerOpen} onClose={() => setDrivePickerOpen(false)} />
    </Stack>
  );
}
