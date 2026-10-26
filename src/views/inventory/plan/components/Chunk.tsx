// One chunk of the memo: a sentence (or a figure) with its anchor, so a selection, a click or a citation can
// find it. Presentational; the page reads chunks back off the DOM by `data-anchor`.

import type { ReactNode } from 'react';

import Box from '@mui/material/Box';
import { alpha, type SxProps, type Theme } from '@mui/material/styles';

import type { ChunkView } from '../memo';

interface Props {
  chunk: ChunkView | null;
  as?: 'p' | 'span' | 'div';
  /** The memo's one tab stop (arrow keys move between chunks from there). */
  tabbable?: boolean;
  /** In the chat's context now. */
  chosen?: boolean;
  children?: ReactNode;
  sx?: SxProps<Theme>;
}

export default function Chunk({ chunk, as = 'span', tabbable = false, chosen = false, children, sx }: Props) {
  if (!chunk) return children ? <>{children}</> : null;
  return (
    <Box
      component={as}
      id={chunk.domId}
      data-anchor={chunk.anchor}
      data-citable={chunk.citable ? 'true' : undefined}
      data-chosen={chosen ? 'true' : undefined}
      tabIndex={tabbable ? 0 : -1}
      sx={[
        (theme) => ({
          borderRadius: '4px',
          outline: 'none',
          scrollMarginTop: '24px',
          transition: 'background-color 160ms ease',
          '&:hover': chunk.citable ? { bgcolor: alpha(theme.palette.primary.main, 0.05) } : undefined,
          '&:focus-visible': { boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.55)}` },
          '&[data-chosen="true"]': { bgcolor: alpha(theme.palette.primary.main, 0.1) },
          '&.plan-flash': { bgcolor: alpha(theme.palette.warning.main, 0.22) },
          '@media (prefers-reduced-motion: reduce)': { transition: 'none' }
        }),
        ...(Array.isArray(sx) ? sx : sx ? [sx] : [])
      ]}
    >
      {children ?? chunk.sentence}
    </Box>
  );
}
