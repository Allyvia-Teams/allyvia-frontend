import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Box, CircularProgress, Alert, Stack, Button } from '@mui/material';
import axios from 'axios';
import axiosServices from 'utils/axios';
import { setTokens } from 'utils/authStorage';
import { useDispatch } from 'store';
import { initializeAuth } from 'store/slices/auth';

export default function GoogleCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const status = searchParams.get('status');
    const reason = searchParams.get('reason');

    if (status === 'error') {
      setError(reason || 'Authentication failed');
      return;
    }

    // Attempt cookie-based refresh to obtain access token
    (async () => {
      try {
        const apiBase = import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1';
        const { data } = await axios.post(`${apiBase}/auth/refresh-cookie/`, null, { withCredentials: true });
        const access = data?.access;
        if (!access) throw new Error('Missing access token');

        // Persist access token locally (refresh is HttpOnly cookie)
        setTokens(access, '');
        axiosServices.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        await dispatch(initializeAuth() as any);
        navigate('/dashboard');
      } catch (e: any) {
        setError(e?.message || 'Could not establish session');
      }
    })();
  }, [dispatch, navigate, searchParams]);

  if (error) {
    return (
      <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Stack spacing={2} sx={{ maxWidth: 480 }}>
          <Alert severity="error">{error}</Alert>
          <Button variant="contained" onClick={() => navigate('/login')}>
            Back to Login
          </Button>
        </Stack>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <CircularProgress />
    </Box>
  );
}
