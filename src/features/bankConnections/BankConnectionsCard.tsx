import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import { IconBuildingBank } from '@tabler/icons-react';

import bankConnectionsApi, { type BankConnection } from 'api/bankConnections';
import SettingsSectionCard from 'ui-component/settings/SettingsSectionCard';
import ConfirmActionDialog from 'ui-component/settings/team/ConfirmActionDialog';

import { runConnectFlow } from './connectFlow';
import { accountLabel, dateOnly, dateTime, minorToMoney, monthLabel } from './format';
import { errorStatus, useBankConnections } from './enabled';
import { loadStripeJs, publishableKey } from './stripeJs';

const PAGE_SIZE = 25;

const STATUS_CHIP: Record<BankConnection['status'], { label: string; color: 'success' | 'warning' | 'default' }> = {
  active: { label: 'Active', color: 'success' },
  inactive: { label: 'Needs reconnect', color: 'warning' },
  disconnected: { label: 'Disconnected', color: 'default' }
};

/**
 * Stripe Financial Connections: link business bank and card accounts, see balances
 * and raw transactions. Read-only data; nothing here categorises or moves money.
 *
 * Hidden entirely while the server flag is off (the list endpoint answers 404).
 */
export default function BankConnectionsCard() {
  const { data, error, isLoading, mutate } = useBankConnections();
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState<{ severity: 'error' | 'success'; text: string } | null>(null);
  const [openId, setOpenId] = useState<number | null>(null);
  const [toDisconnect, setToDisconnect] = useState<BankConnection | null>(null);
  const [disconnecting, setDisconnecting] = useState(false);
  const [disconnectError, setDisconnectError] = useState<string | null>(null);

  const status = errorStatus(error);
  if (error && (status === 404 || status === 403)) return null;

  const configured = Boolean(publishableKey());
  const connections = data ?? [];
  const hasLive = connections.some((c) => c.status !== 'disconnected');

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
        text: `${n} account${n === 1 ? '' : 's'} connected. Transactions arrive shortly, then refresh daily.`
      });
      await mutate();
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
      await mutate();
    } catch (err: any) {
      setDisconnectError(err?.response?.data?.detail || 'Could not disconnect this account. Please try again.');
    } finally {
      setDisconnecting(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Bank accounts"
      description="Connect your business bank or card account to see balances and transactions. Read-only; Allyvia never moves money from it."
      icon={<IconBuildingBank />}
      action={
        <Button variant={hasLive ? 'outlined' : 'contained'} size="small" onClick={connect} disabled={working || !configured}>
          {working ? 'Opening…' : hasLive ? 'Connect another account' : 'Connect your bank'}
        </Button>
      }
    >
      <Stack spacing={2}>
        {!configured && <Alert severity="info">Bank connections are not configured for this site yet.</Alert>}
        {message && (
          <Alert severity={message.severity} onClose={() => setMessage(null)}>
            {message.text}
          </Alert>
        )}
        {isLoading && <Skeleton variant="rounded" height={64} />}
        {error && !isLoading && <Alert severity="error">Could not load bank connections.</Alert>}
        {!isLoading && !error && connections.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            No accounts connected yet. Use a checking account or a business card; you can add more than one.
          </Typography>
        )}

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
                  {accountLabel(c)} · Balance {minorToMoney(c.balance_current, c.balance_currency)}
                  {c.balance_available !== null && ` (available ${minorToMoney(c.balance_available, c.balance_currency)})`}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Last refreshed {dateTime(c.last_refreshed_at)}
                </Typography>
              </Box>
              <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
                <Button size="small" onClick={() => setOpenId(openId === c.id ? null : c.id)}>
                  {openId === c.id ? 'Hide transactions' : 'Transactions'}
                </Button>
                {c.status !== 'disconnected' && (
                  <Button size="small" color="error" onClick={() => setToDisconnect(c)}>
                    Disconnect
                  </Button>
                )}
              </Stack>
            </Stack>
            {c.status === 'inactive' && (
              <Alert
                severity="warning"
                sx={{ mt: 1.5 }}
                action={
                  <Button color="inherit" size="small" onClick={connect} disabled={working || !configured}>
                    Reconnect
                  </Button>
                }
              >
                Your bank stopped sharing data for this account. Reconnect to resume daily updates.
              </Alert>
            )}
            {openId === c.id && <TransactionsPanel connection={c} />}
          </Box>
        ))}
      </Stack>

      <ConfirmActionDialog
        open={!!toDisconnect}
        title="Disconnect this account?"
        message={
          toDisconnect
            ? `${toDisconnect.institution_name} ${accountLabel(toDisconnect)} will stop updating. Transactions already imported stay visible.`
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
    </SettingsSectionCard>
  );
}

function TransactionsPanel({ connection }: { connection: BankConnection }) {
  const [page, setPage] = useState(0);
  const { data, error, isLoading } = useSWR(
    ['bank-connection-transactions', connection.id, page],
    () => bankConnectionsApi.transactions(connection.id, { page: page + 1, page_size: PAGE_SIZE }),
    { shouldRetryOnError: false, keepPreviousData: true }
  );

  if (isLoading && !data) return <Skeleton variant="rounded" height={120} sx={{ mt: 2 }} />;
  if (error)
    return (
      <Alert severity="error" sx={{ mt: 2 }}>
        Could not load transactions.
      </Alert>
    );
  if (!data || data.count === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
        No transactions yet. Stripe fetches history right after connecting; it can take a few minutes.
      </Typography>
    );
  }

  return (
    <Box sx={{ mt: 2 }}>
      {data.monthly_money_out.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mb: 1.5, flexWrap: 'wrap', rowGap: 1 }}>
          {data.monthly_money_out.slice(0, 6).map((m) => (
            <Chip
              key={`${m.month}-${m.currency}`}
              variant="outlined"
              size="small"
              label={`${monthLabel(m.month)} money out: ${minorToMoney(m.total, m.currency)}`}
            />
          ))}
        </Stack>
      )}
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Description</TableCell>
              <TableCell align="right">Amount</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.results.map((t) => (
              <TableRow key={t.id}>
                <TableCell sx={{ whiteSpace: 'nowrap' }}>{dateOnly(t.transacted_at)}</TableCell>
                <TableCell sx={{ maxWidth: 360, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.description || '—'}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    whiteSpace: 'nowrap',
                    color: t.amount < 0 ? 'text.primary' : 'success.dark',
                    textDecoration: t.status === 'void' ? 'line-through' : undefined
                  }}
                >
                  {minorToMoney(t.amount, t.currency)}
                </TableCell>
                <TableCell sx={{ textTransform: 'capitalize' }}>{t.status}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={data.count}
        page={page}
        onPageChange={(_, next) => setPage(next)}
        rowsPerPage={PAGE_SIZE}
        rowsPerPageOptions={[PAGE_SIZE]}
      />
    </Box>
  );
}
