import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Alert,
  Box,
  Button,
  Divider,
  FormControlLabel,
  InputAdornment,
  Paper,
  Skeleton,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';

import {
  fetchTierBenefits,
  lookupMembership,
  saveTierBenefits,
  type CustomerTier,
  type MembershipLookupResult,
  type TierBenefit,
  type TierBenefitInput
} from 'api/innerCircle.api';
import MainCard from 'ui-component/cards/MainCard';
import TierChip from './TierChip';
import { formatPct } from './formatters';

const TIER_ORDER: CustomerTier[] = ['vault', 'regular', 'shopper'];

const TIER_DEFAULTS: Record<CustomerTier, { label: string }> = {
  vault: { label: 'Vault' },
  regular: { label: 'Regular' },
  shopper: { label: 'Shopper' }
};

interface BenefitRow {
  label: string;
  storewide_discount_pct: string;
  perks_description: string;
  is_active: boolean;
}

type BenefitRows = Record<CustomerTier, BenefitRow>;

function defaultRows(): BenefitRows {
  return {
    vault: { label: TIER_DEFAULTS.vault.label, storewide_discount_pct: '0', perks_description: '', is_active: true },
    regular: { label: TIER_DEFAULTS.regular.label, storewide_discount_pct: '0', perks_description: '', is_active: true },
    shopper: { label: TIER_DEFAULTS.shopper.label, storewide_discount_pct: '0', perks_description: '', is_active: true }
  };
}

function toRows(benefits: TierBenefit[]): BenefitRows {
  const rows = defaultRows();
  benefits.forEach((benefit) => {
    if (benefit.tier in rows) {
      rows[benefit.tier] = {
        label: benefit.label,
        storewide_discount_pct: String(Number(benefit.storewide_discount_pct)),
        perks_description: benefit.perks_description,
        is_active: benefit.is_active
      };
    }
  });
  return rows;
}

