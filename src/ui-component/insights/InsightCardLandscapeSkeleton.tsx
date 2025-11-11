import { Box, Skeleton } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import MetricCardsRow from './MetricCardsRow';

export default function InsightCardLandscapeSkeleton() {
  return (
    <MainCard border>
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box display="flex" alignItems="center" gap={1.5}>
          <Skeleton variant="circular" width={24} height={24} />
          <Skeleton variant="text" width={200} height={32} />
        </Box>
        <Skeleton variant="rounded" width={90} height={28} />
      </Box>

      <MetricCardsRow>
        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 120
          }}
        >
          <Skeleton variant="rounded" width={48} height={48} />
          <Box flex={1}>
            <Skeleton variant="text" width="70%" height={32} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" height={16} />
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 120
          }}
        >
          <Skeleton variant="rounded" width={48} height={48} />
          <Box flex={1}>
            <Skeleton variant="text" width="60%" height={32} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="85%" height={16} />
          </Box>
        </Box>

        <Box
          sx={{
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 2,
            height: 120
          }}
        >
          <Skeleton variant="rounded" width={48} height={48} />
          <Box flex={1}>
            <Skeleton variant="text" width="50%" height={32} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="80%" height={16} />
          </Box>
        </Box>
      </MetricCardsRow>

      <Box mb={3}>
        <Skeleton variant="text" width="40%" height={28} sx={{ mb: 2 }} />

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="100%" height={10} sx={{ borderRadius: 1, mb: 0.5 }} />
          <Skeleton variant="text" width="50%" height={16} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="85%" height={10} sx={{ borderRadius: 1, mb: 0.5 }} />
          <Skeleton variant="text" width="45%" height={16} />
        </Box>

        <Box mb={2}>
          <Skeleton variant="text" width="100%" height={20} sx={{ mb: 0.5 }} />
          <Skeleton variant="rectangular" width="70%" height={10} sx={{ borderRadius: 1, mb: 0.5 }} />
          <Skeleton variant="text" width="40%" height={16} />
        </Box>
      </Box>

      <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
        <Skeleton variant="text" width="30%" height={28} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="95%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="90%" height={20} />
      </Box>
    </MainCard>
  );
}
