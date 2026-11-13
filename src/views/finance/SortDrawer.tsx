import { useState } from 'react';
import { Alert, Box, Button, Drawer, IconButton, ListSubheader, MenuItem, Select, Skeleton, Stack, Typography } from '@mui/material';
import { IconX } from '@tabler/icons-react';
import { useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import bankingApi, { type BankCategory, type UnsortedMoneyOut } from 'api/banking';
import { bankMoney } from 'utils/bankMoney';
import { sortChoices } from './expenseTruth';

/**
 * Expense truth X5: "Not sorted yet" opens this. One row per merchant; picking a
 * category sorts that merchant's newest payment, which teaches a merchant rule
 * for every payment from it, past and future. The row then leaves on refetch.
 */
export default function SortDrawer({
  open,
  onClose,
  currency,
  unsorted,
  canSort
}: {
  open: boolean;
  onClose: () => void;
  currency: string;
  unsorted: UseQueryResult<UnsortedMoneyOut>;
  canSort: boolean;
}) {
  const qc = useQueryClient();
  const [saving, setSaving] = useState('');
  const [error, setError] = useState('');
  const merchants = (unsorted.data?.merchants ?? []).filter((m) => m.currency === currency);

  const sort = async (transactionId: string, category: BankCategory) => {
    setSaving(transactionId);
    setError('');
    try {
      await bankingApi.review(transactionId, category);
      await qc.invalidateQueries({ queryKey: ['banking'] });
    } catch {
      setError('Could not save that. Please try again.');
    } finally {
      setSaving('');
    }
  };

  return (
    <Drawer anchor="right" open={open} onClose={onClose} slotProps={{ paper: { sx: { width: { xs: '100%', sm: 440 } } } }}>
      <Stack spacing={2} sx={{ p: 2.5 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h4" component="h2">
            Not sorted yet
          </Typography>
          <IconButton aria-label="Close" onClick={onClose}>
            <IconX size={18} />
          </IconButton>
        </Stack>
        <Typography variant="body2" color="text.secondary">
          Pick a category once per merchant. It applies to every payment from them, past and future.
        </Typography>
        {error && <Alert severity="error">{error}</Alert>}
        {unsorted.isError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => unsorted.refetch()}>
                Retry
              </Button>
            }
          >
            Could not load what is not sorted yet.
          </Alert>
        ) : unsorted.isPending ? (
          <Skeleton variant="rounded" height={120} />
        ) : merchants.length === 0 ? (
          <Typography color="text.secondary">Everything in this period is sorted.</Typography>
        ) : (
          <Stack spacing={1.5}>
            {merchants.map((m) => (
              <Box key={m.merchant_key || 'no-name'} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap>{m.merchant_key ? m.name : 'Payments with no merchant name'}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {bankMoney(m.total, m.currency)} · {m.count} {m.count === 1 ? 'payment' : 'payments'}
                  </Typography>
                </Box>
                {m.merchant_key ? (
                  <Select
                    size="small"
                    displayEmpty
                    value=""
                    disabled={!canSort || !!saving}
                    sx={{ minWidth: 160 }}
                    inputProps={{ 'aria-label': `Category for ${m.name}` }}
                    onChange={(e) => sort(m.transaction_id, e.target.value as BankCategory)}
                    renderValue={() => (saving === m.transaction_id ? 'Saving…' : 'Choose')}
                  >
                    {sortChoices().flatMap((group) => [
                      <ListSubheader key={group.label}>{group.label}</ListSubheader>,
                      ...group.options.map((o) => (
                        <MenuItem key={o.value} value={o.value}>
                          {o.label}
                        </MenuItem>
                      ))
                    ])}
                  </Select>
                ) : (
                  <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 160 }}>
                    Sort these one at a time in Bank transactions.
                  </Typography>
                )}
              </Box>
            ))}
          </Stack>
        )}
        {!canSort && <Alert severity="info">An administrator can sort payments.</Alert>}
      </Stack>
    </Drawer>
  );
}
