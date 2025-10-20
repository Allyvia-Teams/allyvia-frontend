import { Box, Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';

export default function InsightCardSkeleton() {
  return (
    <MainCard border>
      <Box sx={{ p: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <Skeleton variant="circular" width={24} height={24} />
            <Skeleton variant="text" width={180} height={32} />
          </Box>
          <Skeleton variant="rounded" width={80} height={24} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="60%" height={24} />
          <Skeleton variant="text" width="50%" height={24} />
          <Skeleton variant="text" width="55%" height={24} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1, mb: 1 }} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1, mb: 1 }} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="100%" height={8} sx={{ borderRadius: 1, mb: 1 }} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>

        <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
          <Skeleton variant="text" width="100%" height={60} />
        </Box>
      </Box>
    </MainCard>
  );
}
