import React from 'react';
import { Box, BoxProps } from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useBentoContainerStyles } from './useBentoColors';

interface BentoContainerProps {
  children: React.ReactNode;
  sx?: BoxProps['sx'];
}

const BentoContainer: React.FC<BentoContainerProps> = ({ children, sx = {} }) => {
  const theme = useTheme();
  const containerStyles = useBentoContainerStyles();

  return (
    <Box
      sx={{
        position: 'relative',
        background: containerStyles.background,
        borderRadius: `${containerStyles.borderRadius}px`,
        border: `2px solid ${containerStyles.borderColor}`,
        padding: `${containerStyles.padding}px`,
        boxShadow: containerStyles.boxShadow,
        overflow: 'hidden',
        // Add a subtle pattern overlay using theme colors
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: `
            radial-gradient(circle at 20% 80%, ${alpha(theme.palette.primary.main, 0.03)} 0%, transparent 50%),
            radial-gradient(circle at 80% 20%, ${alpha(theme.palette.success.main, 0.03)} 0%, transparent 50%),
            radial-gradient(circle at 40% 40%, ${alpha(theme.palette.secondary.main, 0.02)} 0%, transparent 50%)
          `,
          pointerEvents: 'none',
          zIndex: 0
        },
        // Container for the grid
        '& > .bento-grid': {
          position: 'relative',
          zIndex: 1,
          display: 'grid',
          gap: `${containerStyles.gap}px`,
          height: '100%',
          width: '100%'
        },
        ...sx
      }}
    >
      {children}
    </Box>
  );
};

export default BentoContainer;
