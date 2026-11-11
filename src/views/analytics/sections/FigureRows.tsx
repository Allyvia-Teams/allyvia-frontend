import type { ReactNode } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// project imports
import { PanelMessage } from 'ui-component/frame';

export interface FigureRow {
  label: string;
  value: ReactNode;
  tone?: 'default' | 'error';
}

interface FigureRowsProps {
  value: ReactNode;
  basis: ReactNode;
  rows: FigureRow[];
  loading?: boolean;
  error?: boolean;
}

/** One headline figure with its basis, then a few labelled lines (Stock, Team, Customers). */
export default function FigureRows({ value, basis, rows, loading, error }: FigureRowsProps) {
  if (loading) {
    return (
      <Box sx={{ p: '14px' }}>
        <Skeleton width={120} height={40} />
        <Skeleton width={180} />
        <Skeleton height={34} />
        <Skeleton height={34} />
      </Box>
    );
  }
  if (error) return <PanelMessage>Couldn't load this. Refresh the page to try again.</PanelMessage>;
  return (
    <Box sx={{ p: '14px', display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Box>
        <Typography sx={{ fontSize: '1.75rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2, color: 'text.dark' }}>
          {value}
        </Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{basis}</Typography>
      </Box>
      <Box component="dl" sx={{ m: 0 }}>
        {rows.map((r) => (
          <Box
            key={r.label}
            sx={{ display: 'flex', justifyContent: 'space-between', gap: 1.5, py: 1, borderTop: '1px solid', borderColor: 'grey.100' }}
          >
            <Typography component="dt" sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              {r.label}
            </Typography>
            <Typography
              component="dd"
              sx={{
                m: 0,
                fontSize: '0.875rem',
                fontWeight: 600,
                fontVariantNumeric: 'tabular-nums',
                color: r.tone === 'error' ? 'error.dark' : 'text.dark'
              }}
            >
              {r.value}
            </Typography>
          </Box>
        ))}
      </Box>
    </Box>
  );
}
