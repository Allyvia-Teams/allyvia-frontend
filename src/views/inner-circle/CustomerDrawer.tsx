import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Drawer,
  FormControlLabel,
  IconButton,
  Skeleton,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';
import { IconCopy, IconX } from '@tabler/icons-react';

import { fetchCustomerDetail, updateCustomer, type CustomerUpdate } from 'api/innerCircle.api';
import TierChip from 'ui-component/inner-circle/TierChip';
import { formatDate } from 'utils/dateUtils';
import CustomerActivity from './CustomerActivity';

export type DrawerTab = 'overview' | 'activity';

export interface CustomerDrawerProps {
  customerId: string | null;
  initialTab?: DrawerTab;
  onClose: () => void;
}

const SIZE_FIELDS = [
  { key: 'top', label: 'Top' },
  { key: 'bottom', label: 'Bottom' },
  { key: 'shoes', label: 'Shoes' }
] as const;

type SizeKey = (typeof SIZE_FIELDS)[number]['key'];

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] || '';
  const second = parts[1]?.[0] || parts[0]?.[1] || '';
  return (first + second).toUpperCase();
}

function formatCurrency(value: number | string | null | undefined): string {
  const num = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(num);
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 0,
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: 'background.paper'
      }}
    >
      <Typography variant="caption" color="textSecondary" display="block" noWrap>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700} noWrap>
        {value}
      </Typography>
    </Box>
  );
}

function DrawerSkeleton() {
  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Skeleton variant="circular" width={56} height={56} />
        <Box sx={{ flex: 1 }}>
          <Skeleton variant="text" width="60%" height={28} />
          <Skeleton variant="text" width="40%" height={20} />
        </Box>
      </Stack>
      <Stack direction="row" spacing={1}>
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="rounded" height={64} sx={{ flex: 1 }} />
        ))}
      </Stack>
      <Skeleton variant="rounded" height={32} />
      <Skeleton variant="rounded" height={120} />
      <Skeleton variant="rounded" height={160} />
    </Stack>
  );
}

function readSizeValue(sizes: Record<string, string> | undefined, key: SizeKey): string {
  if (!sizes) return '';
  return sizes[key] ?? sizes[key.charAt(0).toUpperCase() + key.slice(1)] ?? '';
}

function buildSizesPayload(values: Record<SizeKey, string>): Record<string, string> {
  const payload: Record<string, string> = {};
  SIZE_FIELDS.forEach(({ key }) => {
    payload[key] = values[key].trim();
  });
  return payload;
}

