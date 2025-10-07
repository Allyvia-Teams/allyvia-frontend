import React from 'react';
import { Box, BoxProps, Typography, Paper } from '@mui/material';
import { useTheme, alpha, keyframes } from '@mui/material/styles';
import { BentoColorScheme, useBentoColors } from '../useBentoColors';

export type BentoTileVariant = 'hero-wide' | 'hero-tall' | 'medium' | 'small' | 'mini' | 'strip';

interface BentoTileProps {
  variant?: BentoTileVariant;
  colorScheme: BentoColorScheme;
  title?: string;
  loading?: boolean;
  error?: string | null;
  onClick?: () => void;
  children: React.ReactNode;
  glowEffect?: boolean;
  icon?: React.ReactNode;
  sx?: BoxProps['sx'];
  gridArea?: string;
}

// Minimum heights for different variants
const minHeightConfig: Record<BentoTileVariant, number> = {
  'hero-wide': 200,
  'hero-tall': 400,
  medium: 180,
  small: 140,
  mini: 120,
  strip: 100
};

const BentoTile: React.FC<BentoTileProps> = ({
  variant = 'medium',
  colorScheme,
  title,
  loading = false,
  error = null,
  onClick,
  children,
  glowEffect = false,
  icon,
  sx = {},
  gridArea
}) => {
  const theme = useTheme();
  const minHeight = minHeightConfig[variant];
  const bentoColors = useBentoColors();
  const colors = bentoColors[colorScheme];

  const handleClick = () => {
    if (onClick && !loading) {
      onClick();
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        gridArea,
        minHeight,
        background: colors.gradient,
        borderRadius: '12px',
        padding: theme.spacing(2.5),
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        color: colors.textColor,
        ...(glowEffect && {
          boxShadow: `0 0 40px ${colors.glowColor || alpha(colors.solidColor, 0.2)}`
        }),
        '&:hover': onClick
          ? {
              transform: 'translateY(-3px) scale(1.01)',
              boxShadow: `0 20px 40px ${alpha(colors.solidColor, 0.25)}`
            }
          : {},
        '&:active': onClick
          ? {
              transform: 'translateY(-1px) scale(0.99)'
            }
          : {},
        ...sx
      }}
      onClick={handleClick}
    >
      {/* Title and Icon Header */}
      {(title || icon) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 2,
            position: 'relative',
            zIndex: 1
          }}
        >
          {title && (
            <Typography
              variant={variant === 'hero-wide' || variant === 'hero-tall' ? 'h5' : 'h6'}
              sx={{
                fontWeight: 600,
                color: colors.textColor,
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}
            >
              {title}
            </Typography>
          )}
          {icon && (
            <Box
              sx={{
                color: colors.iconColor,
                opacity: 0.9,
                '& svg': {
                  fontSize: variant === 'mini' ? 20 : 24
                }
              }}
            >
              {icon}
            </Box>
          )}
        </Box>
      )}

      {/* Content Area */}
      <Box
        sx={{
          position: 'relative',
          zIndex: 1,
          height: title || icon ? `calc(100% - 40px)` : '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: error ? 'center' : 'flex-start',
          alignItems: error ? 'center' : 'stretch'
        }}
      >
        {error && !loading && (
          <Typography variant="body2" sx={{ color: colors.textColor, opacity: 0.9 }} align="center">
            {error}
          </Typography>
        )}

        {!error && (
          <Box
            sx={{
              position: 'relative',
              filter: loading ? 'blur(4px)' : 'none',
              opacity: loading ? 0.6 : 1,
              transition: 'all 0.3s ease',
              '& .MuiTypography-root': loading
                ? {
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      top: 0,
                      left: '-100%',
                      width: '100%',
                      height: '100%',
                      background: `linear-gradient(90deg,
                        transparent,
                        ${alpha(colors.textColor, 0.3)},
                        transparent)`,
                      animation: `${keyframes`
                        from { left: -100%; }
                        to { left: 100%; }
                      `} 1.5s infinite`
                    }
                  }
                : {}
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default BentoTile;
