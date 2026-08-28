import { Chip, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import type { ContactTierLevel } from 'api/innerCircle.api';

import { tierChipStyle, tierLabel } from './tierLabel';

export { tierLabel } from './tierLabel';

/**
 * A customer's tier, named the way their boutique names it.
 *
 * Pass `level` wherever the row carries one — the legacy `tier` slug cannot
 * distinguish two middle rungs of a ladder, so without it a Silver and a
 * Gold customer both read as "Regular".
 */
export default function TierChip({ tier, level }: { tier: string | null; level?: ContactTierLevel | null }) {
  const theme = useTheme();
  const label = tierLabel(tier, level);

  if (!label) {
    return (
      <Typography variant="body2" color="textSecondary" component="span">
        —
      </Typography>
    );
  }

  const style = tierChipStyle(tier, level);

  if (style.kind === 'custom') {
    return (
      <Chip label={label} size="small" variant="filled" sx={{ bgcolor: style.hex, color: theme.palette.getContrastText(style.hex) }} />
    );
  }

  return <Chip label={label} size="small" color={style.kind === 'palette' ? style.color : 'default'} variant="filled" />;
}
