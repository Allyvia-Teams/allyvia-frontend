import { Chip, Typography } from '@mui/material';

import type { CustomerTier } from 'api/innerCircle.api';

// Tier chip config mirrors the TierBadge used across the Inner Circle views.
const TIER_CONFIG: Record<CustomerTier, { label: string; color: 'warning' | 'primary' | 'default' }> = {
  vault: { label: 'Vault', color: 'warning' },
  regular: { label: 'Regular', color: 'primary' },
  shopper: { label: 'Shopper', color: 'default' }
};

export function tierLabel(tier: CustomerTier): string {
  return TIER_CONFIG[tier].label;
}

export default function TierChip({ tier }: { tier: CustomerTier | null }) {
  if (!tier || !(tier in TIER_CONFIG)) {
    return (
      <Typography variant="body2" color="textSecondary" component="span">
        —
      </Typography>
    );
  }

  const { label, color } = TIER_CONFIG[tier];
  return <Chip label={label} size="small" color={color} variant="filled" />;
}
