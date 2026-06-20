import React from 'react';
import { alpha, useTheme } from '@mui/material/styles';
import { Box, Typography } from '@mui/material';
import AllyviaEmpty from './AllyviaEmpty';

// ==============================|| ALLYVIA STATS CARD ||============================== //

interface AllyviaStatsProps {
  title: string;
  value: string | number;
  theme?: 'default' | 'warning' | 'alert' | 'success' | 'gold';
  size?: 'small' | 'medium' | 'large';
  height?: number;
  loading?: boolean;
}

// Helper function to get colors and styles based on theme and size
const getCardStyles = (theme: any, themeType: string, size: string) => {
  // Theme-derived color palettes — all variants route through the brand
  // theme tokens so KPI tiles use the same status colors as chips/alerts
  // elsewhere in the app, and stay correct in dark mode.
  const palettes = {
    default: {
      primary: theme.palette.primary.dark,
      secondary: theme.palette.primary.light,
      accent: theme.palette.primary[200]
    },
    warning: {
      primary: theme.palette.warning.dark,
      secondary: theme.palette.warning.light,
      accent: alpha(theme.palette.warning.main, 0.45)
    },
    gold: {
      primary: theme.palette.gold[800],
      secondary: theme.palette.gold.dark,
      accent: theme.palette.gold[200]
    },
    alert: {
      primary: theme.palette.error.dark,
      secondary: theme.palette.error.light,
      accent: alpha(theme.palette.error.main, 0.45)
    },
    success: {
      primary: theme.palette.success.dark,
      secondary: theme.palette.success.light,
      accent: theme.palette.success[200]
    }
  } as const;

  // Get palette based on theme
  const paletteKey = (themeType as keyof typeof palettes) || 'default';
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

const AllyviaStats: React.FC<AllyviaStatsProps> = ({ title, value, theme: themeType = 'default', size = 'medium', height, loading }) => {
  const theme = useTheme();

  const { currentColors, currentSize } = getCardStyles(theme, themeType, size);

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
        <Box
          sx={{
            p: currentSize.padding,
            height: '100%',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {/* Value */}
          <Typography
            variant="h4"
            sx={{ color: themeType === 'gold' ? '#000000' : '#ffffff', mb: 0.25, textAlign: 'center', fontWeight: 800, lineHeight: 1.1 }}
          >
            {value}
          </Typography>

          {/* Title */}
          <Typography
            variant="caption"
            sx={{
              color: themeType === 'gold' ? '#000000' : 'grey.200',
              textAlign: 'center',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.6px'
            }}
          >
            {title}
          </Typography>
        </Box>
      </Box>
    </AllyviaEmpty>
  );
};

export default AllyviaStats;
