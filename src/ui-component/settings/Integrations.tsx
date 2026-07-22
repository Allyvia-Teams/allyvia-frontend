import { useNavigate } from 'react-router-dom';
import useSWR from 'swr';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { IconPlug } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';

import qbApi from 'api/qb';
import squareApi from 'api/square';
import subscriptionAPI from 'api/subscription.api';

interface IntegrationsProps {
  companyId: string;
}

type ChipState = 'connected' | 'disconnected' | 'coming-soon' | 'loading' | 'unknown';

interface ProviderRow {
  id: string;
  name: string;
  description: string;
  state: ChipState;
  primaryLabel: string;
  onPrimary?: () => void;
  disabled?: boolean;
}

const chipFor = (state: ChipState) => {
  switch (state) {
    case 'connected':
      return <Chip size="small" label="Connected" color="success" variant="outlined" />;
    case 'disconnected':
      return <Chip size="small" label="Not connected" variant="outlined" />;
    case 'coming-soon':
      return <Chip size="small" label="Coming soon" variant="outlined" />;
    case 'loading':
      return <Skeleton variant="rounded" width={100} height={22} />;
    default:
      return <Chip size="small" label="Unknown" variant="outlined" />;
  }
};

export default function Integrations({ companyId }: IntegrationsProps) {
  const navigate = useNavigate();

  const qb = useSWR(companyId ? `integration-qb-${companyId}` : null, () => qbApi.getConnectionStatus(companyId), {
    shouldRetryOnError: false
  });
  const square = useSWR(companyId ? `integration-square-${companyId}` : null, () => squareApi.getConnectionStatus(companyId), {
    shouldRetryOnError: false
  });
  const subscription = useSWR('integration-subscription', () => subscriptionAPI.checkSubscription(), { shouldRetryOnError: false });

  const qbState: ChipState = qb.isLoading ? 'loading' : qb.error ? 'unknown' : qb.data?.is_connected ? 'connected' : 'disconnected';
  const squareState: ChipState = square.isLoading
    ? 'loading'
    : square.error
      ? 'unknown'
      : square.data?.connected
        ? 'connected'
        : 'disconnected';
  const stripeStatus = String(subscription.data?.status || '').toLowerCase();
  const stripeState: ChipState = subscription.isLoading
    ? 'loading'
    : subscription.error
      ? 'unknown'
      : stripeStatus === 'active' || stripeStatus === 'trialing' || !!subscription.data?.cancelAtPeriodEnd
        ? 'connected'
        : 'disconnected';

  const rows: ProviderRow[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync invoices, customers, and accounting entries.',
      state: qbState,
      primaryLabel: qbState === 'connected' ? 'Manage' : 'Connect',
      onPrimary: () => navigate('/integrations/quickbooks')
    },
    {
      id: 'square',
      name: 'Square',
      description: 'Connect POS for sales, inventory, and payment data.',
      state: squareState,
      primaryLabel: squareState === 'connected' ? 'Manage' : 'Connect',
      onPrimary: () => navigate('/integrations/square')
    },
    {
      id: 'clover',
      name: 'Clover',
      description: 'POS and merchant services — coming soon.',
      state: 'coming-soon',
      primaryLabel: 'Unavailable',
      disabled: true
    },
    {
      id: 'stripe',
      name: 'Stripe (Billing)',
      description: 'Subscription billing for your Allyvia plan.',
      state: stripeState,
      primaryLabel: 'Manage',
      onPrimary: () => navigate('/settings?tab=billing')
    }
  ];

  return (
    <SettingsSectionCard
      title="Integrations"
      description="Connect Allyvia with the tools you already use"
      icon={<IconPlug size={24} stroke={1.5} />}
    >
      <Stack divider={<Divider flexItem />} spacing={0}>
        {rows.map((row) => (
          <Stack
            key={row.id}
            direction={{ xs: 'column', sm: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', sm: 'center' }}
            spacing={1.5}
            sx={{ py: 1.5 }}
          >
            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.25 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {row.name}
                </Typography>
                {chipFor(row.state)}
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {row.description}
              </Typography>
            </Box>
            <Tooltip title={row.disabled ? 'Coming soon — not yet available' : ''}>
              <span>
                <Button
                  size="small"
                  variant={row.state === 'connected' ? 'outlined' : 'contained'}
                  onClick={row.onPrimary}
                  disabled={row.disabled || row.state === 'loading'}
                  sx={row.disabled ? { cursor: 'not-allowed' } : undefined}
                >
                  {row.primaryLabel}
                </Button>
              </span>
            </Tooltip>
          </Stack>
        ))}
      </Stack>
    </SettingsSectionCard>
  );
}
