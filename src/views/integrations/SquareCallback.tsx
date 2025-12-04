import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'store';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { processSquareCallback, fetchSquareConnectionStatus } from 'store/slices/integrations';

export default function SquareCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);

  const isAdmin = currentRole?.role_type === 'admin';
  const companyId = currentRole?.company_id;

  const parsedParams = useMemo(() => {
    const { searchParams } = new URL(window.location.href);
    const result: any = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  }, []);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (parsedParams.code && parsedParams.state) {
          if (!isAdmin) {
            setError('You need admin access to connect Square');
            return;
          }

          if (!companyId) {
            setError('No company found for current user');
            return;
          }

          const callbackData = {
            code: parsedParams.code,
            state: parsedParams.state,
            companyId
          };

          await dispatch(processSquareCallback(callbackData)).unwrap();
          await dispatch(fetchSquareConnectionStatus(companyId));

          navigate('/integrations/square', {
            replace: true
          });
        } else if (parsedParams.error) {
          setError(`Square authorization failed: ${parsedParams.error}`);
        } else {
          setError('Invalid callback parameters');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process Square callback');
      }
    };

    if (currentRole) {
      processCallback();
    }
  }, [dispatch, navigate, parsedParams, currentRole, isAdmin, companyId]);

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="textSecondary">
          <a href="/integrations/square" style={{ color: 'inherit' }}>
            Return to Square Integration
          </a>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress size={40} />
      <Typography variant="h6" color="textPrimary">
        Processing Square Connection
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Please wait while we connect your Square account...
      </Typography>
    </Box>
  );
}
