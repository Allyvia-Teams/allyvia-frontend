import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';

import {
  Avatar,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  List,
  ListItem,
  ListItemText,
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
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PollOutlinedIcon from '@mui/icons-material/PollOutlined';

import {
  fetchActionQueue,
  fetchCustomers,
  fetchEmailDrafts,
  fetchInnerCircleSummary,
  type CustomerListItem,
  type CustomerTier
} from 'api/innerCircle.api';
import { useSelector } from 'store';
import { gridSpacing } from 'store/constant';
import { formatDate } from 'utils/dateUtils';
import MainCard from 'ui-component/cards/MainCard';
import AllyviaStats from 'ui-component/common/AllyviaStats';
import { ApprovalsTab, BenefitsTab, ContactsTab, PerksTab, PipelineTab, PromotionsTab, RedeemCodeDialog } from 'ui-component/inner-circle';
import CustomerDrawer from './CustomerDrawer';
import { parsePipelineView, parseSectionTab, type SectionTab } from './navigation';

const PAGE_SIZE = 25;
const ORDERING = '-ltv';

type TierFilter = 'all' | CustomerTier;
type MembersView = 'leaderboard' | 'all';

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

function TierBadge({ tier }: { tier: CustomerTier | null }) {
  if (!tier) {
    return (
      <Typography variant="body2" color="textSecondary">
        —
      </Typography>
    );
  }

  const config: Record<CustomerTier, { label: string; color: 'warning' | 'primary' | 'default' }> = {
    vault: { label: 'Vault', color: 'warning' },
    regular: { label: 'Regular', color: 'primary' },
    shopper: { label: 'Shopper', color: 'default' }
  };

  const { label, color } = config[tier];
  return <Chip label={label} size="small" color={color} variant="filled" />;
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

// ==============================|| INNER CIRCLE PAGE ||============================== //

export default function InnerCirclePage() {
  const navigate = useNavigate();
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [tierFilter, setTierFilter] = useState<TierFilter>('all');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const sectionTab = parseSectionTab(searchParams.get('tab'));
  const pipelineView = parsePipelineView(searchParams.get('view'));
  const [redeemOpen, setRedeemOpen] = useState(false);
  const [membersView, setMembersView] = useState<MembersView>('leaderboard');

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
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['inner-circle-summary', companyId],
    queryFn: () => fetchInnerCircleSummary(companyId!),
    enabled: !!companyId
  });

  const {
    data: customersData,
    isLoading: customersLoading,
    isError: customersError,
    refetch: refetchCustomers
  } = useQuery({
    queryKey: ['inner-circle-customers', customerParams],
    queryFn: () => fetchCustomers(customerParams),
    enabled: !!companyId
  });

  const { data: actionQueue, isLoading: actionQueueLoading, isError: actionQueueError, refetch: refetchActionQueue } = useQuery({
    queryKey: ['inner-circle-action-queue', companyId],
    queryFn: () => fetchActionQueue(),
    enabled: !!companyId
  });

  // Lightweight count of drafts awaiting approval — drives the Approvals tab badge.
  const { data: pendingDraftsData } = useQuery({
    queryKey: ['ic-email-drafts', 'pending-count', companyId],
    queryFn: () => fetchEmailDrafts({ status: 'draft', page: 1, page_size: 1 }),
    enabled: !!companyId
  });
  const pendingDraftCount = pendingDraftsData?.count ?? 0;

  const customers: CustomerListItem[] = customersData?.results ?? [];
  const totalCustomers = customersData?.count ?? 0;

  const handleTierChange = (_event: React.SyntheticEvent, value: TierFilter) => {
    setTierFilter(value);
    setPage(0);
  };

  const handleSectionChange = (_event: React.SyntheticEvent, value: SectionTab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', value);
    next.delete('view');
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  };

  const clearDeepLinkRecord = () => {
    if (!searchParams.has('recordId')) return;
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  };

  // Legacy /crm?tab=contacts&recordId=<contactId> → open that customer's drawer.
  useEffect(() => {
    if (sectionTab !== 'members') return;
    const recordId = searchParams.get('recordId');
    if (!recordId) return;
    setSelectedCustomerId(recordId);
    const next = new URLSearchParams(searchParams);
    next.delete('recordId');
    setSearchParams(next, { replace: true });
  }, [sectionTab, searchParams, setSearchParams]);

  if (!companyId) {
    return (
      <MainCard title="Inner Circle">
        <Typography color="textSecondary">Select a company to view Inner Circle.</Typography>
      </MainCard>
    );
  }

  return (
    <Grid container spacing={gridSpacing}>
      <Grid size={12}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={1.5}
          sx={{ mb: 0.5 }}
        >
          <Typography variant="h3">Inner Circle</Typography>
          <Stack direction="row" spacing={1.5}>
            <Button
              variant="outlined"
              startIcon={<ConfirmationNumberOutlinedIcon />}
              onClick={() => setRedeemOpen(true)}
              sx={{ textTransform: 'none' }}
            >
              Redeem code
            </Button>
            <Button
              variant="outlined"
              startIcon={<PollOutlinedIcon />}
              onClick={() => navigate('/inner-circle/surveys/drafts')}
              sx={{ textTransform: 'none' }}
            >
              Survey Drafts
            </Button>
          </Stack>
        </Stack>
      </Grid>

      <Grid size={12}>
        <Box
          sx={{
            display: 'flex',
            flexWrap: 'nowrap',
            gap: 2,
            alignItems: 'stretch',
            justifyContent: 'space-between',
            width: '100%',
            overflowX: 'auto'
          }}
        >
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <AllyviaStats title="Vault Members" value={summary?.vault_count ?? 0} theme="gold" loading={summaryLoading} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <AllyviaStats
              title="Total CRM LTV"
              value={formatCurrency(summary?.total_crm_ltv)}
              theme="success"
              loading={summaryLoading}
            />
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <AllyviaStats title="Active This Month" value={summary?.active_this_month ?? 0} theme="default" loading={summaryLoading} />
          </Box>
          <Box sx={{ flex: 1, minWidth: 180 }}>
            <AllyviaStats
              title="Automations Sent"
              value={summary?.automations_sent_month ?? 0}
              theme="default"
              loading={summaryLoading}
            />
          </Box>
        </Box>
        {summaryError && (
          <Stack direction="row" justifyContent="flex-end" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Typography variant="caption" color="error">
              Failed to load summary.
            </Typography>
            <Button size="small" onClick={() => refetchSummary()}>
              Retry
            </Button>
          </Stack>
        )}
      </Grid>

      <Grid size={12}>
        <Tabs
          value={sectionTab}
          onChange={handleSectionChange}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Members" value="members" sx={{ textTransform: 'none' }} />
          <Tab label="Pipeline" value="pipeline" sx={{ textTransform: 'none' }} />
          <Tab label="Promotions" value="promotions" sx={{ textTransform: 'none' }} />
          <Tab
            value="approvals"
            sx={{ textTransform: 'none' }}
            label={
              <Badge badgeContent={pendingDraftCount} color="error" max={99}>
                <Box component="span" sx={{ pr: pendingDraftCount > 0 ? 1.5 : 0 }}>
                  Approvals
                </Box>
              </Badge>
            }
          />
          <Tab label="Perks" value="perks" sx={{ textTransform: 'none' }} />
          <Tab label="Benefits" value="benefits" sx={{ textTransform: 'none' }} />
        </Tabs>
      </Grid>

      {sectionTab === 'pipeline' && (
        <Grid size={12}>
          <PipelineTab initialView={pipelineView} deepLinkRecordId={searchParams.get('recordId')} onDeepLinkHandled={clearDeepLinkRecord} />
        </Grid>
      )}

      {sectionTab === 'promotions' && (
        <Grid size={12}>
          <PromotionsTab />
        </Grid>
      )}

      {sectionTab === 'approvals' && (
        <Grid size={12}>
          <ApprovalsTab />
        </Grid>
      )}

      {sectionTab === 'perks' && (
        <Grid size={12}>
          <PerksTab />
        </Grid>
      )}

      {sectionTab === 'benefits' && (
        <Grid size={12}>
          <BenefitsTab />
        </Grid>
      )}

      {sectionTab === 'members' && (
      <Grid size={12}>
        <Tabs value={membersView} onChange={(_event, value: MembersView) => setMembersView(value)} sx={{ mb: 2 }}>
          <Tab label="Leaderboard" value="leaderboard" sx={{ textTransform: 'none', minHeight: 40 }} />
          <Tab label="All Customers" value="all" sx={{ textTransform: 'none', minHeight: 40 }} />
        </Tabs>
        {membersView === 'all' && <ContactsTab />}
        {membersView === 'leaderboard' && (
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 2, alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1, minWidth: 0, width: '100%' }}>
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
                        <TableCell align="right" sx={{ fontWeight: 900 }}>LTV</TableCell>
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
                            onClick={() => setSelectedCustomerId(customer.id)}
                            sx={{
                              cursor: 'pointer',
                              ...(isTop3 && {
                                bgcolor: rank === 1
                                  ? 'rgba(255, 215, 0, 0.06)'
                                  : rank === 2
                                  ? 'rgba(192, 192, 192, 0.06)'
                                  : 'rgba(205, 127, 50, 0.06)'
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
                            <TableCell sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {customer.email}
                            </TableCell>
                            <TableCell>
                              <TierBadge tier={customer.tier} />
                            </TableCell>
                            <TableCell align="right">
                              <Typography
                                variant="body2"
                                fontWeight={900}
                                sx={{ color: isTop3 ? 'primary.main' : 'text.primary' }}
                              >
                                {formatCurrency(customer.ltv)}
                              </Typography>
                            </TableCell>
                            <TableCell align="right">{customer.visit_count}</TableCell>
                            <TableCell align="right">{formatCurrency(customer.avg_order_value)}</TableCell>
                            <TableCell>
                              {customer.last_visit_at ? formatDate(customer.last_visit_at, 'MMM dd, yyyy') : '—'}
                            </TableCell>
                            <TableCell align="right">
                              {customer.days_since_last_visit != null ? customer.days_since_last_visit : '—'}
                            </TableCell>
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
          </Box>

          <Box sx={{ width: { xs: '100%', lg: 300 }, flexShrink: 0 }}>
            <MainCard title="Action Queue">
              {actionQueueLoading && <Typography color="textSecondary">Loading...</Typography>}
              {actionQueueError && !actionQueueLoading && (
                <Stack spacing={1}>
                  <Typography color="error" variant="body2">
                    Failed to load action queue.
                  </Typography>
                  <Button size="small" onClick={() => refetchActionQueue()}>
                    Retry
                  </Button>
                </Stack>
              )}
              {!actionQueueLoading && !actionQueueError && actionQueue && (
                <Stack spacing={2} divider={<Divider flexItem />}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Birthdays this week
                    </Typography>
                    {actionQueue.birthdays_this_week.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        None this week
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {actionQueue.birthdays_this_week.map((item) => (
                          <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={item.name}
                              secondary={`${item.birthday}${item.days_until === 0 ? ' · Today' : ` · in ${item.days_until}d`}`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Win-back candidates
                    </Typography>
                    {actionQueue.winback_candidates.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        None right now
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {actionQueue.winback_candidates.map((item) => (
                          <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={item.name}
                              secondary={`${item.days_silent} days silent`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>

                  <Box>
                    <Typography variant="subtitle2" gutterBottom>
                      Near promotion
                    </Typography>
                    {actionQueue.near_tier_promotions.length === 0 ? (
                      <Typography variant="body2" color="textSecondary">
                        None right now
                      </Typography>
                    ) : (
                      <List dense disablePadding>
                        {actionQueue.near_tier_promotions.map((item) => (
                          <ListItem key={item.id} disableGutters sx={{ py: 0.5 }}>
                            <ListItemText
                              primary={item.name}
                              secondary={`${formatCurrency(item.spend_to_next_tier)} to next tier`}
                              primaryTypographyProps={{ variant: 'body2', noWrap: true }}
                              secondaryTypographyProps={{ variant: 'caption' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    )}
                  </Box>
                </Stack>
              )}
            </MainCard>
          </Box>
        </Box>
        )}
      </Grid>
      )}

      <CustomerDrawer customerId={selectedCustomerId} onClose={() => setSelectedCustomerId(null)} />
      <RedeemCodeDialog open={redeemOpen} onClose={() => setRedeemOpen(false)} />
    </Grid>
  );
}
