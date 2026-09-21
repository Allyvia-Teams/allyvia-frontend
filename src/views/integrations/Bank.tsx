import { useState } from 'react';
import { Alert, Button, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'store';
import bankingApi from 'api/banking';
import { PageHeader } from 'ui-component/frame';
import MainCard from 'ui-component/cards/MainCard';
import { useFinancialSource } from 'views/finance/useFinancialSource';
import BankLinkButton from './BankLinkButton';
import FinancialSourcePicker from './FinancialSourcePicker';
import { INTEGRATIONS_HUB_ROUTE } from './routes';

export default function BankIntegration() {
  const status = useFinancialSource();
  const isAdmin = useSelector((state) => state.auth.currentRole?.role_type === 'admin');
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const action = async (kind: 'sync' | 'disconnect') => {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await bankingApi[kind]();
      setNotice(kind === 'sync' ? 'Scan queued. Check Finance & accounting for updated transactions.' : 'Bank disconnected.');
      await qc.invalidateQueries({ queryKey: ['banking'] });
    } catch {
      setError('The request failed. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  const connection = status.data?.connection;
  return (
    <>
      <PageHeader
        title="Bank connection"
        subtitle="Bring bank activity into your daily business picture"
        right={<Button onClick={() => navigate(INTEGRATIONS_HUB_ROUTE)}>Back to integrations</Button>}
      />
      <MainCard>
        <Stack spacing={2}>
          <FinancialSourcePicker />
          <Typography>
            Connect your business checking, savings and credit card accounts at one institution. Allyvia imports transactions automatically
            and checks for updates daily.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your bank handles authorization through Plaid. Allyvia receives read access to the accounts you select.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Correcting a category creates a rule for that merchant; manage rules in Finance &amp; accounting.
          </Typography>
          {connection && (
            <Typography variant="body2">
              Last scan: {connection.last_synced_at ? new Date(connection.last_synced_at).toLocaleString() : 'Waiting for first scan'}
            </Typography>
          )}
          {connection?.error_code && <Alert severity="warning">The bank connection needs attention. Reconnect to restore updates.</Alert>}
          {isAdmin && status.data?.bank_available && status.data.source === 'bank' && (
            <BankLinkButton connectionId={connection?.id} disabled={busy} />
          )}
          {isAdmin && connection && (
            <Stack direction="row" spacing={1}>
              <Button disabled={busy || status.data?.source !== 'bank'} onClick={() => action('sync')}>
                Scan now
              </Button>
              <Button color="error" disabled={busy} onClick={() => action('disconnect')}>
                Disconnect bank
              </Button>
            </Stack>
          )}
          {!isAdmin && <Alert severity="info">An administrator can manage the bank connection.</Alert>}
          {notice && <Alert severity="info">{notice}</Alert>}
          {error && <Alert severity="error">{error}</Alert>}
          <Button sx={{ alignSelf: 'flex-start' }} onClick={() => navigate('/finance')}>
            View Finance &amp; accounting
          </Button>
        </Stack>
      </MainCard>
    </>
  );
}
