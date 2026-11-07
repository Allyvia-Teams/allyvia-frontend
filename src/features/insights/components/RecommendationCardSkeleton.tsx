import { Box, Skeleton, Stack } from '@mui/material';

import { NARROW_PAGE } from '../layout';

/**
 * A loading placeholder in the card's own frame (S6): the same border, radius,
 * padding, icon tile, text lines, impact figure and 40px footer buttons, so the
 * page does not jump when the cards arrive.
 */
export default function RecommendationCardSkeleton() {
  return (
    <Box
      aria-hidden
      data-card-skeleton
      sx={{ bgcolor: 'background.paper', border: 1, borderColor: 'divider', borderRadius: '12px', overflow: 'hidden' }}
    >
      <Stack direction="row" spacing={2} sx={{ alignItems: 'flex-start', p: { xs: 2, md: 3 }, [NARROW_PAGE]: { p: 2 } }}>
        <Skeleton variant="rounded" width={40} height={40} sx={{ flexShrink: 0, borderRadius: '10px' }} />
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={{ xs: 1.5, md: 2 }}
            useFlexGap
            sx={{ justifyContent: 'space-between', [NARROW_PAGE]: { flexDirection: 'column', gap: 1.5 } }}
          >
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Skeleton variant="text" width="45%" sx={{ fontSize: '0.75rem', lineHeight: 1.6 }} />
              <Skeleton variant="text" width="70%" sx={{ fontSize: '1.125rem', lineHeight: 1.35, mt: 0.5 }} />
              <Skeleton variant="text" width="100%" sx={{ fontSize: '0.875rem', lineHeight: 1.5, mt: 0.75 }} />
              <Skeleton variant="text" width="85%" sx={{ fontSize: '0.875rem', lineHeight: 1.5 }} />
            </Box>
            <Box sx={{ flexShrink: 0, width: 110 }}>
              <Skeleton
                variant="text"
                width={96}
                sx={{ fontSize: '1.5rem', lineHeight: 1.2, ml: { md: 'auto' }, [NARROW_PAGE]: { ml: 0 } }}
              />
              <Skeleton variant="text" width={110} sx={{ fontSize: '0.75rem', lineHeight: 1.66 }} />
            </Box>
          </Stack>
          <Stack direction="row" spacing={1} sx={{ mt: 2.5 }}>
            <Skeleton variant="rounded" width={132} height={40} sx={{ borderRadius: '8px' }} />
            <Skeleton variant="rounded" width={88} height={40} sx={{ borderRadius: '8px' }} />
          </Stack>
        </Box>
      </Stack>
    </Box>
  );
}
