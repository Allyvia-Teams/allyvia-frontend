import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'store';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Typography
} from '@mui/material';
import { IconCircleCheck, IconCircleX, IconClock, IconRefresh, IconUnlink } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import MainCard from 'ui-component/cards/MainCard';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { fetchXeroConnectionStatus, initiateXeroConnection, refreshXeroToken, revokeXeroConnection } from 'store/slices/integrations';
import { setCompanyId, setXeroUrlAndState } from 'utils/authStorage';
import { INTEGRATIONS_HUB_ROUTE } from '../routes';

/**
 * Xero connector page (ALL-248, Phase 1: auth + tenant connection only).
 *
 * Deliberately NOT a copy of views/integrations/QuickBooks.tsx -- that page
 * carries three phases' worth of entity tabs, account mapping, webhooks and
 * import progress that have no Xero equivalent yet (design §4.2-§4.5 land
 * those over Phases 2-4). This page is only what Phase 1 actually has:
 * connect, see status, refresh, disconnect.
 */
export default function XeroIntegration() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const { xero } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);

  const companyId = currentRole?.company_id || null;
  const isAdmin = currentRole?.role_type === 'admin';
  const { connection } = xero;

  useEffect(() => {
    if (!companyId) return;
    setCompanyId(companyId);
    dispatch(fetchXeroConnectionStatus(companyId)).then((action: any) => {
      const isTokenExpired = action.payload?.is_connected && !action.payload?.access_token_valid;
      const isRefreshTokenValid = action.payload?.refresh_token_valid;
      if (isTokenExpired && isRefreshTokenValid) {
        dispatch(refreshXeroToken(companyId)).then(() => dispatch(fetchXeroConnectionStatus(companyId)));
      }
    });
  }, [dispatch, companyId]);

  const handleConnect = async () => {
    if (!companyId) return;
    try {
      const result = await dispatch(initiateXeroConnection(companyId)).unwrap();
      setXeroUrlAndState(result.auth_url, result.state);

      const callbackUrl = import.meta.env.VITE_APP_XERO_CALLBACK_URL;
      const targetUrl = new URL(result.auth_url);
      if (callbackUrl) {
        targetUrl.searchParams.set('redirect_uri', callbackUrl);
      }
      window.location.href = targetUrl.toString();
    } catch (error) {
      console.error('Failed to initiate Xero connection:', error);
    }
  };

  const handleRefresh = async () => {
    if (!companyId) return;
    await dispatch(refreshXeroToken(companyId));
  };

  const handleDisconnect = async () => {
    if (!companyId) return;
    await dispatch(revokeXeroConnection(companyId));
    setConfirmDisconnect(false);
  };

  if (!currentRole) {
    return (
      <MainCard title="Xero">
        <Alert severity="warning">Please login to use the Xero integration.</Alert>
      </MainCard>
    );
  }

  const statusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <IconCircleCheck size={24} color={theme.palette.success.main} />;
      case 'expired':
        return <IconClock size={24} color={theme.palette.warning.main} />;
      case 'refreshing':
        return <IconRefresh size={24} color={theme.palette.info.main} />;
      default:
        return <IconCircleX size={24} color={theme.palette.error.main} />;
    }
  };

  const statusColor = () => {
    switch (connection.status) {
      case 'connected':
        return theme.palette.success.main;
      case 'expired':
        return theme.palette.warning.main;
      case 'refreshing':
        return theme.palette.info.main;
      default:
        return theme.palette.error.main;
    }
  };

  const statusLabel = () => {
    switch (connection.status) {
      case 'connected':
        return 'Connected';
      case 'expired':
        return 'Token expired';
      case 'refreshing':
        return 'Refreshing...';
      default:
        return 'Not connected';
    }
  };

  return (
    <MainCard
      title="Xero"
      secondary={<Button onClick={() => (window.location.href = INTEGRATIONS_HUB_ROUTE)}>Back to Integrations</Button>}
    >
      {xero.ui.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {xero.ui.error}
        </Alert>
      )}

      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">Xero</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                {statusIcon()}
                <Chip
                  label={statusLabel()}
                  size="small"
                  sx={{ bgcolor: `${statusColor()}15`, color: statusColor(), fontWeight: 'medium' }}
                />
                {connection.tenantName && (
                  <Typography variant="body2" color="textSecondary">
                    {connection.tenantName}
                  </Typography>
                )}
              </Box>
            </Box>
            {!isAdmin ? (
              <Typography variant="body2" color="textSecondary">
                Admin access required
              </Typography>
            ) : connection.status === 'disconnected' ? (
              <AnimateButton>
                <Button variant="contained" color="primary" onClick={handleConnect} disabled={xero.ui.isConnecting}>
                  Connect Xero
                </Button>
              </AnimateButton>
            ) : (
              <Box sx={{ display: 'flex', gap: 1 }}>
                {connection.status === 'expired' && (
                  <Button startIcon={<IconRefresh size={16} />} onClick={handleRefresh} disabled={xero.ui.isRefreshing}>
                    Refresh
                  </Button>
                )}
                <Button color="error" startIcon={<IconUnlink size={16} />} onClick={() => setConfirmDisconnect(true)}>
                  Disconnect
                </Button>
              </Box>
            )}
          </Box>

          {connection.status === 'connected' && (
            <>
              <Divider sx={{ my: 2 }} />
              <Typography variant="body2" color="textSecondary">
                Connected since:{' '}
                <strong>{connection.connectedAt ? new Date(connection.connectedAt).toLocaleDateString() : 'Unknown'}</strong>
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                Syncing invoices, contacts and accounting entries starts in a later phase of this integration -- this page currently covers
                the connection only.
              </Typography>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={confirmDisconnect} onClose={() => setConfirmDisconnect(false)}>
        <DialogTitle>Disconnect Xero?</DialogTitle>
        <DialogContent>
          <Typography>Allyvia will stop syncing with this Xero organisation until you reconnect.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDisconnect(false)}>Cancel</Button>
          <Button color="error" onClick={handleDisconnect}>
            Disconnect
          </Button>
        </DialogActions>
      </Dialog>
    </MainCard>
  );
}
