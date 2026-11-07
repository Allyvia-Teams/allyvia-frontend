import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';

import { impactColor } from '../categoryTheme';
import { formatImpact } from '../insightsView';
import type { Recommendation } from '../types';

/**
 * The card's dollar figure: "+$1,140" in green with "revenue protected" under
 * it. Only a signed impact gets the plus; held cash ("$4,200 kept on hand")
 * reads as a plain figure. Renders nothing when the amount is unknown (0).
 */
export default function ImpactBadge({ impact }: { impact: Recommendation['impact'] }) {
  const theme = useTheme();
  const amount = formatImpact(impact);
  if (!amount) return null;

  return (
    <Box sx={{ textAlign: { xs: 'left', md: 'right' }, flexShrink: 0 }} data-impact>
      <Typography
        component="p"
        sx={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2, color: impactColor(theme.palette.mode), whiteSpace: 'nowrap' }}
      >
        {amount}
      </Typography>
      {impact.label && (
        <Typography component="p" variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {impact.label}
        </Typography>
      )}
    </Box>
  );
}
