import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import Check from '@mui/icons-material/Check';
import subscriptionAPI, { SubscriptionStatusPayload } from 'api/subscription.api';
import useSWR from 'swr';

type BillingInterval = 'monthly' | 'annual';
type PlanType = 'base' | 'pro';

const PRICE_IDS = {
  base: {
    monthly: 'price_1TEhc09jMIUUkPmwG9FB9JaP',
    annual: 'price_1TEhc79jMIUUkPmwt6KA2r4x'
  },
  pro: {
    monthly: 'price_1TEhcQ9jMIUUkPmwvCIZEz2V',
    annual: 'price_1TEhcU9jMIUUkPmw23YjhlaE'
  }
} as const;

const PLAN_FEATURES: Record<PlanType, string[]> = {
  base: [
    'QuickBooks/Square/Clover integrations',
    'CRM, calendar, and document storage',
    'Inventory, barcode scanning, and stock tracking',
    'Purchase order management',
    'Employee time clocking',
    'Analytics dashboard'
  ],
  pro: [
    'QuickBooks/Square/Clover integrations',
    'CRM, calendar, and document storage',
    'Inventory, barcode scanning, and stock tracking',
    'Purchase order management',
    'Employee time clocking',
    'Analytics dashboard',
    'Insights tab (ML-driven business analytics)',
    '1-on-1 data migration support',
    'Personalized setup and onboarding',
    'Monthly feedback meetings',
    'Dedicated success consultant'
  ]
};

const PLAN_PRICES: Record<PlanType, Record<BillingInterval, string>> = {
  base: { monthly: '$49.99 / month', annual: '$479.88 / year' },
  pro: { monthly: '$199.99 / month', annual: '$2,279.88 / year' }
};

const PLAN_LABELS: Record<PlanType, string> = { base: 'Base Plan', pro: 'Pro Plan' };

function statusChipColor(status: string): 'default' | 'success' | 'warning' | 'error' {
  if (status === 'active') return 'success';
  if (status === 'trialing') return 'warning';
  if (status === 'past_due') return 'error';
  if (status === 'canceled') return 'default';
  return 'default';
}

function statusLabel(status: string): string {
  if (status === 'active') return 'Active';
  if (status === 'trialing') return 'Trialing';
  if (status === 'past_due') return 'Past Due';
  if (status === 'canceled') return 'Canceled';
  return status;
}

function toPlan(priceId: string): PlanType {
  if (Object.values(PRICE_IDS.pro).includes(priceId as (typeof PRICE_IDS.pro)[keyof typeof PRICE_IDS.pro])) return 'pro';
  return 'base';
}

