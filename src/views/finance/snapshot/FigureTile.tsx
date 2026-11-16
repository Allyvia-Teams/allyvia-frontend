import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';

// material-ui
import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Typography from '@mui/material/Typography';

// project imports
import { KpiTile, StatusTag } from 'ui-component/frame';
import type { FigureView } from './snapshotView';

/** "Estimated" / "Partial" with the reason on hover and focus; nothing for exact or unavailable. */
export function FigureBadge({ badge }: { badge: FigureView['badge'] }) {
  return badge.label ? <StatusTag label={badge.label} tooltip={badge.tooltip} tone="warning" /> : null;
}

/**
 * A tile amount's font size: 1.75rem, shrunk to fit the tile's width (the tile is a size
 * container) so a seven-figure amount stays whole on a phone. Only the text's length is read.
 */
export const tileValueFontSize = (text: string): string => {
  const ems = Math.max(text.length, 8) * 0.62; // not money: character count of the displayed text
  return `min(1.75rem, calc((100cqi - 30px) / ${ems.toFixed(2)}))`; // not money: a CSS length
};

/** A figure's value: the amount, or a quieter "Not available" that fits a tile. */
export function FigureValue({ view, size = 'tile' }: { view: FigureView; size?: 'tile' | 'row' }) {
  if (view.figure.value === null || view.figure.status === 'unavailable') {
    return (
      <Box component="span" sx={{ fontSize: size === 'tile' ? '1.125rem' : '0.875rem', fontWeight: 600, color: 'text.secondary' }}>
        {view.text}
      </Box>
    );
  }
  if (size === 'tile') {
    return (
      <Box
        component="span"
        sx={{
          display: 'block',
          fontSize: tileValueFontSize(view.text),
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: '100%'
        }}
      >
        {view.text}
      </Box>
    );
  }
  return <>{view.text}</>;
}

/** An unavailable figure's reason: a link to the bank page when connecting a bank is the fix. */
export function FigureReason({ view, inTile = false }: { view: FigureView; inTile?: boolean }) {
  if (!view.secondary) return null;
  if (view.fixHref) {
    return inTile ? (
      <InnerLink to={view.fixHref}>{view.secondary}</InnerLink>
    ) : (
      <Link component={RouterLink} to={view.fixHref} underline="hover" sx={{ fontWeight: 600 }}>
        {view.secondary}
      </Link>
    );
  }
  return <>{view.secondary}</>;
}

/** A link that sits above a tile's stretched link, so it can live inside the tile. */
export function InnerLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link component={RouterLink} to={to} underline="hover" sx={{ position: 'relative', zIndex: 1, fontWeight: 600 }}>
      {children}
    </Link>
  );
}

interface FigureTileProps {
  view: FigureView;
  href: string;
  loading?: boolean;
  /** Extra line under the basis, e.g. the "not yet categorized" link. */
  footer?: ReactNode;
}

/**
 * KpiTile for one snapshot figure. The whole tile opens `href` through a stretched link on
 * the label, so a link inside the tile (footer) stays valid HTML and separately clickable.
 */
export default function FigureTile({ view, href, loading, footer }: FigureTileProps) {
  const basis =
    view.secondary || footer ? (
      <>
        {view.secondary ? (
          <Box component="span">
            <FigureReason view={view} inTile />
          </Box>
        ) : null}
        {footer ? (
          <Typography component="div" sx={{ fontSize: '0.8125rem', mt: view.secondary ? '2px' : 0 }}>
            {footer}
          </Typography>
        ) : null}
      </>
    ) : undefined;
  return (
    <Box
      sx={{
        position: 'relative',
        minWidth: 0,
        display: 'flex',
        containerType: 'inline-size',
        borderRadius: '10px',
        // Every tile in a row is as tall as the tallest (KpiRow stretches the wrapper, not the tile).
        '& > div': { flex: 1 },
        '&:hover > div': { borderColor: 'primary.light' },
        '&:focus-within': { outline: '2px solid', outlineColor: 'primary.main', outlineOffset: '1px' }
      }}
    >
      <KpiTile
        label={
          <Link
            component={RouterLink}
            to={href}
            underline="none"
            color="inherit"
            sx={{ '&::after': { content: '""', position: 'absolute', inset: 0, zIndex: 0 }, '&:focus-visible': { outline: 'none' } }}
          >
            {view.label}
          </Link>
        }
        value={<FigureValue view={view} />}
        tag={<FigureBadge badge={view.badge} />}
        basis={basis}
        loading={loading}
      />
    </Box>
  );
}
