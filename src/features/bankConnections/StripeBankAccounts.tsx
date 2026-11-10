import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import bankConnectionsApi, { type BankConnection } from 'api/bankConnections';
import ConfirmActionDialog from 'ui-component/settings/team/ConfirmActionDialog';

import { runConnectFlow } from './connectFlow';
import { accountLabel, dateTime } from './format';
import { useBankConnections } from './enabled';
import { loadStripeJs, publishableKey } from './stripeJs';

const STATUS_CHIP: Record<BankConnection['status'], { label: string; color: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Needs reconnect', color: 'warning' },
  disconnected: { label: 'Disconnected', color: 'default' }
};

/**
 * The one place to connect a bank (Stripe Financial Connections), rendered on
 * /integrations/bank. Lists linked accounts; transactions, balances and
 * categories live in Finance & accounting, in one sign convention.
 *
 * `canConnect` is false until the owner picks "Bank daily scan", the same rule
 * the bank page has always had: connected accounts feed Finance only then.
 */
export default function StripeBankAccounts({ canConnect }: { canConnect: boolean }) {
  const qc = useQueryClient();
  const { data, error, isLoading, mutate } = useBankConnections();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ severity: 'error' | 'success'; text: string } | null>(null);
  const [toDisconnect, setToDisconnect] = useState<BankConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const configured = Boolean(publishableKey());
  const connections = data ?? [];
  const hasLive = connections.some((c) => c.status !== 'disconnected');

  const refreshAll = async () => {
    await mutate();
    // Finance and the source picker read the projected connection.
    await qc.invalidateQueries({ queryKey: ['banking'] });
  };

  const connect = async () => {
    setWorking(true);
    setMessage(null);
    const outcome = await runConnectFlow({
      createSession: bankConnectionsApi.createSession,
      loadStripe: () => loadStripeJs(),
      link: bankConnectionsApi.link
    });
    setWorking(false);
    if (outcome.kind === 'linked') {
      const n = outcome.connections.length;
      setMessage({
        severity: 'success',
        text: `${n} account${n === 1 ? '' : 's'} connected. Transactions appear in Finance & accounting shortly, then refresh daily.`
      });
      await refreshAll();
    } else if (outcome.kind === 'error') {
      setMessage({ severity: 'error', text: outcome.message });
    }
    // 'cancelled': the user closed Stripe's window. Say nothing.
  };

  const confirmDisconnect = async () => {
    if (!toDisconnect) return;
    setDisconnecting(true);
    setDisconnectError(null);
    try {
      await bankConnectionsApi.disconnect(toDisconnect.id);
      setToDisconnect(null);
      await refreshAll();
    } catch (err: any) {
      setDisconnectError(err?.response?.data?.detail || 'Could not disconnect this account. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  const connectDisabled = working || !configured || !canConnect;

  return (
    <Stack spacing={2}>
      <Box>
        <Button variant={hasLive ? 'outlined' : 'contained'} onClick={connect} disabled={connectDisabled}>
          {working ? 'Opening…' : hasLive ? 'Connect another account' : 'Connect bank'}
        </Button>
      </Box>
      {!canConnect && (
        <Typography variant="body2" color="text.secondary">
          Choose Bank daily scan above to connect a bank.
        </Typography>
      )}
      {!configured && <Alert severity="info">Bank connections are not configured for this site yet.</Alert>}
      {message && (
        <Alert severity={message.severity} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}
      {isLoading && <Skeleton variant="rounded" height={64} />}
      {error && !isLoading && <Alert severity="error">Could not load connected accounts.</Alert>}

      {connections.map((c, i) => (
        <Box key={c.id}>
          {i > 0 && <Divider sx={{ mb: 2 }} />}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }} justifyContent="space-between">
            <Box sx={{ minWidth: 0 }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography sx={{ fontWeight: 600 }} noWrap>
                  {c.institution_name || 'Bank'}
                </Typography>
                <Chip size="small" label={STATUS_CHIP[c.status].label} color={STATUS_CHIP[c.status].color} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {accountLabel(c)}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last refreshed {dateTime(c.last_refreshed_at)}
              </Typography>
            </Box>
            {c.status !== 'disconnected' && (
              <Button size="small" color="error" onClick={() => setToDisconnect(c)} sx={{ flexShrink: 0 }}>
                Disconnect
              </Button>
            )}
          </Stack>
          {c.status === 'inactive' && (
            <Alert
              severity="warning"
              sx={{ mt: 1.5 }}
              action={
                <Button color="inherit" size="small" onClick={connect} disabled={connectDisabled}>
                  Reconnect
                </Button>
              }
            >
              Your bank stopped sharing data for this account. Reconnect to resume daily updates.
            </Alert>
          )}
        </Box>
      ))}

      <ConfirmActionDialog
        open={!!toDisconnect}
        title="Disconnect this account?"
        message={
          toDisconnect
            ? `${toDisconnect.institution_name} ${accountLabel(toDisconnect)} will stop updating. Its imported transactions are kept but leave the Finance totals.`
            : ''
        }
        confirmLabel="Disconnect"
        destructive
        working={disconnecting}
        error={disconnectError}
        onClose={() => {
          setToDisconnect(null);
          setDisconnectError(null);
        }}
        onConfirm={confirmDisconnect}
      />
    </Stack>
  );
}
