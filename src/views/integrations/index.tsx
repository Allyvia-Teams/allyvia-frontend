import { Alert, Box, Button, Card, CardActions, CardContent, Chip, Grid, Stack, Typography } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'store';
import { useEffect } from 'react';
import useSWR from 'swr';
import MainCard from 'ui-component/cards/MainCard';
import { PageHeader } from 'ui-component/frame';
import { gridSpacing } from 'store/constant';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import SquareIcon from 'assets/images/icons/square_logo.png';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import { fetchQBConnectionStatus, fetchSquareConnectionStatus } from 'store/slices/integrations';
import stripeApi from 'api/stripe.api';
import subscriptionAPI from 'api/subscription.api';
import FinancialSourcePicker from './FinancialSourcePicker';
import { useFinancialSource } from 'views/finance/useFinancialSource';

export interface IntegrationCatalogItem {
  id: string;
  name: string;
  description: string;
  category: 'Accounting' | 'Banking' | 'Payments' | 'Point of sale' | 'Data import';
  availability: 'available' | 'coming_soon';
  route?: string;
}

export const createIntegrationCatalog = (): IntegrationCatalogItem[] => [
  {
    id: 'bank',
    name: 'Bank account',
    description: 'Connect your business accounts for daily transaction updates.',
    category: 'Banking',
    availability: 'available',
    route: '/integrations/bank'
  },
  {
    id: 'quickbooks',
    name: 'QuickBooks',
    description: 'Sync invoices, customers, and accounting entries.',
    category: 'Accounting',
    availability: 'available',
    route: '/integrations/quickbooks'
  },
  {
    id: 'square',
    name: 'Square',
    description: 'Connect sales, inventory, and payment data from Square.',
    category: 'Point of sale',
    availability: 'available',
    route: '/integrations/square'
  },
  {
    id: 'stripe-connect',
    name: 'Stripe Payments',
    description: 'Take card payments in store and receive payouts.',
    category: 'Payments',
    availability: 'available',
    route: '/settings/payments/onboarding'
  },
  {
    id: 'stripe-billing',
    name: 'Stripe Billing',
    description: 'Manage subscription billing for your Allyvia plan.',
    category: 'Payments',
    availability: 'available',
    route: '/settings?tab=billing'
  },
  {
    id: 'csv',
    name: 'CSV import',
    description: 'Import customers, products, stock, and sales from a spreadsheet.',
    category: 'Data import',
    availability: 'available',
    route: '/integrations/pos/connect/csv'
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect Shopify and Shopify POS data.',
    category: 'Point of sale',
    availability: 'available',
    route: '/integrations/pos/connect/shopify'
  },
  {
    id: 'lightspeed',
    name: 'Lightspeed',
    description: 'Connect your Lightspeed Retail catalog and sales.',
    category: 'Point of sale',
    availability: 'coming_soon'
  },
  {
    id: 'clover',
    name: 'Clover',
    description: 'Connect Clover inventory, customers, and orders.',
    category: 'Point of sale',
    availability: 'coming_soon'
  },
  {
    id: 'xero',
    name: 'Xero',
    description: 'Sync accounting data with Xero.',
    category: 'Accounting',
    availability: 'coming_soon'
  }
];

export type IntegrationDisplayStatus = 'available' | 'connected' | 'needs_attention' | 'unavailable' | 'loading';

interface IntegrationCatalogGridProps {
  items: IntegrationCatalogItem[];
  statusById: Partial<Record<string, IntegrationDisplayStatus>>;
  canManage: boolean;
  onNavigate: (route: string) => void;
}

const statusDetails = (status: IntegrationDisplayStatus | 'coming_soon') => {
  switch (status) {
    case 'connected':
      return { label: 'Connected', color: 'success' as const };
    case 'needs_attention':
      return { label: 'Needs attention', color: 'warning' as const };
    case 'unavailable':
      return { label: 'Unavailable here', color: 'default' as const };
    case 'loading':
      return { label: 'Checking…', color: 'default' as const };
    case 'coming_soon':
      return { label: 'Coming soon', color: 'default' as const };
    default:
      return { label: 'Available', color: 'info' as const };
  }
};

