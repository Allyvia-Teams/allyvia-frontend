import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'store';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';
import { processQBCallback, fetchQBConnectionStatus, fetchChartOfAccounts } from 'store/slices/integrations';
import { fetchCompanies } from 'store/slices/company';

export default function QuickBooksCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { companies } = useSelector((state) => state.company);

  const adminCompanies = companies.filter((c) => c.user_role === 'admin');

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
        if (!companies.length) {
          await dispatch(fetchCompanies()).unwrap();
        }

        if (parsedParams.realm_id && parsedParams.code && parsedParams.state) {
          const matchingCompany = adminCompanies.find((c) => c.qb_realm_id === parsedParams.realm_id);

          let companyToUse;
          if (matchingCompany) {
            companyToUse = matchingCompany;
          } else if (adminCompanies.length > 0) {
            companyToUse = adminCompanies[0];
          } else {
            setError('No company with admin access found to connect QuickBooks');
            return;
          }

          const callbackData = {
            code: parsedParams.code,
            realmId: parsedParams.realm_id,
            state: parsedParams.state,
            companyId: companyToUse.id
          };

          await dispatch(processQBCallback(callbackData)).unwrap();
          await dispatch(fetchQBConnectionStatus(companyToUse.id));

          // Auto-fetch accounts after successful connection
          try {
            await dispatch(fetchChartOfAccounts(companyToUse.id)).unwrap();
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

    if (companies.length > 0 || !companies) {
      processCallback();
    }
  }, [dispatch, navigate, parsedParams, companies]);

  useEffect(() => {
    if (!companies.length) {
      dispatch(fetchCompanies());
    }
  }, [dispatch, companies.length]);

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
      <CircularProgress />
      <Typography variant="h4">Connecting to QuickBooks...</Typography>
      <Typography variant="body2" color="textSecondary">
        Please wait while we complete the authorization process
      </Typography>
    </Box>
  );
}
