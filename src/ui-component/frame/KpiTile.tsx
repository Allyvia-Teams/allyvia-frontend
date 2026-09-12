import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import { ThemeMode } from 'config';
import { deltaKind, sparkHeights, STATUS_TEXT, type DeltaKind, type Tone } from './frame';

// ==============================|| FRAME - KPI TILE ||============================== //
// Design handoff 1.2. White, hairline border, 10px radius, 12px 14px padding, no
// fixed height. Label 10.5/600 uppercase; value 24/700 with the delta chip on
// its baseline; basis 11.5 beneath. Every number keeps its basis.

export interface KpiTileProps {
  label: ReactNode;
  value: ReactNode;
  /** Formatted delta ("+8.1%", "—"); direction is read from its sign. */
  delta?: string | null;
  /** Force a direction when the label carries none (e.g. "+5" transactions). */
  deltaKind?: DeltaKind;
  /** The figure's window or comparison basis: "of 640 available", "$158,400 at retail". */
  basis?: ReactNode;
  /** Sentence shown on hover of the basis, when the basis is a short caveat. */
  basisTooltip?: string;
  tone?: Tone;
  /** Optional 14-point series for the 22px sparkline. */
  spark?: ReadonlyArray<number>;
  loading?: boolean;
}

export const useToneColor = (tone: Tone = 'default'): string => {
  const theme = useTheme();
  const dark = theme.palette.mode === ThemeMode.DARK;
  switch (tone) {
    case 'warning':
      return dark ? theme.palette.warning.main : STATUS_TEXT.warning;
    case 'error':
      return dark ? theme.palette.error.main : STATUS_TEXT.error;
    case 'success':
      return dark ? theme.palette.success.main : STATUS_TEXT.success;
    case 'muted':
      return theme.palette.text.disabled;
    default:
      return theme.palette.text.dark;
  }
};

const DeltaChip = ({ label, kind }: { label: string; kind: DeltaKind }) => {
  const theme = useTheme();
  const dark = theme.palette.mode === ThemeMode.DARK;
  const styles: Record<DeltaKind, { bg: string; fg: string }> = {
    up: { bg: alpha(theme.palette.success.main, 0.12), fg: dark ? theme.palette.success.main : STATUS_TEXT.success },
    down: { bg: alpha(theme.palette.error.main, 0.1), fg: dark ? theme.palette.error.main : STATUS_TEXT.error },
    neutral: { bg: dark ? alpha(theme.palette.text.primary, 0.08) : theme.palette.grey[100], fg: theme.palette.text.secondary }
  };
  const { bg, fg } = styles[kind];
  return (
    <Box
      component="span"
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        fontSize: '0.6875rem',
        fontWeight: 600,
        lineHeight: 1.4,
        px: '6px',
        py: '1px',
        borderRadius: '6px',
        bgcolor: bg,
        color: fg,
        whiteSpace: 'nowrap'
      }}
    >
      {label}
    </Box>
  );
};

export default function KpiTile({
  label,
  value,
  delta,
  deltaKind: forcedKind,
  basis,
  basisTooltip,
  tone = 'default',
  spark,
  loading
}: KpiTileProps) {
  const theme = useTheme();
  const valueColor = useToneColor(tone);
  const bars = sparkHeights(spark);

  const basisNode = basis ? (
    <Typography component="div" sx={{ mt: '4px', fontSize: '0.71875rem', color: 'text.disabled', lineHeight: 1.4 }}>
      {basis}
    </Typography>
  ) : null;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: '10px',
        px: '14px',
        py: '12px',
        minWidth: 0
      }}
    >
      <Typography
        component="div"
        sx={{
          fontSize: '0.65625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: 'grey.600',
          lineHeight: 1.3,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis'
        }}
      >
        {label}
      </Typography>

      {loading ? (
        <Skeleton variant="text" width="60%" sx={{ fontSize: '1.5rem', mt: '6px' }} />
      ) : (
        <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: '6px', flexWrap: 'wrap' }}>
          <Typography
            component="div"
            sx={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.025em', lineHeight: 1.1, color: valueColor }}
          >
            {value}
          </Typography>
          {delta ? <DeltaChip label={delta} kind={forcedKind ?? deltaKind(delta)} /> : null}
        </Box>
      )}

      {basisTooltip && basisNode ? (
        <Tooltip title={basisTooltip} placement="top" arrow>
          <Box
            component="span"
            sx={{ display: 'inline-block', cursor: 'help', textDecoration: 'underline dotted', textDecorationColor: 'divider' }}
          >
            {basisNode}
          </Box>
        </Tooltip>
      ) : (
        basisNode
      )}

      {bars.length > 0 ? (
        <Box aria-hidden sx={{ mt: '6px', height: 22, display: 'flex', alignItems: 'flex-end', gap: '2px' }}>
          {bars.map((h, i) => (
            <Box
              key={i}
              sx={{
                flex: 1,
                height: h,
                borderRadius: '1px',
                bgcolor: i >= bars.length - 3 ? theme.palette.primary.main : alpha(theme.palette.primary.main, 0.22)
              }}
            />
          ))}
        </Box>
      ) : null}
    </Box>
  );
}

/** Design handoff 1.1 step 4: `repeat(auto-fit, minmax(180px, 1fr))`, 12px gap, 16px below. */
export function KpiRow({ children }: { children: ReactNode }) {
  return <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', mb: 2 }}>{children}</Box>;
}
