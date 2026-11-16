import { Alert, Box, Button, Grid, Stack, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';

// project imports
import { useSelector } from 'store';
import { selectEffectiveRole } from 'store/selectors/effectiveRole';
import bankingApi from 'api/banking';
import { Panel } from 'ui-component/frame';
import { bankMoney as money } from 'utils/bankMoney';
import type { Range } from './snapshotView';

// Bank owners' bank report, moved unchanged from the old bank page (BankFinance.tsx): the
// connection alerts, when Allyvia last scanned, every cash and card figure the bank report
// gives per currency, and every connected account including cards. Figures are the report's own.

export default function BankCashReport({ range }: { range: Range }) {
  const role = useSelector(selectEffectiveRole);
  const bankRange = { start_date: range.start, end_date: range.end };
  const report = useQuery({
    queryKey: ['banking', 'report', role?.company_id, role?.id, bankRange],
    queryFn: () => bankingApi.report(bankRange),
    enabled: !!role?.company_id,
    refetchInterval: 30_000,
    retry: false
  });
  if (report.isLoading) return <Typography>Loading bank activity…</Typography>;
  if (report.isError || !report.data)
    return (
      <Alert severity="error">
        Could not load bank activity. <Button onClick={() => report.refetch()}>Retry</Button>
      </Alert>
    );
  const r = report.data;
  return (
    <Stack spacing={2}>
      {!r.connected && <Alert severity="info">Connect a bank to automatically populate this page.</Alert>}
      {r.connected && !r.history_complete && <Alert severity="info">Your bank history is still importing. Totals may be incomplete.</Alert>}
      {r.connected && r.stale && <Alert severity="warning">Bank updates need attention. These figures may be out of date.</Alert>}
      <Typography variant="body2" color="text.secondary">
        Last Allyvia scan: {r.last_synced_at ? new Date(r.last_synced_at).toLocaleString() : 'Not yet scanned'}. Bank data updated:{' '}
        {r.institution_updated_at ? new Date(r.institution_updated_at).toLocaleString() : 'Not provided by bank'}.
      </Typography>
      {r.currencies.map((currency) => (
        <Panel key={currency.currency} title={`Bank activity · ${currency.currency}`}>
          <Grid container spacing={2} sx={{ p: '14px' }}>
            {(
              [
                ['Cash balance', currency.cash_balance],
                ['Cash in', currency.cash_in],
                ['Cash out', currency.cash_out],
                ['Net cash movement', currency.net_cash_movement],
                ['Categorized business income', currency.classified_income],
                ['Credit card balance', currency.card_balance],
                ['Card spending', currency.card_spending],
                ['Pending outflows', currency.pending_outflows]
              ] as const
            ).map(([label, value]) => (
              <Grid size={{ xs: 12, sm: 6, md: 3 }} key={label}>
                <Typography variant="body2" color="text.secondary">
                  {label}
                </Typography>
                <Typography sx={{ fontSize: '1.125rem', fontWeight: 600, color: 'text.dark' }}>
                  {money(value, currency.currency)}
                </Typography>
              </Grid>
            ))}
          </Grid>
        </Panel>
      ))}
      <Typography variant="body2" color="text.secondary">
        Cash in and out include transfers; card activity is separate. Bank activity does not establish unpaid invoices, inventory costs or
        an accrual profit statement.
      </Typography>
      {r.accounts.length > 0 && (
        <Panel title="Connected accounts">
          <Stack spacing={1} sx={{ p: '14px' }}>
            {r.accounts.map((account) => (
              <Box key={account.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
                <Typography>
                  {account.name} {account.mask && `••${account.mask}`}{' '}
                  <Typography component="span" variant="caption">
                    ({account.type === 'credit' ? 'Credit card' : 'Bank account'})
                  </Typography>
                </Typography>
                <Typography sx={{ whiteSpace: 'nowrap' }}>{money(account.current_balance, account.currency)}</Typography>
              </Box>
            ))}
          </Stack>
        </Panel>
      )}
    </Stack>
  );
}
