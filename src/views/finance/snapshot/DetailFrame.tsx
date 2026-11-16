import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// project imports
import { PageHeader, StatusTag } from 'ui-component/frame';
import { withRange, type FigureView, type Range } from './snapshotView';

// The frame every Finance detail page shares: a quiet way back to the snapshot (same range and
// store), the page title, the shared controls, then the page's panels stacked 16px apart.

interface DetailFrameProps {
  title: string;
  subtitle?: ReactNode;
  range: Range;
  locationId?: string | null;
  controls?: ReactNode;
  children: ReactNode;
}

export default function DetailFrame({ title, subtitle, range, locationId, controls, children }: DetailFrameProps) {
  return (
    <>
      <Typography sx={{ fontSize: '0.8125rem', mb: '6px' }}>
        <Link component={RouterLink} to={withRange('/finance', range, locationId)} underline="hover" color="text.secondary">
          ← Finance & accounting
        </Link>
      </Typography>
      <PageHeader title={title} subtitle={subtitle} right={controls} />
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>{children}</Box>
    </>
  );
}

/** A labelled currency group, only when there is more than one currency. */
export function CurrencyGroup({ heading, children }: { heading: string | null; children: ReactNode }) {
  return (
    <Box
      component="section"
      aria-label={heading ? `Figures in ${heading}` : undefined}
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {heading ? <Typography sx={{ fontSize: '1rem', fontWeight: 700, color: 'text.dark' }}>{heading}</Typography> : null}
      {children}
    </Box>
  );
}

export const currencyHeading = (count: number, currency: string): string | null => (count > 1 ? currency : null);

/** A headline figure inside a panel: amount (or "Not available" with its reason) and its badge. */
export function Headline({ view, caption }: { view: FigureView; caption?: ReactNode }) {
  const unavailable = view.figure.value === null || view.figure.status === 'unavailable';
  return (
    <Box sx={{ px: '14px', pt: '12px', pb: '4px' }}>
      <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, flexWrap: 'wrap' }}>
        <Typography
          sx={{
            fontSize: unavailable ? '1.125rem' : '1.5rem',
            fontWeight: unavailable ? 600 : 700,
            color: unavailable ? 'text.secondary' : 'text.dark',
            letterSpacing: '-0.02em'
          }}
        >
          {view.text}
        </Typography>
        {view.badge.label ? <StatusTag label={view.badge.label} tooltip={view.badge.tooltip} tone="warning" /> : null}
      </Box>
      {view.secondary ? <Typography sx={{ fontSize: '0.8125rem', color: 'text.disabled' }}>{view.secondary}</Typography> : null}
      {caption ? <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary', mt: '2px' }}>{caption}</Typography> : null}
    </Box>
  );
}
