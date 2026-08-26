// Landing + status page for Stripe Connect payments onboarding.
//
// Routed at /settings/payments/onboarding and .../onboarding/return — the
// backend's Account Link return_url (stripe_integration.services._onboarding_urls)
// points at the /return path, so this page is what a store admin sees after
// finishing (or abandoning) the Stripe-hosted KYC flow. Reaching it only means
// the hosted flow was exited properly; the source of truth is
// GET /api/stripe/status, which mirrors account.updated webhooks and can lag
// the redirect by a few seconds. Hence the gated 3s poll below (hand-rolled
// setTimeout per the ImportJobProgress precedent — no refetchInterval in repo).

import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { dispatch, useSelector } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import stripeApi, { type StripeConnectionStatus } from 'api/stripe.api';

const POLL_MS = 3000;
const MAX_POLLS = 10; // ~30s of webhook-lag grace, then the user refreshes manually.

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

type LoadState = 'loading' | 'ready' | 'forbidden' | 'error';

// Human labels for the four backend states (services.onboarding_status).
const STATE_CHIP: Record<StripeConnectionStatus['state'], { label: string; color: 'default' | 'success' | 'warning' | 'info' }> = {
  not_started: { label: 'Not started', color: 'default' },
  pending: { label: 'Verification pending', color: 'info' },
  enabled_with_requirements: { label: 'Action required', color: 'warning' },
  complete: { label: 'Complete', color: 'success' }
};

