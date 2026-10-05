import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import {
  Avatar,
  Box,
  Button,
  Paper,
  Stack,
  Tab,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { alpha } from '@mui/material/styles';

import { fetchCustomers, type CustomerListItem, type CustomerTier } from 'api/innerCircle.api';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import LocalityChip from './LocalityChip';
import TierChip from './TierChip';

const PAGE_SIZE = 25;
const ORDERING = '-ltv';

type TierFilter = 'all' | CustomerTier;

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

const MEDAL: Record<number, { color: string; label: string }> = {
  1: { color: '#FFD700', label: '🥇' },
  2: { color: '#C0C0C0', label: '🥈' },
  3: { color: '#CD7F32', label: '🥉' }
};

function RankBadge({ rank }: { rank: number }) {
  const medal = MEDAL[rank];
  if (medal) {
    return (
      <Tooltip title={`#${rank}`}>
        <Avatar
          sx={{
            width: 28,
            height: 28,
            bgcolor: medal.color,
            fontSize: 14,
            fontWeight: 900,
            color: '#fff',
            boxShadow: `0 0 0 2px ${medal.color}44`
          }}
        >
          <EmojiEventsIcon sx={{ fontSize: 16 }} />
        </Avatar>
      </Tooltip>
    );
  }
  return (
    <Typography variant="body2" fontWeight={700} color="text.secondary" sx={{ width: 28, textAlign: 'center' }}>
      {rank}
    </Typography>
  );
}

export interface LeaderboardProps {
  /** Opens the customer drawer on the 'overview' tab for the clicked row. */
  onOpenCustomer: (customerId: string) => void;
}

// ==============================|| INNER CIRCLE - LEADERBOARD ||============================== //
// Extracted from InnerCirclePage.tsx's former "members" section (Task 3.2).

export default function Leaderboard({ onOpenCustomer }: LeaderboardProps) {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const customerParams = useMemo(
    () => ({
      page: page + 1,
      page_size: PAGE_SIZE,
      ordering: ORDERING,
      search: debouncedSearch || undefined,
      tier: tierFilter === 'all' ? undefined : tierFilter
    }),
    [page, debouncedSearch, tierFilter]
  );

  const {
    data: customersData,
    isLoading: customersLoading,
    isError: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['inner-circle-customers', customerParams],
    queryFn: () => fetchCustomers(customerParams)
  });

  const customers: CustomerListItem[] = customersData?.results ?? [];
  const totalCustomers = customersData?.count ?? 0;

  const handleTierChange = (_event: React.SyntheticEvent, value: TierFilter) => {
    setTierFilter(value);
    setPage(0);
  };

  return (
    <MainCard title="LTV Leaderboard">
      <Stack spacing={2}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} justifyContent="space-between">
          <TextField
            placeholder="Search by name or email"
            size="small"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ width: { xs: '100%', sm: 320 } }}
          />
          <Tabs value={tierFilter} onChange={handleTierChange} variant="scrollable" scrollButtons="auto">
            <Tab label="All" value="all" sx={{ textTransform: 'none', minHeight: 40 }} />
            <Tab label="Vault" value="vault" sx={{ textTransform: 'none', minHeight: 40 }} />
            <Tab label="Regular" value="regular" sx={{ textTransform: 'none', minHeight: 40 }} />
            <Tab label="Shopper" value="shopper" sx={{ textTransform: 'none', minHeight: 40 }} />
          </Tabs>
        </Stack>

        <TableContainer component={Paper} sx={{ boxShadow: 'none' }}>
          <Table size="small" sx={{ minWidth: 960 }} aria-label="inner circle leaderboard table">
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: 48, pl: 1 }}>#</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Tier</TableCell>
                <TableCell align="right" sx={{ fontWeight: 900 }}>
                  LTV
                </TableCell>
                <TableCell align="right">Visits</TableCell>
                <TableCell align="right">Avg Order</TableCell>
                <TableCell>Last Visit</TableCell>
                <TableCell align="right">Days Silent</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {customersLoading && (
                <TableRow>
                  <TableCell colSpan={9}>Loading...</TableCell>
                </TableRow>
              )}
              {customersError && !customersLoading && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography color="error">Failed to load customers.</Typography>
                      <Button onClick={() => refetchCustomers()} size="small">
                        Retry
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              )}
              {!customersLoading && !customersError && customers.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9}>
                    <Typography color="textSecondary">No customers found.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {customers.map((customer, idx) => {
                const rank = page * PAGE_SIZE + idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <TableRow
                    key={customer.id}
                    hover
                    onClick={() => onOpenCustomer(customer.id)}
                    sx={{
                      cursor: 'pointer',
                      ...(isTop3 && {
                        bgcolor: rank === 1 ? alpha('#FFD700', 0.06) : rank === 2 ? alpha('#C0C0C0', 0.06) : alpha('#CD7F32', 0.06)
                      })
                    }}
                  >
                    <TableCell sx={{ pl: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <RankBadge rank={rank} />
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="subtitle2" fontWeight={isTop3 ? 900 : 600}>
                        {customer.name}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{customer.email}</TableCell>
                    <TableCell>
                      <TierChip tier={customer.tier} level={customer.tier_level} />
                      <LocalityChip locality={customer.locality} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={900} sx={{ color: isTop3 ? 'primary.main' : 'text.primary' }}>
                        {formatCurrency(customer.ltv)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{customer.visit_count}</TableCell>
                    <TableCell align="right">{formatCurrency(customer.avg_order_value)}</TableCell>
                    <TableCell>{customer.last_visit_at ? formatDate(customer.last_visit_at, 'MMM dd, yyyy') : '—'}</TableCell>
                    <TableCell align="right">{customer.days_since_last_visit != null ? customer.days_since_last_visit : '—'}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <TablePagination
          component="div"
          count={totalCustomers}
          page={page}
          onPageChange={(_event, newPage) => setPage(newPage)}
          rowsPerPage={PAGE_SIZE}
          rowsPerPageOptions={[PAGE_SIZE]}
        />
      </Stack>
    </MainCard>
  );
}
