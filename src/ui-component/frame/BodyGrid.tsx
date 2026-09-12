import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';

// ==============================|| FRAME - BODY GRID ||============================== //
// Design handoff 1.1 step 5: `minmax(420px, 1.62fr) minmax(250px, 0.9fr)`, 16px
// gap. The main column stacks panels at 16px; the rail stacks cards at 12px.
// Below the tablet breakpoint the rail drops under the main column.

export default function BodyGrid({ main, rail }: { main: ReactNode; rail?: ReactNode }) {
  return (
    <Box
      sx={{
        display: 'grid',
        gap: 2,
        alignItems: 'start',
        gridTemplateColumns: rail ? { xs: 'minmax(0, 1fr)', lg: 'minmax(420px, 1.62fr) minmax(250px, 0.9fr)' } : 'minmax(0, 1fr)'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>{main}</Box>
      {rail ? <Box sx={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: 0 }}>{rail}</Box> : null}
    </Box>
  );
}
