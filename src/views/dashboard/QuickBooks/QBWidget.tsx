// material-ui
import { useTheme } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { LoadingSkeleton } from 'ui-component/UISkeleton';

// project imports
import { ThemeMode } from 'config';

// assets
import { mediumWidgetHeight } from 'store/constant';

// ===========================|| DASHBOARD DEFAULT - QBWidget ||=========================== //
// KPI tile per the design system: white card, hairline border, uppercase
// muted label, large bold value, delta colored by direction.

type QBWidgetTheme = 'gold';

interface QBWidgetProps {
  isLoading: boolean;
  title: string;
  value: string;
  sub?: string;
  widgetTheme?: QBWidgetTheme;
}

export default function QBWidget({ isLoading, title, value, sub, widgetTheme }: QBWidgetProps) {
  const theme = useTheme();
  const isDark = theme.palette.mode === ThemeMode.DARK;

  if (isLoading) {
    return <LoadingSkeleton height={mediumWidgetHeight} />;
  }

  // The "gold" variant (Profit) keeps a distinguishing amber value color.
  const valueColor = widgetTheme === 'gold' ? (isDark ? theme.palette.warning.main : '#b7791f') : 'text.primary';

  // Delta string ("+8.4%", "-2.1%", "—") → semantic color
  const deltaColor = sub?.startsWith('+')
    ? 'success.main'
    : sub?.startsWith('-')
      ? 'error.main'
      : 'text.secondary';

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2.5,
        p: 2.5,
        minHeight: `${mediumWidgetHeight}px`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        gap: 1
      }}
    >
      <Typography
        sx={{
          color: 'text.secondary',
          fontSize: '0.65625rem',
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          lineHeight: 1.2
        }}
      >
        {title}
      </Typography>

      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography
          sx={{
            color: valueColor,
            fontSize: '1.625rem',
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.01em'
          }}
        >
          {value}
        </Typography>

        {sub && (
          <Typography sx={{ color: deltaColor, fontSize: '0.8125rem', fontWeight: 600 }}>
            {sub}
          </Typography>
        )}
      </Box>
    </Box>
  );
}
