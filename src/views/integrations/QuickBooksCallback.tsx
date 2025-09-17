import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'store';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { processQBCallback, fetchQBConnectionStatus, fetchChartOfAccounts } from 'store/slices/integrations';

export default function QuickBooksCallback() {
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
      if (key === 'realmId') {
        result.realm_id = value;
      } else {
        result[key] = value;
      }
    }
    return result;
  }, []);

  useEffect(() => {
    const processCallback = async () => {
      try {
        if (parsedParams.realm_id && parsedParams.code && parsedParams.state) {
          if (!isAdmin) {
            setError('You need admin access to connect QuickBooks');
            return;
          }

          if (!companyId) {
            setError('No company found for current user');
            return;
          }

          const callbackData = {
            code: parsedParams.code,
            realmId: parsedParams.realm_id,
            state: parsedParams.state,
            companyId
          };

          await dispatch(processQBCallback(callbackData)).unwrap();
          await dispatch(fetchQBConnectionStatus(companyId));

          // Auto-fetch accounts after successful connection
          try {
            await dispatch(fetchChartOfAccounts(companyId)).unwrap();
          } catch (fetchError) {
            // Don't block navigation if fetch fails, user can sync manually
            console.error('Failed to auto-fetch accounts:', fetchError);
          }

          navigate('/integrations/quickbooks', { replace: true });
        } else if (parsedParams.error) {
          setError(`QuickBooks authorization failed: ${parsedParams.error}`);
        } else {
          setError('Invalid callback parameters');
        }
      } catch (err: any) {
        setError(err.message || 'Failed to process QuickBooks callback');
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
          <a href="/integrations/quickbooks" style={{ color: 'inherit' }}>
            Return to QuickBooks Integration
          </a>
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress size={40} />
      <Typography variant="h6" color="textPrimary">
        Processing QuickBooks Connection
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Please wait while we connect your QuickBooks account...
      </Typography>
    </Box>
  );
}
