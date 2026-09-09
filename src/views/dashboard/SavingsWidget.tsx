// Verified savings from acted-on recommendations (ALL-17).
//
// The single rule this card exists to respect: the figure is what the loop has
// MEASURED, not what it hopes for. Outcomes are only scored 14-90 days after a
// merchant acts, so early on the honest answer is zero — and it is shown as
// zero, with the reason, rather than being padded out with predicted impact
// from the recommendation cards. Those are two different numbers and conflating
// them is how a dashboard stops being believed.
//
// It is never annualized, extrapolated or run-rated. `window` says what period
// the total covers and that is the only period claimed.

// material-ui
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

import { useQuery } from '@tanstack/react-query';

// icons
import { IconPigMoney, IconInfoCircle } from '@tabler/icons-react';

// project imports
import { AgentAPI } from 'api/agent.api';
import { formatSavingsDollars } from 'api/agentFeedback';

const WINDOW_LABELS: Record<string, string> = {
  ytd: 'Year to date'
};

const MEASUREMENT_NOTE = 'Counted only after an outcome is measured, 14–90 days after you act on a recommendation.';

// rec_type is the backend's vocabulary and may grow, so unknown types fall back
// to a de-underscored version of themselves rather than disappearing.
const humanizeType = (type: string): string =>
  type
    .split('_')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');

export const SavingsWidget = () => {
  const theme = useTheme();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['agent-savings'],
    queryFn: () => AgentAPI.Savings.getSavings(),
    staleTime: 10 * 60 * 1000,
    retry: false
  });

  if (isLoading) {
    return (
      <Grid size={12}>
        <Skeleton variant="rounded" height={120} />
      </Grid>
    );
  }

  // A failed fetch renders nothing rather than an error box: this is a
  // supporting figure on a busy dashboard, and "we couldn't load your savings"
  // is noise a merchant can do nothing with.
  if (isError || !data) return null;

  const total = data.realized_total_dollars ?? 0;
  const byType = Object.entries(data.by_type ?? {}).filter(([, value]) => Number(value) > 0);
  const windowLabel = WINDOW_LABELS[data.window] ?? data.window;
  const hasSavings = total > 0;

  return (
    <Grid size={12}>
      <Card variant="outlined">
        <CardContent>
          <Box display="flex" alignItems="center" gap={1} mb={1.5}>
            <IconPigMoney size={20} color={theme.palette.success.main} />
            <Typography variant="h5">Verified savings</Typography>
            <Tooltip title={MEASUREMENT_NOTE}>
              <Box component="span" display="flex" sx={{ color: 'text.disabled', cursor: 'help' }}>
                <IconInfoCircle size={16} />
              </Box>
            </Tooltip>
          </Box>
          <Divider sx={{ mb: 1.5 }} />

          {!hasSavings ? (
            <Box py={0.5}>
              <Typography variant="body2" color="text.secondary">
                No verified savings yet — outcomes are measured 14–90 days after you act.
              </Typography>
            </Box>
          ) : (
            <>
              <Box display="flex" alignItems="baseline" gap={1} flexWrap="wrap">
                <Typography variant="h3" color="success.main">
                  {formatSavingsDollars(total)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  verified · {windowLabel}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                From {data.recommendation_count} recommendation{data.recommendation_count === 1 ? '' : 's'} you acted on.
              </Typography>

              {byType.length > 0 && (
                <Box mt={1.5} display="flex" flexDirection="column" gap={0.5}>
                  {byType
                    .sort(([, a], [, b]) => Number(b) - Number(a))
                    .map(([type, value]) => (
                      <Box key={type} display="flex" alignItems="center" justifyContent="space-between" gap={2}>
                        <Typography variant="caption" color="text.secondary">
                          {humanizeType(type)}
                        </Typography>
                        <Typography variant="caption" color="text.primary" fontWeight={600}>
                          {formatSavingsDollars(value)}
                        </Typography>
                      </Box>
                    ))}
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
};

export default SavingsWidget;
