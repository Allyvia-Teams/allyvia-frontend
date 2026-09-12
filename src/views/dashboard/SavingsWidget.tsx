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
//
// Design handoff Part 2: a rail card. Header 13px, value 20/700 in
// text.disabled while gated, basis 11.5, the gate's progress as a 4px bar.

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
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
import { RailCard, useToneColor } from 'ui-component/frame';
import { savingsGateView, signalRows } from './recommendationSignals';

const WINDOW_LABELS: Record<string, string> = {
  ytd: 'year to date'
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

const SmallRow = ({ label, value, muted }: { label: string; value: string; muted?: boolean }) => (
  <Box display="flex" alignItems="center" justifyContent="space-between" gap={2}>
    <Typography sx={{ fontSize: '0.71875rem', color: 'text.secondary' }}>{label}</Typography>
    <Typography sx={{ fontSize: '0.71875rem', color: muted ? 'text.secondary' : 'text.primary', fontWeight: muted ? 400 : 600 }}>
      {value}
    </Typography>
  </Box>
);

export const SavingsWidget = () => {
  const theme = useTheme();
  const successText = useToneColor('success');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['agent-savings'],
    queryFn: () => AgentAPI.Savings.getSavings(),
    staleTime: 10 * 60 * 1000,
    retry: false
  });

  if (isLoading) {
    return <Skeleton variant="rounded" height={104} />;
  }

  const header = {
    title: 'Verified savings',
    icon: <IconPigMoney size={16} stroke={1.75} color={theme.palette.success.main} />,
    action: (
      <Tooltip title={MEASUREMENT_NOTE}>
        <Box component="span" display="flex" sx={{ color: 'text.disabled', cursor: 'help' }} aria-label={MEASUREMENT_NOTE}>
          <IconInfoCircle size={14} />
        </Box>
      </Tooltip>
    )
  };

  // The ROI tracker (ALL-152) has a fixed seat on the Dashboard. A failed fetch
  // used to render nothing at all, which reads as "this shop has no tracker"
  // rather than "it could not load" — so the card stays, says so, and offers a
  // retry. It still never pads the figure with anything unmeasured.
  if (isError || !data) {
    return (
      <RailCard padded {...header}>
        <Typography
          component="div"
          sx={{ mt: '2px', fontSize: '0.71875rem', color: 'text.secondary', lineHeight: 1.45, textWrap: 'pretty' }}
        >
          Couldn&apos;t load verified savings right now.
        </Typography>
        <Button size="small" variant="text" color="inherit" onClick={() => refetch()} sx={{ mt: 0.5, px: 0.5, minHeight: 0 }}>
          Retry
        </Button>
      </RailCard>
    );
  }

  const total = Number(data.realized_total_dollars ?? 0);
  const byType = Object.entries(data.by_type ?? {}).filter(([, value]) => Number(value) > 0);
  const bySignal = signalRows(data.by_signal);
  const windowLabel = WINDOW_LABELS[data.window] ?? data.window;
  // ALL-152 gate: one verified outcome is one formula's output dressed as a
  // track record. The total appears once enough recommendations have been
  // measured; until then the card says how far along the ledger is.
  const gate = savingsGateView(data);
  const hasSavings = gate.showTotal;
  const gateFraction = data.gate && data.gate.required > 0 ? Math.min(1, data.gate.verified_recommendations / data.gate.required) : null;

  return (
    <RailCard padded {...header}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: '6px', mt: '2px' }}>
        <Typography
          component="div"
          sx={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.02em', color: hasSavings ? successText : 'text.disabled' }}
        >
          {hasSavings ? formatSavingsDollars(total) : '$0'}
        </Typography>
        <Typography component="div" sx={{ fontSize: '0.71875rem', color: 'text.disabled' }}>
          verified · {windowLabel}
        </Typography>
      </Box>

      {!hasSavings ? (
        <>
          <Typography
            component="div"
            sx={{ mt: '4px', fontSize: '0.71875rem', color: 'text.secondary', lineHeight: 1.45, textWrap: 'pretty' }}
          >
            {gate.progress
              ? `Measured 14–90 days after you act. ${gate.progress}.`
              : 'No verified savings yet — outcomes are measured 14–90 days after you act.'}
          </Typography>
          {gateFraction !== null ? (
            <Box
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={data.gate!.required}
              aria-valuenow={data.gate!.verified_recommendations}
              aria-label="Recommendations verified toward showing a total"
              sx={{ height: 4, borderRadius: 999, bgcolor: 'grey.100', mt: 1, overflow: 'hidden' }}
            >
              <Box sx={{ width: `${Math.round(gateFraction * 100)}%`, height: '100%', bgcolor: 'success.main' }} />
            </Box>
          ) : null}
        </>
      ) : (
        <>
          <Typography component="div" sx={{ mt: '4px', fontSize: '0.71875rem', color: 'text.secondary', lineHeight: 1.45 }}>
            From {data.recommendation_count} recommendation{data.recommendation_count === 1 ? '' : 's'} you acted on.
          </Typography>

          {byType.length > 0 && (
            <Box mt={1} display="flex" flexDirection="column" gap={0.25}>
              {byType
                .sort(([, a], [, b]) => Number(b) - Number(a))
                .map(([type, value]) => (
                  <SmallRow key={type} label={humanizeType(type)} value={formatSavingsDollars(value)} />
                ))}
            </Box>
          )}
          {bySignal.length > 0 && (
            <Box mt={1}>
              <Typography sx={{ fontSize: '0.65625rem', color: 'text.disabled', display: 'block', mb: 0.25, lineHeight: 1.4 }}>
                Signals behind these savings (a recommendation driven by two signals counts for both)
              </Typography>
              <Box display="flex" flexDirection="column" gap={0.25}>
                {bySignal.map(([label, value]) => (
                  <SmallRow key={label} label={label} value={formatSavingsDollars(value)} muted />
                ))}
              </Box>
            </Box>
          )}
        </>
      )}
    </RailCard>
  );
};

export default SavingsWidget;
