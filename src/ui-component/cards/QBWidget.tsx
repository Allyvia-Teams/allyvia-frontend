// material-ui
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import { mediumWidgetHeight } from 'store/constant';

// ==============================|| SKELETON - QB-WIDGET ||============================== //

export default function QBWidgetSkeleton() {

  return (
    <Card 
      sx={{ 
        height: `${mediumWidgetHeight}px`, 
        bgcolor: "primary.light",
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
          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.8), transparent)',
          animation: 'shimmer 750ms ease-in-out infinite',
          zIndex: 1,
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
