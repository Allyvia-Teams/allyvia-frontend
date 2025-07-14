// material-ui
import { Box, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import Card from '@mui/material/Card';
import { mediumWidgetHeight } from 'store/constant';
import { useState } from 'react';

// ==============================|| SKELETON - QB-WIDGET ||============================== //

export type QBWidgetSkeletonType = 'loading' | 'error'

export function QBWidgetLoadingSkeleton() {
  const shimmer = 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)'
  const shimmerAnimation = 'shimmer 750ms ease-in-out infinite'
  return (
    <Card 
      sx={{ 
        height: `${mediumWidgetHeight}px`, 
        bgcolor: "primary.light",
        border: "none",
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: shimmer,
          animation: shimmerAnimation,
          zIndex: 1,
          cursor: 'pointer',
        },
        '@keyframes shimmer': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      }} 
   />
  );
}

export function QBWidgetErrorSkeleton({refetch}: {refetch?: () => void}) {
  const [isSpinning, setIsSpinning] = useState(false);
  return (
    <Card 
        onClick={refetch} 
        onMouseEnter={() => {
          setIsSpinning(true);
          setTimeout(() => setIsSpinning(false), 800);
        }}
      sx={{ 
        height: `${mediumWidgetHeight}px`, 
        bgcolor: "error.light",
        border: "1px solid error.main",
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          background: "error.light",
          zIndex: 1,
          cursor: 'pointer',
        },
        '@keyframes shimmer': {
          '0%': {
            transform: 'translateX(-100%)',
          },
          '100%': {
            transform: 'translateX(100%)',
          },
        },
      }} 
    >
        <Box 
           sx={{ display: 'flex', width: '100%', height: '100%', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', zIndex: 2 }}>          
          <Typography sx={{ overflow:'hidden', position: 'absolute', top: 8, zIndex: 2, color: 'error.dark', fontSize: '1rem', fontWeight: 500 }}>
            Error fetching data
          </Typography>
          <Box flexGrow={1} />
          <RefreshIcon 
             sx={{ 
               fontSize: '80px', 
               cursor: 'pointer', 
               zIndex: 2, 
               color: 'error.dark',
               animation: isSpinning ? 'spin 0.8s ease forwards' : 'none',
               '@keyframes spin': {
                 '0%': {
                   transform: 'rotate(0deg)'
                 },
                 '100%': {
                   transform: 'rotate(360deg)'
                 }
               }
             }} 
           />
          <Box flexGrow={1} />
          <Typography sx={{ overflow:'hidden', position: 'absolute', bottom: 8, zIndex: 2, color: 'error.dark', fontSize: '1rem', fontWeight: 500 }}>
            Click to refresh
          </Typography>
        </Box>
      </Card>
  );
}
