import { useState } from 'react';
import { Alert, Button, FormControlLabel, Radio, RadioGroup, Stack, Typography } from '@mui/material';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import bankingApi, { type FinancialSource } from 'api/banking';
import { useFinancialSource } from 'views/finance/useFinancialSource';
import { isAdminOrAbove } from 'utils/role';
import { bankConnectionsEnabled, bankScanUnavailableMessage, useBankConnections } from 'features/bankConnections/enabled';

export default function FinancialSourcePicker() {
  const status = useFinancialSource();
  const role = useSelector(selectEffectiveRole);
  const isAdmin = isAdminOrAbove(role?.role_type);
  // Shared SWR key with the Bank accounts card: no extra request on Settings.
  const bankConnectionsOn = bankConnectionsEnabled(useBankConnections(isAdmin));
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const select = async (source: FinancialSource) => {
    setBusy(true);
    setError('');
    try {
      await bankingApi.selectSource(source);
      await qc.invalidateQueries({ queryKey: ['banking'] });
      await qc.invalidateQueries({ queryKey: ['dashboard-finance-kpis'] });
    } catch {
      setError('Could not save the financial source. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  if (status.isLoading) return <Typography>Loading financial source…</Typography>;
  if (status.isError || !status.data)
    return (
      <Alert severity="error">
        Could not load the financial source. <Button onClick={() => status.refetch()}>Retry</Button>
      </Alert>
    );
  const current = status.data;
  return (
    <Stack spacing={1} sx={{ mb: 2 }}>
      <Typography variant="h5">Daily financial source</Typography>
      <Typography variant="body2" color="text.secondary">
        Choose QuickBooks or your bank. Allyvia uses this source for finance and daily recommendations.
      </Typography>
      <RadioGroup row value={current.choice_saved ? current.source : ''} onChange={(_, value) => void select(value as FinancialSource)}>
        <FormControlLabel value="quickbooks" control={<Radio />} label="QuickBooks daily scan" disabled={!isAdmin || busy} />
        <FormControlLabel value="bank" control={<Radio />} label="Bank daily scan" disabled={!isAdmin || busy || !current.bank_available} />
      </RadioGroup>
      {!current.bank_available && (
        <Typography variant="body2" color="text.secondary">
          {bankScanUnavailableMessage(bankConnectionsOn)}
        </Typography>
      )}
      {isAdmin && current.choice_saved && (
        <Button
          sx={{ alignSelf: 'flex-start' }}
          variant="outlined"
          onClick={() => navigate(current.source === 'bank' ? '/integrations/bank' : '/integrations/quickbooks')}
        >
          {current.source === 'bank'
            ? current.connection
              ? 'Manage bank connection'
              : 'Connect bank'
            : current.quickbooks_connected
              ? 'Manage QuickBooks'
              : 'Connect QuickBooks'}
        </Button>
      )}
      {isAdmin && current.source === 'quickbooks' && current.connection && (
        <Alert severity="info" action={<Button onClick={() => navigate('/integrations/bank')}>Manage bank</Button>}>
          Bank scans are paused. The bank connection is retained until you disconnect it.
        </Alert>
      )}
      {error && <Alert severity="error">{error}</Alert>}
    </Stack>
  );
}
