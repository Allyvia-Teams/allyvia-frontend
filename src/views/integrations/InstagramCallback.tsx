import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';

import SocialAPI from 'api/social.api';
import { SOCIAL_CONNECTION_KEY } from 'features/social/useSocialConnection';
import { INTEGRATIONS_HUB_ROUTE } from './routes';

/** Where Instagram sends her back. The code goes to the backend once; the token never reaches this page. */
export default function InstagramCallback() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const sent = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state') ?? '';
    if (!code) {
      setError(params.get('error_description') || 'Instagram did not connect. Please start again.');
      return;
    }
    SocialAPI.callback(code, state)
      .then((data) => {
        client.setQueryData(SOCIAL_CONNECTION_KEY, data);
        navigate(INTEGRATIONS_HUB_ROUTE, { replace: true });
      })
      .catch((err) => {
        const detail = err?.response?.data?.detail;
        setError(typeof detail === 'string' ? detail : 'Instagram did not connect. Please start again.');
      });
  }, [client, navigate]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, py: 8 }}>
      {error ? (
        <>
          <Alert severity="error">{error}</Alert>
          <Button variant="outlined" onClick={() => navigate(INTEGRATIONS_HUB_ROUTE)}>
            Back to Integrations
          </Button>
        </>
      ) : (
        <>
          <CircularProgress size={28} />
          <Typography color="text.secondary">Connecting your Instagram…</Typography>
        </>
      )}
    </Box>
  );
}