function formatDate(value?: string | null): string {
  if (!value) return '-';
  return new Date(value).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

export default function SubscriptionBillingContent() {
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');

  const { data, isLoading, mutate } = useSWR<SubscriptionStatusPayload>('subscription-status', () => subscriptionAPI.checkSubscription());

  const currentPlan = useMemo<PlanType>(() => toPlan(data?.priceId || ''), [data?.priceId]);
  const currentInterval = (data?.interval || 'monthly') as BillingInterval;
  const activeFeatures = PLAN_FEATURES[currentPlan];
  const renewOrTrialLabel = useMemo(() => {
    if (!data) return '';
    if (data.cancelAtPeriodEnd && data.currentPeriodEnd) return `Access until ${formatDate(data.currentPeriodEnd)}`;
    if (data.status === 'trialing' && data.trialEnd) return `Trial ends on ${formatDate(data.trialEnd)}`;
    return `Renews on ${formatDate(data.currentPeriodEnd)}`;
  }, [data]);

  const runAction = async (fn: () => Promise<unknown>) => {
    setError(null);
    setWorking(true);
    try {
      await fn();
      await mutate();
    } catch (e: any) {
      setError(e?.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setWorking(false);
    }
  };

  const onSwitchPlan = async (plan: PlanType) => {
    const newPriceId = PRICE_IDS[plan][billingInterval];
    await runAction(() => subscriptionAPI.changePlan(newPriceId));
    setShowPlanModal(false);
  };

  const onCancel = async () => {
    await runAction(() => subscriptionAPI.cancelSubscription());
    setShowCancelModal(false);
  };

  const onReactivate = async () => {
    await runAction(() => subscriptionAPI.reactivateSubscription());
  };

  if (isLoading || !data) {
    return (
      <Box>
        <Skeleton variant="text" width={180} height={40} />
        <Skeleton variant="text" width={260} />
        <Skeleton variant="rounded" width={90} height={28} sx={{ my: 1.5 }} />
        <Skeleton variant="text" width="60%" />
        <Skeleton variant="text" width="80%" />
        <Skeleton variant="text" width="75%" />
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        {PLAN_LABELS[currentPlan]}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {PLAN_PRICES[currentPlan][currentInterval]} · {currentInterval === 'monthly' ? 'Monthly' : 'Annual'}
      </Typography>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
        <Chip label={statusLabel(data.status)} color={statusChipColor(data.status)} size="small" />
        {data.cancelAtPeriodEnd && <Chip label="Canceled - period end" color="warning" size="small" />}
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {renewOrTrialLabel}
      </Typography>

      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        What&apos;s included in your plan
      </Typography>
      <List dense disablePadding>
        {activeFeatures.map((feature) => (
          <ListItem key={feature} disableGutters sx={{ py: 0.25 }}>
            <ListItemIcon sx={{ minWidth: 26 }}>
              <Check sx={{ color: 'success.main', fontSize: 18 }} />
            </ListItemIcon>
            <ListItemText primary={feature} primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }} />
          </ListItem>
        ))}
      </List>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" gap={1.5} flexWrap="wrap">
        <Button variant="contained" onClick={() => setShowPlanModal(true)} disabled={working}>
          Change Plan
        </Button>
        {!data.cancelAtPeriodEnd && (data.status === 'active' || data.status === 'trialing') && (
          <Button variant="outlined" color="error" onClick={() => setShowCancelModal(true)} disabled={working}>
            Cancel Subscription
          </Button>
        )}
        {data.cancelAtPeriodEnd && (
          <Button variant="outlined" onClick={onReactivate} disabled={working}>
            Reactivate Plan
          </Button>
        )}
      </Stack>

      <Dialog open={showPlanModal} onClose={() => setShowPlanModal(false)} fullWidth maxWidth="md">
        <DialogTitle>Change Plan</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <ToggleButtonGroup
              exclusive
              value={billingInterval}
              onChange={(_, value: BillingInterval | null) => value && setBillingInterval(value)}
              color="primary"
            >
              <ToggleButton value="monthly">Monthly</ToggleButton>
              <ToggleButton value="annual">Annual</ToggleButton>
            </ToggleButtonGroup>
            <Grid container spacing={2}>
              {(['base', 'pro'] as PlanType[]).map((plan) => (
                <Grid item xs={12} md={6} key={plan}>
                  <Box
                    sx={{
                      border: (t) => `1px solid ${plan === currentPlan ? t.palette.primary.main : t.palette.divider}`,
                      borderRadius: 2,
                      p: 2
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 600 }}>
                      {PLAN_LABELS[plan]}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                      {PLAN_PRICES[plan][billingInterval]}
                    </Typography>
                    <Button
                      variant={plan === currentPlan ? 'outlined' : 'contained'}
                      fullWidth
                      disabled={working || plan === currentPlan}
                      onClick={() => onSwitchPlan(plan)}
                    >
                      {plan === currentPlan ? 'Current Plan' : `Switch to ${PLAN_LABELS[plan]}`}
                    </Button>
                  </Box>
                </Grid>
              ))}
            </Grid>
          </Stack>
        </DialogContent>
      </Dialog>

      <Dialog open={showCancelModal} onClose={() => setShowCancelModal(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancel subscription?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            Are you sure you want to cancel? You&apos;ll keep access until {formatDate(data.currentPeriodEnd)}.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelModal(false)} disabled={working}>
            Keep plan
          </Button>
          <Button color="error" variant="contained" onClick={onCancel} disabled={working}>
            Confirm cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
