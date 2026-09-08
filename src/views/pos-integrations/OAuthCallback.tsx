// Where a POS sends the merchant back after they approve access.
//
// One route for every provider, because the state parameter already says which
// connection this is for — a per-provider route would mean registering a new
// redirect URL with each provider for no gain.
//
// The page does exactly one thing: hand the code and state to the backend,
// which does the token exchange server-side. The browser never sees a token.
// Everything else here is about the two ways this can go wrong — the merchant
// declined, or the link went stale — and saying so in words they can act on.

import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import MainCard from 'ui-component/cards/MainCard';
import type { Provider } from 'api/posIntegrations.api';
import { PROVIDER_LABELS } from 'api/posIntegrations.api';
import { useCompleteOAuth } from './hooks/usePosIntegrations';

export default function PosOAuthCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const complete = useCompleteOAuth();
  const [error, setError] = useState<string | null>(null);

  // React 18 mounts effects twice in development. The exchange consumes a
  // single-use code, so the second call would fail against a code the first
  // one already spent — and show the merchant an error for a connection that
  // actually worked.
  const started = useRef(false);

  const code = params.get('code');
  const state = params.get('state');
  const declined = params.get('error');
  const provider = (params.get('provider') as Provider) ?? 'square';
  const connectionId = params.get('connection');
  const status = params.get('status');
  const label = PROVIDER_LABELS[provider] ?? 'your point of sale';

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // Shopify (and later Clover/Lightspeed) finish the exchange on the API
    // and bounce here with connection + status, not code + state.
    if (connectionId && (status === 'connected' || status === 'failed')) {
      if (status === 'failed') {
        setError(`We couldn’t finish connecting ${label}. Please start the connection again from the integrations page.`);
        return;
      }
      navigate(`/integrations/pos/connect/${provider}`, { replace: true });
      return;
    }

    if (declined) {
      setError(`You didn’t finish signing in to ${label}, so nothing was connected. You can try again whenever you’re ready.`);
      return;
    }
    if (!code || !state) {
      setError('That link is missing something. Please start the connection again from the integrations page.');
      return;
    }

    complete
      .mutateAsync({ provider, code, state })
      .then((connection) => {
        navigate(`/integrations/pos/connect/${connection.provider}`, { replace: true });
      })
      .catch((err: any) => {
        setError(err?.response?.data?.detail ?? `We couldn’t finish connecting ${label}. Please try again.`);
      });
    // Deliberately runs once: the code is single-use.
  }, []);

  if (error) {
    return (
      <MainCard title={`Connecting ${label}`}>
        <Stack spacing={2}>
          <Alert severity="warning">{error}</Alert>
          <Box>
            <Button variant="contained" onClick={() => navigate('/integrations/pos')}>
              Back to integrations
            </Button>
          </Box>
        </Stack>
      </MainCard>
    );
  }

  return (
    <MainCard title={`Connecting ${label}`}>
      <Stack spacing={2} alignItems="center" sx={{ py: 6 }}>
        <CircularProgress />
        <Typography variant="body2" color="text.secondary">
          Finishing the connection. This only takes a moment.
        </Typography>
      </Stack>
    </MainCard>
  );
}