const actionDetails = (item: IntegrationCatalogItem, status: IntegrationDisplayStatus | 'coming_soon') => {
  if (status === 'coming_soon') return { label: 'Coming soon', ariaLabel: `${item.name} is coming soon` };
  if (status === 'unavailable') return { label: 'Unavailable', ariaLabel: `${item.name} is unavailable` };
  if (status === 'loading') return { label: 'Checking…', ariaLabel: `Checking ${item.name} connection status` };
  if (status === 'connected' || status === 'needs_attention') return { label: 'Manage', ariaLabel: `Manage ${item.name}` };
  if (item.id === 'csv') return { label: 'Import', ariaLabel: 'Import from CSV' };
  if (item.id === 'stripe-billing') return { label: 'Manage plan', ariaLabel: 'Manage Stripe Billing' };
  return { label: 'Connect', ariaLabel: `Connect ${item.name}` };
};

const integrationIcon = (item: IntegrationCatalogItem) => {
  if (item.id === 'quickbooks' || item.id === 'square') {
    return (
      <img
        src={item.id === 'quickbooks' ? QuickBooksIcon : SquareIcon}
        alt=""
        aria-hidden="true"
        style={{ display: 'block', maxWidth: 42, maxHeight: 42 }}
      />
    );
  }
  if (item.id === 'bank') return <AccountBalanceOutlinedIcon aria-hidden="true" />;
  if (item.id === 'stripe-connect') return <CreditCardOutlinedIcon aria-hidden="true" />;
  if (item.id === 'stripe-billing') return <ReceiptLongOutlinedIcon aria-hidden="true" />;
  if (item.id === 'csv') return <FileUploadOutlinedIcon aria-hidden="true" />;
  return <ExtensionOutlinedIcon aria-hidden="true" />;
};

