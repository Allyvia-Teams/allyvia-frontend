import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

// ==============================|| FRAME - PAGE HEADER ||============================== //
// Design handoff 1.1 step 1: title row. h3 22/700, a one-clause subtitle carrying
// the window and freshness, and right-aligned controls (range selector, then
// actions). Nothing renders above it; it starts at the content gutter.

export interface PageHeaderProps {
  title: ReactNode;
  /** One clause: "Last 30 days · as of 02:42 PM", "Snapshot as of now". */
  subtitle?: ReactNode;
  /** Right-aligned controls: range selector first, then actions. */
  right?: ReactNode;
  /** Optional tabs row (design handoff 1.1 step 2) rendered under the title row. */
  tabs?: ReactNode;
}

export default function PageHeader({ title, subtitle, right, tabs }: PageHeaderProps) {
  return (
    <Box component="header" sx={{ mb: tabs ? 0 : '14px' }}>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap', mb: tabs ? '10px' : 0 }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="h3" component="h1" sx={{ lineHeight: 1.2 }}>
            {title}
          </Typography>
          {subtitle ? (
            <Typography sx={{ mt: '3px', fontSize: '0.875rem', color: 'grey.600', lineHeight: 1.4 }}>{subtitle}</Typography>
          ) : null}
        </Box>
        {right ? <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>{right}</Box> : null}
      </Box>
      {tabs ? <Box sx={{ mb: '14px' }}>{tabs}</Box> : null}
    </Box>
  );
}
