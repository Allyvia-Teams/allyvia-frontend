import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { visuallyHidden } from '@mui/utils';

import { impactColor } from '../categoryTheme';
import { formatImpact } from '../insightsView';
import { NARROW_PAGE } from '../layout';
import type { Recommendation } from '../types';

/** What a screen reader hears for the figure: "revenue protected: +$1,140", or the amount alone with no label. */
export const impactSpokenText = (label: string, amount: string) => (label ? `${label}: ${amount}` : amount);

/**
 * The card's dollar figure: "+$1,140" in green with "revenue protected" under
 * it. Only a signed impact gets the plus; held cash ("$4,200 kept on hand")
 * reads as a plain figure. Renders nothing when the amount is unknown (0).
 * The two visible lines are hidden from screen readers, which get one
 * visually hidden "<label>: <amount>" instead (S6).
 */
export default function ImpactBadge({ impact }: { impact: Recommendation['impact'] }) {
  const theme = useTheme();
  const amount = formatImpact(impact);
  if (!amount) return null;

  return (
    <Box sx={{ textAlign: { xs: 'left', md: 'right' }, flexShrink: 0, [NARROW_PAGE]: { textAlign: 'left' } }} data-impact>
      <Box component="span" sx={visuallyHidden} data-impact-spoken>
        {impactSpokenText(impact.label, amount)}
      </Box>
      <Typography
        component="p"
        aria-hidden
        sx={{ fontSize: '1.5rem', fontWeight: 600, lineHeight: 1.2, color: impactColor(theme.palette.mode), whiteSpace: 'nowrap' }}
      >
        {amount}
      </Typography>
      {impact.label && (
        <Typography component="p" aria-hidden variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.25 }}>
          {impact.label}
        </Typography>
      )}
    </Box>
  );
}
