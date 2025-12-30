import { Box, Skeleton } from '@mui/material';

export function MetadataBannerSkeleton() {
  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        mb: 3,
        flexWrap: 'wrap',
        p: 2.5,
        border: 1,
        borderColor: 'divider',
        borderRadius: 1,
        bgcolor: '#f8f9fa',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}
    >
      {[1, 2, 3, 4].map((item) => (
        <Box key={item} sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, alignItems: 'center', flex: 1, minWidth: '120px' }}>
          <Skeleton variant="text" width={100} height={16} />
          <Skeleton variant="text" width={120} height={20} />
        </Box>
      ))}
    </Box>
  );
}

export function SummarySectionSkeleton() {
  return (
    <Box
      sx={{
        mb: 3,
        p: 3,
        bgcolor: '#f8f9fa',
        borderRadius: 2,
        border: 'none',
        borderLeft: '4px solid',
        borderLeftColor: 'primary.main',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2.5 }}>
        <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
        <Skeleton variant="text" width={120} height={32} />
      </Box>
      <Skeleton variant="text" width="100%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="95%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="90%" height={20} sx={{ mb: 1 }} />
      <Skeleton variant="text" width="85%" height={20} />
    </Box>
  );
}

export function AlertsPanelSkeleton() {
  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
            <Skeleton variant="text" width={140} height={32} />
          </Box>
          <Box sx={{ display: 'flex', gap: 1.5 }}>
            <Skeleton variant="text" width={60} height={20} />
            <Skeleton variant="text" width={70} height={20} />
          </Box>
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {[1, 2, 3].map((item) => (
          <Box
            key={item}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
              <Skeleton variant="circular" width={24} height={24} />
              <Skeleton variant="text" width={80} height={20} />
              <Skeleton variant="text" width={100} height={16} sx={{ ml: 'auto' }} />
            </Box>
            <Skeleton variant="text" width="100%" height={18} sx={{ mb: 0.5 }} />
            <Skeleton variant="text" width="90%" height={18} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function PrioritiesPanelSkeleton() {
  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="text" width={140} height={32} />
        </Box>
      </Box>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {[1, 2, 3].map((item) => (
          <Box key={item} sx={{ display: 'flex', gap: 1.5, alignItems: 'flex-start' }}>
            <Skeleton variant="text" width={32} height={32} />
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="80%" height={24} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="100%" height={18} sx={{ mb: 0.5 }} />
              <Skeleton variant="text" width="95%" height={18} />
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export function DailyDetailsSectionSkeleton() {
  return (
    <Box
      sx={{
        mb: 3,
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Skeleton variant="rectangular" width={36} height={36} sx={{ borderRadius: 1.5 }} />
          <Skeleton variant="text" width={140} height={32} />
        </Box>
      </Box>

      {/* Day tabs skeleton */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, flexWrap: 'wrap' }}>
        {[1, 2].map((item) => (
          <Skeleton key={item} variant="rounded" width={120} height={36} />
        ))}
      </Box>

      {/* Selected day info skeleton */}
      <Box sx={{ mb: 3, p: 2, bgcolor: '#f8f9fa', borderRadius: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Skeleton variant="circular" width={48} height={48} />
          <Box sx={{ flex: 1 }}>
            <Skeleton variant="text" width={200} height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width={150} height={20} />
          </Box>
          <Skeleton variant="rounded" width={80} height={32} />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Skeleton variant="rounded" width={100} height={24} />
          <Skeleton variant="rounded" width={100} height={24} />
          <Skeleton variant="rounded" width={100} height={24} />
        </Box>
      </Box>

      {/* Time blocks skeleton */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {[1, 2, 3, 4].map((item) => (
          <Box
            key={item}
            sx={{
              p: 2,
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              bgcolor: 'background.paper'
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Skeleton variant="text" width={100} height={20} />
                <Skeleton variant="rounded" width={60} height={24} />
              </Box>
              <Skeleton variant="rounded" width={80} height={24} />
            </Box>
            <Skeleton variant="text" width="100%" height={18} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="90%" height={18} />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
