import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import { ThemeMode } from 'config';
import AllyviaEmpty from './AllyviaEmpty';

// ==============================|| ALLYVIA STATS CARD ||============================== //
// KPI tile per the design system: white card, hairline border, uppercase
// muted label, large bold value colored by status.

interface AllyviaStatsProps {
  title: string;
  value: string | number;
  theme?: 'default' | 'warning' | 'alert' | 'success' | 'gold';
  size?: 'small' | 'medium' | 'large';
  height?: number;
  loading?: boolean;
}

const AllyviaStats: React.FC<AllyviaStatsProps> = ({ title, value, theme: themeType = 'default', size = 'medium', height, loading }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === ThemeMode.DARK;

  // Status → value color. Default KPIs read in ink; status KPIs pick up the
  // semantic color, matching the design's KPI strip.
  const valueColors: Record<string, string> = {
    default: isDark ? theme.palette.text.primary : theme.palette.grey[900],
    warning: isDark ? theme.palette.warning.main : theme.palette.warning.dark,
    alert: isDark ? theme.palette.error.main : theme.palette.error.dark,
    success: isDark ? theme.palette.success.main : theme.palette.success.main,
    gold: isDark ? theme.palette.warning.main : theme.palette.warning.dark
  };
  const valueColor = valueColors[themeType] || valueColors.default;

  const sizes = {
    small: { height: 72, px: 2, py: 1.5, valueSize: '1.125rem' },
    medium: { height: 92, px: 2.5, py: 2, valueSize: '1.375rem' },
    large: { height: 112, px: 2.5, py: 2.5, valueSize: '1.625rem' }
  } as const;
  const currentSize = sizes[(size as keyof typeof sizes) || 'medium'] || sizes.medium;

  // Use AllyviaEmpty to render KPI skeleton when loading, and the card as children when ready
  return (
    <AllyviaEmpty
      isLoading={!!loading}
      isEmpty={false}
      type="kpi"
      skeletonType="rectangular"
      height={currentSize.height}
      width="100%"
      items={1}
      sx={{ p: 0, height: currentSize.height }}
    >
      <Box
        sx={{
          bgcolor: 'background.paper',
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 2.5,
          minHeight: currentSize.height,
          height: height || 'auto',
          px: currentSize.px,
          py: currentSize.py,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          gap: 0.75
        }}
      >
        {/* Title */}
        <Typography
          sx={{
            color: 'text.secondary',
            fontSize: '0.65625rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            lineHeight: 1.2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </Typography>

        {/* Value */}
        <Typography
          sx={{
            color: valueColor,
            fontSize: currentSize.valueSize,
            fontWeight: 700,
            lineHeight: 1.1,
            letterSpacing: '-0.01em'
          }}
        >
          {value}
        </Typography>
      </Box>
    </AllyviaEmpty>
  );
};

export default AllyviaStats;