function MemberLookup() {
  const { enqueueSnackbar } = useSnackbar();

  const [email, setEmail] = useState('');
  const [result, setResult] = useState<MembershipLookupResult | null>(null);

  const lookupMutation = useMutation({
    mutationFn: (value: string) => lookupMembership(value),
    onSuccess: (data) => setResult(data),
    onError: () => enqueueSnackbar('Lookup failed', { variant: 'error' })
  });

  const search = () => {
    const value = email.trim();
    if (!value) return;
    setResult(null);
    lookupMutation.mutate(value);
  };

  return (
    <Box>
      <Typography variant="subtitle1" fontWeight={700} gutterBottom>
        Member lookup
      </Typography>
      <Typography variant="body2" color="textSecondary" sx={{ mb: 1.5 }}>
        Look up a member by email to see their tier and benefits at each Allyvia boutique.
      </Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 2 }}>
        <TextField
          placeholder="member@example.com"
          type="email"
          size="small"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') search();
          }}
          sx={{ width: { xs: '100%', sm: 320 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            )
          }}
        />
        <Button variant="outlined" onClick={search} disabled={!email.trim() || lookupMutation.isPending} sx={{ textTransform: 'none' }}>
          {lookupMutation.isPending ? 'Searching…' : 'Search'}
        </Button>
      </Stack>

      {result && !result.member && (
        <Typography variant="body2" color="textSecondary">
          No Inner Circle member found for that email.
        </Typography>
      )}

      {result?.member && (
        <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid', borderColor: 'divider' }}>
          <Table size="small" aria-label="member stores table">
            <TableHead>
              <TableRow>
                <TableCell>Boutique</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell align="right">Storewide discount</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.member.stores.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3}>
                    <Typography variant="body2" color="textSecondary">
                      This member is not enrolled at any boutique yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
              {result.member.stores.map((store) => (
                <TableRow key={store.company_id}>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>
                      {store.company_name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {store.tier_label}
                    <Typography variant="caption" color="textSecondary" component="span">
                      {' '}
                      ({store.tier})
                    </Typography>
                  </TableCell>
                  <TableCell align="right">{formatPct(store.storewide_discount_pct)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

export default function BenefitsTab() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [rows, setRows] = useState<BenefitRows>(defaultRows());

  const { data: benefits, isLoading, isError, refetch } = useQuery({
    queryKey: ['ic-tier-benefits'],
    queryFn: fetchTierBenefits
  });

  useEffect(() => {
    if (benefits) setRows(toRows(benefits));
  }, [benefits]);

  const setRow = (tier: CustomerTier, patch: Partial<BenefitRow>) => {
    setRows((prev) => ({ ...prev, [tier]: { ...prev[tier], ...patch } }));
  };

  const isValid = TIER_ORDER.every((tier) => {
    const row = rows[tier];
    const pct = Number(row.storewide_discount_pct);
    return row.label.trim().length > 0 && !Number.isNaN(pct) && pct >= 0 && pct <= 100;
  });

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload: TierBenefitInput[] = TIER_ORDER.map((tier) => ({
        tier,
        label: rows[tier].label.trim(),
        storewide_discount_pct: String(Number(rows[tier].storewide_discount_pct)),
        perks_description: rows[tier].perks_description.trim(),
        is_active: rows[tier].is_active
      }));
      return saveTierBenefits(payload);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData(['ic-tier-benefits'], saved);
      enqueueSnackbar('Tier benefits saved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to save tier benefits', { variant: 'error' })
  });

  return (
    <MainCard title="Tier benefits">
      <Stack spacing={3}>
        <Alert severity="info">
          Members carry one Inner Circle identity across Allyvia boutiques, but their tier and benefits are yours to set for your
          store.
        </Alert>

        {isLoading && (
          <Stack spacing={2}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} variant="rounded" height={96} />
            ))}
          </Stack>
        )}

        {isError && !isLoading && (
          <Stack direction="row" spacing={2} alignItems="center">
            <Typography color="error">Failed to load tier benefits.</Typography>
            <Button size="small" onClick={() => refetch()}>
              Retry
            </Button>
          </Stack>
        )}

        {!isLoading && !isError && (
          <>
            <Stack spacing={2}>
              {TIER_ORDER.map((tier) => {
                const row = rows[tier];
                return (
                  <Paper
                    key={tier}
                    elevation={0}
                    sx={{ p: 2, borderRadius: 2, border: '1px solid', borderColor: 'divider', opacity: row.is_active ? 1 : 0.65 }}
                  >
                    <Stack
                      direction={{ xs: 'column', md: 'row' }}
                      spacing={2}
                      alignItems={{ md: 'center' }}
                    >
                      <Box sx={{ width: 90, flexShrink: 0 }}>
                        <TierChip tier={tier} />
                      </Box>
                      <TextField
                        label="Label"
                        size="small"
                        value={row.label}
                        onChange={(e) => setRow(tier, { label: e.target.value })}
                        sx={{ width: { xs: '100%', md: 180 } }}
                        helperText={`Shown to members (e.g. “Gold”)`}
                      />
                      <TextField
                        label="Storewide discount"
                        type="number"
                        size="small"
                        value={row.storewide_discount_pct}
                        onChange={(e) => setRow(tier, { storewide_discount_pct: e.target.value })}
                        inputProps={{ min: 0, max: 100 }}
                        InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
                        sx={{ width: { xs: '100%', md: 170 } }}
                      />
                      <TextField
                        label="Perks"
                        size="small"
                        value={row.perks_description}
                        onChange={(e) => setRow(tier, { perks_description: e.target.value })}
                        fullWidth
                        multiline
                        maxRows={3}
                        placeholder="e.g. Early access to new arrivals, free tailoring"
                      />
                      <FormControlLabel
                        control={<Switch checked={row.is_active} onChange={(_, checked) => setRow(tier, { is_active: checked })} />}
                        label="Active"
                        sx={{ flexShrink: 0 }}
                      />
                    </Stack>
                  </Paper>
                );
              })}
            </Stack>

            <Stack direction="row" justifyContent="flex-end">
              <Button
                variant="contained"
                onClick={() => saveMutation.mutate()}
                disabled={!isValid || saveMutation.isPending}
                sx={{ textTransform: 'none' }}
              >
                {saveMutation.isPending ? 'Saving…' : 'Save benefits'}
              </Button>
            </Stack>
          </>
        )}

        <Divider />

        <MemberLookup />
      </Stack>
    </MainCard>
  );
}
