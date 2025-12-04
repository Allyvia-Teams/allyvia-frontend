import React from 'react';
import { useTheme } from '@mui/material/styles';
import { Box, Typography, Chip } from '@mui/material';

interface AllyviaSubcardProps {
  value: string | number;
  label: string;
  subtitle?: string;
  height?: number | string;
  icon?: React.ReactNode;
  iconSize?: 'small' | 'medium' | 'large';
  badge?: string | number;
  onClick?: () => void;
}

const iconSizes = {
  small: 32,
  medium: 40,
  large: 48
};

const AllyviaSubcard: React.FC<AllyviaSubcardProps> = ({
  value,
  label,
  subtitle,
  height = 120,
  icon,
  iconSize = 'medium',
  badge,
  onClick
}) => {
  const muiTheme = useTheme();

  const deepColor = muiTheme.palette.primary.dark;
  const mediumColor = muiTheme.palette.primary.main;
  const lightColor = muiTheme.palette.primary.light;

  const actualIconSize = iconSizes[iconSize];

  const background = `linear-gradient(45deg, ${deepColor} 0%, ${mediumColor} 50%, ${lightColor} 100%)`;

  return (
    <Box
      onClick={onClick}
      sx={{
        background,
        borderRadius: 3,
        overflow: 'hidden',
        position: 'relative',
        minHeight: height,
        width: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.3s ease',
        boxShadow: `0 4px 12px ${deepColor}26`,
        '&:hover': onClick
          ? {
              transform: 'translateY(-4px)',
              boxShadow: `0 8px 24px ${deepColor}40`
            }
          : {},
        '&:after': {
          content: '""',
          position: 'absolute',
          width: 210,
          height: 210,
          background: `linear-gradient(210.04deg, ${lightColor}40 -50.94%, rgba(255, 255, 255, 0) 83.49%)`,
          borderRadius: '50%',
          top: -30,
          right: -100,
          opacity: 0.25
        },
        '&:before': {
          content: '""',
          position: 'absolute',
          width: 180,
          height: 180,
          background: `linear-gradient(140.9deg, ${lightColor}30 -14.02%, transparent 77.58%)`,
          borderRadius: '50%',
          top: -100,
          right: -60,
          opacity: 0.2
        }
      }}
    >
      <Box
        sx={{
          p: 2.5,
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          position: 'relative',
          zIndex: 1
        }}
      >
        {icon && (
          <Box
            sx={{
              color: '#ffffff',
              opacity: 0.9,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              '& > svg': {
                width: actualIconSize,
                height: actualIconSize
              }
            }}
          >
            {icon}
          </Box>
        )}

        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 0.5
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
            <Typography
              variant="h3"
              sx={{
                color: '#ffffff',
                fontWeight: 700,
                lineHeight: 1.2
              }}
            >
              {value}
            </Typography>

            {badge && (
              <Chip
                label={badge}
                size="small"
                sx={{
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 600,
                  height: 20,
                  fontSize: '0.7rem'
                }}
              />
            )}
          </Box>

          <Typography
            variant="body2"
            sx={{
              color: '#ffffff',
              opacity: 0.85,
              fontWeight: 500,
              letterSpacing: '0.3px'
            }}
          >
            {label}
          </Typography>

          {subtitle && (
            <Typography
              variant="caption"
              sx={{
                color: '#ffffff',
                opacity: 0.7,
                fontSize: '0.7rem'
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
};

export default AllyviaSubcard;
