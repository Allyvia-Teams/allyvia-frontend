import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Check from '@mui/icons-material/Check';
import { getPlanDetails } from 'config/plans';

export type BillingInterval = 'monthly' | 'yearly';
export type SubscriptionStatus = 'Active' | 'Trialing' | 'Past Due' | 'Canceled';

function formatPrice(price: number, interval: BillingInterval): string {
  if (price === 0) return '$0';
  return interval === 'monthly' ? `$${price}/mo` : `$${price}/yr`;
}

function formatBillingInterval(interval: BillingInterval): string {
  return interval === 'monthly' ? 'Billed monthly' : 'Billed yearly';
}

function getStatusChipColor(
  status: SubscriptionStatus
): 'default' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'Active':
      return 'success';
    case 'Trialing':
      return 'warning';
    case 'Past Due':
      return 'warning';
    case 'Canceled':
      return 'error';
    default:
      return 'default';
  }
}

/** Full billing section UI; subscription/checkout actions are disabled until billing is integrated. */
export default function SubscriptionBillingContent() {
  const details = getPlanDetails('Free');
  const displayStatus: SubscriptionStatus = 'Active';
  const billingInterval: BillingInterval = 'monthly';
  const price = details.price;

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
        {details.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        {formatPrice(price, billingInterval)} · {formatBillingInterval(billingInterval)}
      </Typography>
      <Chip
        label={displayStatus}
        color={getStatusChipColor(displayStatus)}
        size="small"
        sx={{ alignSelf: 'flex-start', mb: 2 }}
      />

      <Box sx={{ mt: 2, mb: 1 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
          What&apos;s included in your plan
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          {details.description}
        </Typography>
        <List dense disablePadding sx={{ listStyle: 'none' }}>
          {details.allFeatures.map((f) => (
            <ListItem key={f.name} disableGutters sx={{ py: 0.25, alignItems: 'flex-start' }}>
              <ListItemIcon sx={{ minWidth: 28, mt: 0.25 }}>
                <Check sx={{ fontSize: 18, color: 'success.main' }} />
              </ListItemIcon>
              <ListItemText
                primary={f.limit ? `${f.name} (${f.limit})` : f.name}
                primaryTypographyProps={{ variant: 'body2', color: 'text.secondary' }}
              />
            </ListItem>
          ))}
        </List>
        {details.limits && Object.keys(details.limits).length > 0 && (
          <Box sx={{ mt: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600 }}>
              Limits
            </Typography>
            <Stack direction="row" flexWrap="wrap" gap={1} sx={{ mt: 0.5 }}>
              {Object.entries(details.limits).map(
                ([key, value]) =>
                  typeof value === 'number' && (
                    <Chip
                      key={key}
                      size="small"
                      label={`${key}: ${value}`}
                      variant="outlined"
                      sx={{ textTransform: 'capitalize' }}
                    />
                  )
              )}
            </Stack>
          </Box>
        )}
        {details.differentiators.length > 0 && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            {details.differentiators.join(' · ')}
          </Typography>
        )}
      </Box>

      <Divider sx={{ my: 2 }} />
      <Stack direction="row" flexWrap="wrap" gap={1.5}>
        <Button variant="contained" disabled sx={{ minWidth: 140 }}>
          Upgrade Plan
        </Button>
        <Button variant="outlined" disabled sx={{ minWidth: 140 }}>
          Downgrade Plan
        </Button>
        <Button variant="outlined" color="error" disabled sx={{ minWidth: 140 }}>
          Cancel Subscription
        </Button>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
        Plan changes and payment flows will be available once billing is connected.
      </Typography>
    </Box>
  );
}
