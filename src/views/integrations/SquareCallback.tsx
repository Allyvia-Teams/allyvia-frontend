import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Box, Typography, CircularProgress, Alert, Button } from '@mui/material';
import { useDispatch } from 'store';
import { processSquareCallback } from 'store/slices/integrations';
import MainCard from 'ui-component/cards/MainCard';

export default function SquareCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const companyId = searchParams.get('company_id');

        console.log('Square callback parameters:', { code, state, companyId });

        if (!code || !state || !companyId) {
          const missingParams = [];
          if (!code) missingParams.push('code');
          if (!state) missingParams.push('state');
          if (!companyId) missingParams.push('company_id');
          throw new Error(`Missing required parameters from Square callback: ${missingParams.join(', ')}`);
        }

        const result = await dispatch(
          processSquareCallback({
            code,
            state,
            companyId
          })
        ).unwrap();

        if (result.success) {
          setStatus('success');
          // Redirect to Square integration page after 2 seconds
          setTimeout(() => {
            navigate('/integrations/square');
          }, 2000);
        } else {
          throw new Error(result.message || 'Failed to process Square callback');
        }
      } catch (err: any) {
        console.error('Square callback error:', err);
        setError(err.message || 'An error occurred during Square connection');
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, dispatch, navigate]);

  const handleRetry = () => {
    navigate('/integrations/square');
  };

  return (
    <MainCard title="Square Integration">
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, py: 4 }}>
        {status === 'processing' && (
          <>
            <CircularProgress size={60} />
            <Typography variant="h6" color="primary">
              Connecting to Square...
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Please wait while we complete your Square integration setup.
            </Typography>
          </>
        )}

        {status === 'success' && (
          <>
            <Box sx={{ color: 'success.main', fontSize: 60 }}>✓</Box>
            <Typography variant="h6" color="success.main">
              Successfully Connected to Square!
            </Typography>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Redirecting you to the Square integration page...
            </Typography>
          </>
        )}

        {status === 'error' && (
          <>
            <Box sx={{ color: 'error.main', fontSize: 60 }}>✗</Box>
            <Typography variant="h6" color="error.main">
              Connection Failed
            </Typography>
            {error && (
              <Alert severity="error" sx={{ maxWidth: 500, textAlign: 'left' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Error Details:
                </Typography>
                {error}
                <Typography variant="body2" sx={{ mt: 2, fontStyle: 'italic' }}>
                  Please check the browser console for more details and try again.
                </Typography>
              </Alert>
            )}
            <Button variant="contained" onClick={handleRetry} sx={{ mt: 2 }}>
              Try Again
            </Button>
          </>
        )}
      </Box>
    </MainCard>
  );
}
