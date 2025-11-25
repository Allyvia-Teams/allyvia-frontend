// material-ui
import { Box, Typography } from '@mui/material';
import Card from '@mui/material/Card';

// ==============================|| UI SKELETON ||============================== //

type SkeletonProps = {
  height: number;
  width?: string;
};

export function LoadingSkeleton({ height, width }: SkeletonProps) {
  const shimmer = 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)';
  const shimmerAnimation = 'shimmer 750ms ease-in-out infinite';
  return (
    <Card
      sx={{
        height: `${height}px`,
        width: width ?? '100%',
        bgcolor: 'primary.light',
        border: 'none',
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
          animation: shimmerAnimation
        },
        '@keyframes shimmer': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          }
        }
      }}
    />
  );
}

export function ErrorSkeleton({ height, width }: SkeletonProps) {
  return (
    <Card
      sx={{
        height: `${height}px`,
        width: width ?? '100%',
        bgcolor: 'error.light',
        border: '1px solid error.main',
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
          background: 'error.light'
        },
        '@keyframes shimmer': {
          '0%': {
            transform: 'translateX(-100%)'
          },
          '100%': {
            transform: 'translateX(100%)'
          }
        }
      }}
    >
      <Box
        sx={{
          display: 'flex',
          width: '100%',
          height: '100%',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 2
        }}
      >
        <Typography sx={{ overflow: 'hidden', zIndex: 2, color: 'error.dark', fontSize: '1rem', fontWeight: 500 }}>
          Error fetching data
        </Typography>
        <Typography sx={{ overflow: 'hidden', zIndex: 2, color: 'error.dark', fontSize: '1rem', fontWeight: 500 }}>
          Trying again...
        </Typography>
      </Box>
    </Card>
  );
}
