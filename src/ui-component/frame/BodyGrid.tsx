import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';

// project imports
import { headerHeight } from 'store/constant';

// ==============================|| FRAME - BODY GRID ||============================== //
// Design handoff 1.1 step 5: `minmax(420px, 1.62fr) minmax(250px, 0.9fr)`, 16px
// gap. The main column stacks panels at 16px; the rail stacks cards at 12px and
// sticks to the top of the viewport while the main column scrolls, so a short
// rail beside a long column never leaves the right edge blank. Panels that are
// wider than the rail is tall (tables, charts) go in `below`, spanning the full
// width under the two-column zone. Under the tablet breakpoint everything
// stacks in one column.

export default function BodyGrid({ main, rail, below }: { main: ReactNode; rail?: ReactNode; below?: ReactNode }) {
  return (
    <>
      <Box
        sx={{
          display: 'grid',
          gap: 2,
          alignItems: 'start',
          gridTemplateColumns: rail ? { xs: 'minmax(0, 1fr)', lg: 'minmax(420px, 1.62fr) minmax(250px, 0.9fr)' } : 'minmax(0, 1fr)'
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>{main}</Box>
        {rail ? (
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              gap: '12px',
              minWidth: 0,
              position: { lg: 'sticky' },
              top: { lg: headerHeight + 16 }
            }}
          >
            {rail}
          </Box>
        ) : null}
      </Box>
      {below ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 2, minWidth: 0 }}>{below}</Box> : null}
    </>
  );
}