export default function StripeOnboardingStatusPage() {
  const navigate = useNavigate();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  const [status, setStatus] = useState<StripeConnectionStatus | null>(null);
  const [loadState, setLoadState] = useState<LoadState>('loading');
  const [linkBusy, setLinkBusy] = useState(false);
  const pollsRef = useRef(0);

  const fetchStatus = useCallback(async (): Promise<StripeConnectionStatus | null> => {
    if (!companyId) return null;
    try {
      const s = await stripeApi.getConnectionStatus(companyId);
      setStatus(s);
      setLoadState('ready');
      return s;
    } catch (error: any) {
      // /api/stripe/status sits behind an admin gate server-side — a non-admin
      // role gets 403 (stripe.api.ts note). Degrade, never block.
      setLoadState(error?.response?.status === 403 ? 'forbidden' : 'error');
      return null;
    }
  }, [companyId]);

  // Initial fetch, then keep polling while the webhook mirror may still be
  // catching up with the redirect ('pending' / 'not_started' right after the
  // user returns from Stripe). Gated and cleaned up.
  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;

    const tick = async () => {
      const s = await fetchStatus();
      if (cancelled) return;
      const settled = !s || s.state === 'complete' || s.state === 'enabled_with_requirements';
      pollsRef.current += 1;
      if (!settled && pollsRef.current < MAX_POLLS) {
        timer = window.setTimeout(tick, POLL_MS);
      }
    };

    tick();
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
    };
  }, [fetchStatus]);

  // Single-use hosted Account Link; full-page redirect like the QB/Square
  // OAuth flows (Step2Integrations precedent).
  const resumeOnboarding = async () => {
    setLinkBusy(true);
    try {
      const link = await stripeApi.createOnboardingLink(companyId);
      window.location.assign(link.url);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      snack(detail || 'Could not create a Stripe onboarding link. Please try again.', 'error');
      setLinkBusy(false);
    }
  };

  const refreshNow = () => {
    pollsRef.current = MAX_POLLS; // manual refresh, no new poll chain
    setLoadState('loading');
    fetchStatus();
  };

  const currentlyDue = status?.requirements?.currently_due ?? [];
  const pastDue = status?.requirements?.past_due ?? [];
  const dueCount = currentlyDue.length + pastDue.length;

  let body: ReactElement;
  if (loadState === 'loading' && !status) {
    body = (
      <Stack alignItems="center" spacing={2} sx={{ py: 6 }}>
        <CircularProgress size={32} />
        <Typography variant="body2" color="text.secondary">
          Checking your payment setup with Stripe…
        </Typography>
      </Stack>
    );
  } else if (loadState === 'forbidden') {
    body = (
      <Alert severity="info">
        <AlertTitle>Admin access required</AlertTitle>
        Payment onboarding status is only visible to company admins. Ask an admin to finish the Stripe setup.
      </Alert>
    );
  } else if (loadState === 'error' && !status) {
    body = (
      <Stack spacing={2}>
        <Alert severity="error">
          <AlertTitle>Could not load your payment status</AlertTitle>
          Something went wrong talking to the server. Your progress with Stripe is saved — try again in a moment.
        </Alert>
        <Box>
          <Button variant="outlined" onClick={refreshNow}>
            Try again
          </Button>
        </Box>
      </Stack>
    );
  } else if (status?.state === 'complete') {
    body = (
      <Stack spacing={2}>
        <Alert severity="success">
          <AlertTitle>Payments are set up</AlertTitle>
          Your Stripe account is verified. You can take card payments{status.payouts_enabled ? ' and receive payouts' : ''}.
        </Alert>
        <Stack direction="row" spacing={1}>
          <Chip
            size="small"
            label={status.charges_enabled ? 'Charges enabled' : 'Charges disabled'}
            color={status.charges_enabled ? 'success' : 'default'}
            variant="outlined"
          />
          <Chip
            size="small"
            label={status.payouts_enabled ? 'Payouts enabled' : 'Payouts pending'}
            color={status.payouts_enabled ? 'success' : 'default'}
            variant="outlined"
          />
        </Stack>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={() => navigate('/dashboard')}>
            Go to dashboard
          </Button>
          <Button variant="outlined" onClick={() => navigate('/onboarding')}>
            Continue setup
          </Button>
        </Stack>
      </Stack>
    );
  } else if (status?.state === 'enabled_with_requirements' || (status?.action_required && status?.connected)) {
    body = (
      <Stack spacing={2}>
        <Alert severity="warning">
          <AlertTitle>Stripe needs more information</AlertTitle>
          {dueCount > 0
            ? `Stripe still needs ${dueCount} item${dueCount === 1 ? '' : 's'} from you before your account is fully enabled.`
            : 'Your account works, but Stripe has outstanding requirements that could pause charges or payouts if ignored.'}
        </Alert>
        {dueCount > 0 && (
          <Typography variant="body2" color="text.secondary">
            Outstanding: {[...pastDue, ...currentlyDue].join(', ')}
          </Typography>
        )}
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={resumeOnboarding} disabled={linkBusy}>
            {linkBusy ? 'Opening Stripe…' : 'Finish on Stripe'}
          </Button>
          <Button variant="outlined" onClick={refreshNow}>
            Refresh status
          </Button>
        </Stack>
      </Stack>
    );
  } else if (status?.state === 'pending') {
    body = (
      <Stack spacing={2}>
        <Alert severity="info">
          <AlertTitle>Stripe is verifying your details</AlertTitle>
          You finished the form — verification usually completes within a few minutes. This page updates automatically for a short while;
          you can safely leave and check back from Settings.
        </Alert>
        <Stack direction="row" spacing={1.5}>
          <Button variant="outlined" onClick={refreshNow}>
            Refresh status
          </Button>
          <Button variant="text" onClick={resumeOnboarding} disabled={linkBusy}>
            {linkBusy ? 'Opening Stripe…' : 'Reopen Stripe form'}
          </Button>
        </Stack>
      </Stack>
    );
  } else {
    // not_started (or no status yet): the account was never created, or the
    // user backed out of Stripe before submitting anything.
    body = (
      <Stack spacing={2}>
        <Alert severity="info">
          <AlertTitle>Payment setup hasn’t been completed</AlertTitle>
          Connect with Stripe to take card payments in store and receive payouts. It takes about 5–10 minutes and you can save and come back
          at any point.
        </Alert>
        <Stack direction="row" spacing={1.5}>
          <Button variant="contained" onClick={resumeOnboarding} disabled={linkBusy || !companyId}>
            {linkBusy ? 'Opening Stripe…' : 'Set up payments with Stripe'}
          </Button>
          <Button variant="outlined" onClick={() => navigate('/settings')}>
            Back to settings
          </Button>
        </Stack>
      </Stack>
    );
  }

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
        <Stack spacing={2.5}>
          <Box>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="h4" sx={{ fontWeight: 600 }}>
                Payments setup
              </Typography>
              {status && (
                <Chip size="small" variant="outlined" label={STATE_CHIP[status.state].label} color={STATE_CHIP[status.state].color} />
              )}
            </Stack>
            <Typography variant="body2" color="text.secondary">
              Card payments and payouts for your store, powered by Stripe.
            </Typography>
          </Box>
          {body}
        </Stack>
      </Paper>
    </Container>
  );
}
