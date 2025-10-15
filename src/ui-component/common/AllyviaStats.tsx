import React from 'react';
import { useTheme } from '@mui/material/styles';
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
const goldShades = [
  '#FFFBEA', // 50  - very pale golden cream
  '#FFF3C4', // 100 - light buttery yellow
  '#FCE588', // 200 - gentle warm yellow
  '#FADB5F', // 300 - bright classic yellow-gold
  '#F7C948', // 400 - golden accent
  '#F0B429', // 500 - true gold
  '#DE911D', // 600 - deep golden amber
  '#C17D0A', // 700 - rich gold-brown
  '#9E6C00', // 800 - dark gold (lighter than #7A5B00)
  '#7A5B00' // 900 - deep warm brownish gold
];
// Helper function to get colors and styles based on theme and size
const getCardStyles = (theme: any, themeType: string, size: string) => {
  // Theme-based color palettes with custom colors
  const palettes = {
    default: {
      primary: theme.palette.primary.dark,
      secondary: theme.palette.primary.light,
      accent: theme.palette.primary[200]
    },
    warning: {
      primary: '#DAA520', // Dark Yellow (darker)
      secondary: '#FFD700', // Gold Yellow (medium)
      accent: '#FFFF00' // Bright Yellow (lightest)
    },
    gold: {
      primary: '#FCE588', // Dark Yellow (darker)
      secondary: '#DAA520', // Gold Yellow (medium)
      accent: '#DAA520' // Bright Yellow (lightest)
    },
    alert: {
      primary: '#B22222', // Dark Red (darker)
      secondary: '#FF4444', // Medium Red
      accent: '#FF6B6B' // Light Red (lightest)
    },
    success: {
      primary: '#228B22', // Forest Green (darker)
      secondary: '#32CD32', // Lime Green (medium)
      accent: '#00FF7F' // Spring Green (lightest)
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
