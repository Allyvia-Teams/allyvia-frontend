import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Chip } from '@mui/material';
import { TrendingUp, TrendingDown, Remove } from '@mui/icons-material';

// ==============================|| ALLYVIA STATS CARD ||============================== //

interface AllyviaStatsProps {
  title: string;
  value: string | number;
  subtitle?: string;
  change?: number;
  changeLabel?: string;
  fieldType?: 'revenue' | 'expense' | 'profit' | 'balance' | 'count' | 'percentage';
  trend?: 'up' | 'down' | 'neutral';
  size?: 'small' | 'medium' | 'large';
  warning?: boolean;
  height?: number;
}

// Helper function to get colors and styles based on field type and size
const getCardStyles = (theme: any, fieldType: string, size: string, warning?: boolean) => {
  // Restrict to darkBlue (default), red (expense), yellow (warning)
  const palettes = {
    darkBlue: {
      primary: theme.palette.primary.dark,
      secondary: theme.palette.primary.light,
      accent: theme.palette.primary[200]
    },
    red: {
      primary: theme.palette.error.dark,
      secondary: theme.palette.error.light,
      accent: theme.palette.error[200]
    },
    yellow: {
      primary: theme.palette.warning.dark,
      secondary: theme.palette.warning.light,
      accent: theme.palette.warning[200]
    }
  } as const;

  // Decide palette
  const paletteKey = warning ? 'yellow' : fieldType === 'expense' ? 'red' : 'darkBlue';
  const currentColors = palettes[paletteKey];

  // Reduced heights
  const sizes = {
    small: { height: 72, padding: 1.5 },
    medium: { height: 92, padding: 2 },
    large: { height: 112, padding: 2.5 }
  } as const;
  const currentSize = sizes[(size as keyof typeof sizes) || 'medium'] || sizes.medium;

  return { currentColors, currentSize };
};

const AllyviaStats: React.FC<AllyviaStatsProps> = ({
  title,
  value,
  // subtitle,            // removed from render
  change,
  // changeLabel,         // removed from render
  fieldType = 'revenue',
  trend = 'neutral',
  size = 'medium',
  warning = false,
  height
}) => {
  const theme = useTheme();

  const { currentColors, currentSize } = getCardStyles(theme, fieldType, size, warning);

  return (
    <Box
      sx={{
        backgroundColor: currentColors.primary,
        color: currentColors.secondary,
        overflow: 'hidden',
        position: 'relative',
        minHeight: currentSize.height,
        border: 'none', // remove border
        borderRadius: 2,
        boxShadow: 'none', // remove shadow
        height: height || 'auto',
        '&:after': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          background: `linear-gradient(210.04deg, ${currentColors.accent} -50.94%, rgba(144, 202, 249, 0) 83.49%)`,
          borderRadius: '50%',
          top: -30,
          right: -180
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          background: `linear-gradient(140.9deg, ${currentColors.accent} -14.02%, transparent 77.58%)`,
          borderRadius: '50%',
          top: -160,
          right: -130
        }
      }}
    >
      <Box sx={{ p: currentSize.padding, height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header with Trend (no left icon) */}
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', mb: 1 }}>
          {change !== undefined && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              {trend === 'up' && <TrendingUp sx={{ color: theme.palette.success.main, fontSize: 14 }} />}
              {trend === 'down' && <TrendingDown sx={{ color: theme.palette.error.main, fontSize: 14 }} />}
              {trend === 'neutral' && <Remove sx={{ color: theme.palette.grey[400], fontSize: 14 }} />}
              <Chip
                label={`${change > 0 ? '+' : ''}${change}%`}
                size="small"
                sx={{
                  bgcolor:
                    trend === 'up' ? 'rgba(76, 175, 80, 0.2)' : trend === 'down' ? 'rgba(244, 67, 54, 0.2)' : 'rgba(158, 158, 158, 0.2)',
                  color:
                    trend === 'up' ? theme.palette.success.main : trend === 'down' ? theme.palette.error.main : theme.palette.grey[400],
                  border: `1px solid ${
                    trend === 'up' ? theme.palette.success.main : trend === 'down' ? theme.palette.error.main : theme.palette.grey[400]
                  }`,
                  fontSize: '0.6rem',
                  height: 18,
                  '& .MuiChip-label': { px: 0.75 }
                }}
              />
            </Box>
          )}
        </Box>

        {/* Value */}
        <Typography variant="h4" sx={{ color: '#ffff', mb: 0.25, textAlign: 'center', fontWeight: 800, lineHeight: 1.1 }}>
          {value}
        </Typography>

        {/* Title */}
        <Typography
          variant="caption"
          sx={{ color: 'grey.200', textAlign: 'center', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.6px' }}
        >
          {title}
        </Typography>
      </Box>
    </Box>
  );
};

export default AllyviaStats;