export default function CustomerDrawer({ customerId, initialTab = 'overview', onClose }: CustomerDrawerProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [birthday, setBirthday] = useState('');
  const [sizeValues, setSizeValues] = useState<Record<SizeKey, string>>({ top: '', bottom: '', shoes: '' });
  const [optedIn, setOptedIn] = useState(false);
  const [tab, setTab] = useState<DrawerTab>(initialTab);

  useEffect(() => {
    if (customerId !== null) {
      setTab(initialTab);
    }
  }, [customerId, initialTab]);

  const {
    data: customer,
    isLoading,
    isError,
    refetch
  } = useQuery({
    queryKey: ['customer-detail', customerId],
    queryFn: () => fetchCustomerDetail(customerId!),
    enabled: customerId !== null
  });

  useEffect(() => {
    if (!customer) return;
    setBirthday(customer.birthday ?? '');
    setOptedIn(customer.opted_in);
    setSizeValues({
      top: readSizeValue(customer.sizes, 'top'),
      bottom: readSizeValue(customer.sizes, 'bottom'),
      shoes: readSizeValue(customer.sizes, 'shoes')
    });
  }, [customer]);

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CustomerUpdate>) => updateCustomer(customerId!, data),
    onSuccess: (updated) => {
      queryClient.setQueryData(['customer-detail', customerId], updated);
      queryClient.invalidateQueries({ queryKey: ['inner-circle-customers'] });
    },
    onError: () => {
      enqueueSnackbar('Failed to save customer info', { variant: 'error' });
    }
  });

  const sizesPayload = useMemo(() => buildSizesPayload(sizeValues), [sizeValues]);

  const saveBirthday = () => {
    if (!customer) return;
    const next = birthday || null;
    if (next === (customer.birthday ?? null)) return;
    updateMutation.mutate({ birthday: next });
  };

  const saveSizes = () => {
    if (!customer) return;
    const unchanged = SIZE_FIELDS.every(({ key }) => readSizeValue(customer.sizes, key) === sizeValues[key].trim());
    if (unchanged) return;
    updateMutation.mutate({ sizes: sizesPayload });
  };

  // Public portal links are built from the customer's portal_token — the same
  // tokenized links used in emails (see PublicRoutes: /profile and /survey).
  const copyPortalLink = async (kind: 'profile' | 'survey') => {
    if (!customer) return;
    const url = `${window.location.origin}/${kind}?token=${customer.portal_token}`;
    try {
      await navigator.clipboard.writeText(url);
      enqueueSnackbar(kind === 'profile' ? 'Profile link copied' : 'Survey link copied', { variant: 'success' });
    } catch {
      enqueueSnackbar('Could not copy link to clipboard', { variant: 'error' });
    }
  };

  const handleOptedInChange = (checked: boolean) => {
    if (!customer || checked === customer.opted_in) return;
    setOptedIn(checked);
    updateMutation.mutate(
      { opted_in: checked },
      {
        onError: () => setOptedIn(customer.opted_in)
      }
    );
  };

  return (
    <Drawer
      anchor="right"
      open={customerId !== null}
      onClose={onClose}
      PaperProps={{
        sx: { width: { xs: '100%', sm: 420 }, borderLeft: '1px solid', borderColor: 'divider' }
      }}
    >
      <Box sx={{ p: 2.5, height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1 }}>
          <IconButton onClick={onClose} size="small" aria-label="Close customer drawer">
            <IconX size={18} />
          </IconButton>
        </Stack>

        {isLoading && <DrawerSkeleton />}

        {isError && !isLoading && (
          <Stack spacing={1} alignItems="flex-start">
            <Typography color="error">Failed to load customer.</Typography>
            <Typography
              component="button"
              variant="body2"
              color="primary"
              onClick={() => refetch()}
              sx={{ border: 0, background: 'none', cursor: 'pointer', p: 0 }}
            >
              Retry
            </Typography>
          </Stack>
        )}

        {!isLoading && !isError && customer && (
          <>
            <Tabs
              value={tab}
              onChange={(_event, value: DrawerTab) => setTab(value)}
              sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
            >
              <Tab label="Overview" value="overview" sx={{ textTransform: 'none', minHeight: 40 }} />
              <Tab label="Activity" value="activity" sx={{ textTransform: 'none', minHeight: 40 }} />
            </Tabs>
            {tab === 'overview' && (
              <Stack spacing={3}>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Avatar sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontWeight: 700 }}>{getInitials(customer.name)}</Avatar>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h4" noWrap>
                      {customer.name}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" sx={{ mt: 0.5 }}>
                      <TierChip tier={customer.tier} level={customer.tier_level} />
                      <Chip
                        size="small"
                        variant="outlined"
                        label={optedIn ? 'Opted in' : 'Not opted in'}
                        color={optedIn ? 'success' : 'default'}
                      />
                    </Stack>
                  </Box>
                </Stack>

                <Stack direction="row" spacing={1}>
                  <StatBox label="LTV" value={formatCurrency(customer.ltv)} />
                  <StatBox label="Visits" value={customer.visit_count} />
                  <StatBox label="Avg Order" value={formatCurrency(customer.avg_order_value)} />
                  <StatBox
                    label="Days Since Last Visit"
                    value={customer.days_since_last_visit != null ? customer.days_since_last_visit : '—'}
                  />
                </Stack>

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconCopy size={16} />}
                    onClick={() => copyPortalLink('profile')}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy profile link
                  </Button>
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<IconCopy size={16} />}
                    onClick={() => copyPortalLink('survey')}
                    sx={{ textTransform: 'none' }}
                  >
                    Copy survey link
                  </Button>
                </Stack>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Style tags
                  </Typography>
                  {customer.style_tags.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No style data yet.
                    </Typography>
                  ) : (
                    <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
                      {customer.style_tags.map((tag) => (
                        <Chip key={tag} label={tag} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Box>

                <Box>
                  <Typography variant="subtitle2" gutterBottom>
                    Recent sales
                  </Typography>
                  {customer.recent_sales.length === 0 ? (
                    <Typography variant="body2" color="textSecondary">
                      No recent sales.
                    </Typography>
                  ) : (
                    <Stack spacing={1}>
                      {customer.recent_sales.map((sale) => (
                        <Box
                          key={sale.id}
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: 1,
                            py: 0.75,
                            borderBottom: '1px solid',
                            borderColor: 'divider',
                            '&:last-child': { borderBottom: 0 }
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {formatDate(sale.transaction_date, 'MMM dd')}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {sale.line_count} {sale.line_count === 1 ? 'item' : 'items'}
                            </Typography>
                          </Box>
                          <Typography variant="body2" fontWeight={700}>
                            {formatCurrency(sale.total)}
                          </Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </Box>

                <Divider />

                <Box>
                  <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                    Customer info
                  </Typography>
                  <Stack spacing={2}>
                    <TextField
                      label="Birthday"
                      type="date"
                      size="small"
                      value={birthday}
                      onChange={(e) => setBirthday(e.target.value)}
                      onBlur={saveBirthday}
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      disabled={updateMutation.isPending}
                    />

                    {SIZE_FIELDS.map(({ key, label }) => (
                      <TextField
                        key={key}
                        label={label}
                        size="small"
                        value={sizeValues[key]}
                        onChange={(e) => setSizeValues((prev) => ({ ...prev, [key]: e.target.value }))}
                        onBlur={saveSizes}
                        fullWidth
                        disabled={updateMutation.isPending}
                      />
                    ))}

                    <FormControlLabel
                      control={
                        <Switch
                          checked={optedIn}
                          onChange={(_, checked) => handleOptedInChange(checked)}
                          disabled={updateMutation.isPending}
                        />
                      }
                      label="Opted in to marketing"
                    />
                  </Stack>
                </Box>
              </Stack>
            )}
            {tab === 'activity' && customerId && <CustomerActivity customerId={customerId} customerName={customer.name} />}
          </>
        )}
      </Box>
    </Drawer>
  );
}