export function IntegrationCatalogGrid({ items, statusById, canManage, onNavigate }: IntegrationCatalogGridProps) {
  const renderGroup = (title: string, group: IntegrationCatalogItem[]) => (
    <Stack spacing={1.5}>
      <Typography variant="h5" component="h2">
        {title}
      </Typography>
      <Grid container spacing={gridSpacing}>
        {group.map((item) => {
          const status = item.availability === 'coming_soon' ? 'coming_soon' : statusById[item.id] || 'available';
          const statusCopy = statusDetails(status);
          const action = actionDetails(item, status);
          const disabled = !canManage || status === 'coming_soon' || status === 'unavailable' || status === 'loading' || !item.route;

          return (
            <Grid key={item.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Card
                variant="outlined"
                sx={{
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  boxShadow: 'none',
                  transition: 'border-color 180ms ease, background-color 180ms ease',
                  '&:hover': disabled ? undefined : { borderColor: 'primary.light', bgcolor: 'action.hover' }
                }}
              >
                <CardContent sx={{ flexGrow: 1, p: 2.5 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1.5}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                        '& svg': { fontSize: 28 }
                      }}
                    >
                      {integrationIcon(item)}
                    </Box>
                    <Chip size="small" label={statusCopy.label} color={statusCopy.color} variant="outlined" />
                  </Stack>
                  <Typography variant="h4" component="h3" sx={{ mt: 2, mb: 0.75 }}>
                    {item.name}
                  </Typography>
                  <Typography variant="caption" color="primary.main" sx={{ display: 'block', mb: 1, fontWeight: 600 }}>
                    {item.category}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {item.description}
                  </Typography>
                </CardContent>
                <CardActions sx={{ px: 2.5, pb: 2.5, pt: 0 }}>
                  <Button
                    fullWidth
                    variant={status === 'connected' || status === 'needs_attention' ? 'outlined' : 'contained'}
                    disabled={disabled}
                    aria-label={action.ariaLabel}
                    onClick={() => item.route && onNavigate(item.route)}
                    sx={{ minHeight: 44 }}
                  >
                    {action.label}
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    </Stack>
  );

  const available = items.filter((item) => item.availability === 'available');
  const comingSoon = items.filter((item) => item.availability === 'coming_soon');

  return (
    <Stack spacing={{ xs: 3, sm: 4 }}>
      {renderGroup('Available now', available)}
      {renderGroup('Coming soon', comingSoon)}
    </Stack>
  );
}

export default function IntegrationsHub({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const { quickbooks, square } = useSelector((state) => state.integrations);
  const financialSource = useFinancialSource();

  const isAdmin = currentRole?.role_type === 'admin';
  const companyId = currentRole?.company_id || null;
  const subscription = useSWR(currentRole ? 'integration-subscription' : null, () => subscriptionAPI.checkSubscription(), {
    shouldRetryOnError: false
  });
  const stripeConnect = useSWR(
    companyId ? `integration-stripe-connect-${companyId}` : null,
    () => stripeApi.getConnectionStatus(companyId || ''),
    { shouldRetryOnError: false }
  );

  // Determine connection status
  const qbStatus: IntegrationDisplayStatus =
    quickbooks.connection.status === 'expired'
      ? 'needs_attention'
      : quickbooks.connection.status === 'connected' || quickbooks.connection.status === 'refreshing'
        ? 'connected'
        : 'available';
  const squareStatus: IntegrationDisplayStatus =
    square.connection.status === 'expired' ? 'needs_attention' : square.connection.status === 'connected' ? 'connected' : 'available';

  // Fetch connection statuses on mount
  useEffect(() => {
    if (currentRole && companyId && isAdmin) {
      dispatch(fetchQBConnectionStatus(companyId));
      dispatch(fetchSquareConnectionStatus(companyId));
    }
  }, [dispatch, currentRole, companyId, isAdmin]);

  const stripeBillingStatus = String(subscription.data?.status || '').toLowerCase();
  const statusById: Partial<Record<string, IntegrationDisplayStatus>> = {
    bank: financialSource.isLoading
      ? 'loading'
      : !financialSource.data?.bank_available
        ? 'unavailable'
        : financialSource.data.connection?.error_code
          ? 'needs_attention'
          : financialSource.data.connection
            ? 'connected'
            : 'available',
    quickbooks: qbStatus,
    square: squareStatus,
    'stripe-connect': stripeConnect.isLoading
      ? 'loading'
      : stripeConnect.data?.action_required && stripeConnect.data?.connected
        ? 'needs_attention'
        : stripeConnect.data?.state === 'complete'
          ? 'connected'
          : 'available',
    'stripe-billing': subscription.isLoading
      ? 'loading'
      : stripeBillingStatus === 'active' || stripeBillingStatus === 'trialing' || !!subscription.data?.cancelAtPeriodEnd
        ? 'connected'
        : 'available',
    csv: 'available'
  };

  const body = (
    <Stack spacing={{ xs: 3, sm: 4 }}>
      {currentRole && isAdmin && (
        <Box>
          <FinancialSourcePicker />
        </Box>
      )}
      {!currentRole && <Alert severity="warning">Please login to connect integrations.</Alert>}

      {currentRole && !isAdmin && (
        <Alert severity="info">
          Only administrators can manage integrations. Your role: {currentRole.role_display || currentRole.role_type}
        </Alert>
      )}
      <IntegrationCatalogGrid
        items={createIntegrationCatalog()}
        statusById={statusById}
        canManage={!!isAdmin}
        onNavigate={(route) => navigate(route)}
      />
    </Stack>
  );

  if (embedded) return body;

  return (
    <>
      <PageHeader title="Integrations" subtitle="Connect the tools and services your shop already runs on" />
      <MainCard>{body}</MainCard>
    </>
  );
}
