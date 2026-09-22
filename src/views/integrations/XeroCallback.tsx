import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useDispatch, useSelector } from 'store';
import { Box, CircularProgress, Typography, Alert, List, ListItemButton, ListItemText, Paper } from '@mui/material';
import { confirmXeroTenant, processXeroCallback } from 'store/slices/integrations';

/**
 * Xero OAuth callback (ALL-248, Phase 1). No equivalent screen exists on the
 * QuickBooks side (design §4.1) -- Xero logins can be authorized against
 * more than one organisation, so this page has to do one thing
 * QuickBooksCallback never needed to: let the user pick which one to
 * connect when processXeroCallback comes back with more than one.
 */
export default function XeroCallback() {
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const { xero } = useSelector((state) => state.integrations);

  const isAdmin = currentRole?.role_type === 'admin';
  const companyId = currentRole?.company_id;

  const parsedParams = useMemo(() => {
    const { searchParams } = new URL(window.location.href);
    const result: Record<string, string> = {};
    for (const [key, value] of searchParams.entries()) {
      result[key] = value;
    }
    return result;
  }, []);

  useEffect(() => {
    const run = async () => {
      try {
        if (parsedParams.error) {
          setError(`Xero authorization failed: ${parsedParams.error}`);
          return;
        }
        if (!parsedParams.code || !parsedParams.state) {
          setError('Invalid callback parameters');
          return;
        }
        if (!isAdmin) {
          setError('You need admin access to connect Xero');
          return;
        }
        if (!companyId) {
          setError('No company found for current user');
          return;
        }

        const result = await dispatch(processXeroCallback({ code: parsedParams.code, state: parsedParams.state, companyId })).unwrap();

        if (!result.success) {
          setError(result.message);
          return;
        }
        if (result.auto_selected) {
          navigate('/integrations/xero', { replace: true });
        }
        // Otherwise result.auto_selected is false: xero.pendingTenantSelection
        // is now populated and the render below shows the picker instead.
      } catch (err: any) {
        setError(err?.message || err || 'Failed to process Xero callback');
      }
    };

    if (currentRole) {
      run();
    }
  }, [dispatch, navigate, parsedParams, currentRole, isAdmin, companyId]);

  const handleSelectTenant = async (tenantId: string) => {
    if (!companyId || !xero.pendingTenantSelection) return;
    try {
      const result = await dispatch(
        confirmXeroTenant({
          companyId,
          selectionToken: xero.pendingTenantSelection.selectionToken,
          tenantId
        })
      ).unwrap();
      if (!result.success) {
        setError(result.message);
        return;
      }
      navigate('/integrations/xero', { replace: true });
    } catch (err: any) {
      setError(err?.message || err || 'Failed to connect the selected organisation');
    }
  };

  if (error) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <Alert severity="error" sx={{ maxWidth: 500 }}>
          {error}
        </Alert>
        <Typography variant="body2" color="textSecondary">
          <a href="/integrations/xero" style={{ color: 'inherit' }}>
            Return to Xero Integration
          </a>
        </Typography>
      </Box>
    );
  }

  if (xero.pendingTenantSelection) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
        <Typography variant="h6" color="textPrimary">
          Choose which Xero organisation to connect
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          Your Xero login is authorized for more than one organisation.
        </Typography>
        <Paper sx={{ minWidth: 320, maxWidth: 480 }}>
          <List>
            {xero.pendingTenantSelection.tenants.map((tenant) => (
              <ListItemButton key={tenant.tenant_id} onClick={() => handleSelectTenant(tenant.tenant_id)}>
                <ListItemText primary={tenant.tenant_name || tenant.tenant_id} secondary={tenant.tenant_type || undefined} />
              </ListItemButton>
            ))}
          </List>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 2 }}>
      <CircularProgress size={40} />
      <Typography variant="h6" color="textPrimary">
        Processing Xero Connection
      </Typography>
      <Typography variant="body2" color="textSecondary">
        Please wait while we connect your Xero account...
      </Typography>
    </Box>
  );
}
