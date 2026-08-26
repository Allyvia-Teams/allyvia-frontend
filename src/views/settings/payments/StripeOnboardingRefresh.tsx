// Account Link refresh_url target (stripe_integration.services._onboarding_urls).
//
// Stripe sends the user here when a hosted-onboarding link is dead: expired
// (links live only a few minutes), already visited (reload / back button), or
// consumed by a link-previewing client. Account Links are single-use, so the
// only correct move is to mint a fresh one and bounce straight back into the
// Stripe flow — this page is a spinner that does exactly that, with a manual
// retry if the mint fails.

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Container from '@mui/material/Container';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { useSelector } from 'store';
import stripeApi from 'api/stripe.api';

export default function StripeOnboardingRefreshPage() {
  const navigate = useNavigate();
  const companyId = useSelector((s) => s.auth.currentRole?.company_id) || '';

  const [error, setError] = useState<string | null>(null);
  // Guards StrictMode's double effect-invocation in dev — minting two links is
  // harmless server-side but racing two redirects is not.
  const startedRef = useRef(false);

  const mintAndRedirect = async () => {
    setError(null);
    try {
      const link = await stripeApi.createOnboardingLink(companyId);
      window.location.assign(link.url);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      const forbidden = err?.response?.status === 403;
      setError(
        forbidden
          ? 'Only company admins can run payment onboarding. Ask an admin to finish the Stripe setup.'
          : detail || 'Could not create a new Stripe onboarding link. Please try again.'
      );
      startedRef.current = false;
    }
  };

  useEffect(() => {
    if (!companyId || startedRef.current) return;
    startedRef.current = true;
    mintAndRedirect();
  }, [companyId]);

  return (
    <Container maxWidth="sm" sx={{ py: { xs: 3, sm: 5 } }}>
      <Paper variant="outlined" sx={{ p: { xs: 2.5, sm: 4 }, borderRadius: 2 }}>
        {error ? (
          <Stack spacing={2}>
            <Alert severity="error">
              <AlertTitle>Couldn’t reopen Stripe onboarding</AlertTitle>
              {error}
            </Alert>
            <Stack direction="row" spacing={1.5}>
              <Button variant="contained" onClick={mintAndRedirect} disabled={!companyId}>
                Try again
              </Button>
              <Button variant="outlined" onClick={() => navigate('/settings/payments/onboarding')}>
                View payment status
              </Button>
            </Stack>
          </Stack>
        ) : (
          <Stack alignItems="center" spacing={2} sx={{ py: 4 }}>
            <CircularProgress size={32} />
            <Typography variant="body1" sx={{ fontWeight: 500 }}>
              Reconnecting you to Stripe…
            </Typography>
            <Typography variant="body2" color="text.secondary" align="center">
              Your previous onboarding link expired. We’re creating a fresh one — your progress on Stripe is saved.
            </Typography>
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
