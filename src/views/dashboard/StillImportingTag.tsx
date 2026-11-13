import { useMemo } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Tooltip from '@mui/material/Tooltip';
import { alpha, useTheme } from '@mui/material/styles';

// project imports
import { useGlobalSync } from 'hooks/useGlobalSync';
import { type DashboardTile, STILL_IMPORTING, STILL_IMPORTING_TOOLTIP, stillImportingTiles } from './stillImporting';

// ==============================|| DASHBOARD - STILL IMPORTING TAG ||============================== //
// A small tag beside a tile's label while a first import feeding its number is
// running or waiting for review (rules in stillImporting.ts). It just goes away
// when the import finishes; there is no "done" state.

/** The tiles to tag right now, from the one first-import engine in MainLayout. */
export const useStillImportingTiles = (): Set<DashboardTile> => {
  const { all } = useGlobalSync();
  return useMemo(() => stillImportingTiles(all), [all]);
};

export function StillImportingTag() {
  const theme = useTheme();
  return (
    <Tooltip title={STILL_IMPORTING_TOOLTIP} placement="top" arrow>
      <Box
        component="span"
        sx={{
          flexShrink: 0,
          fontSize: '0.6875rem',
          fontWeight: 600,
          lineHeight: 1.4,
          px: '6px',
          py: '1px',
          borderRadius: '6px',
          bgcolor: alpha(theme.palette.info.main, 0.12),
          color: theme.palette.mode === 'dark' ? theme.palette.info.light : theme.palette.info.dark,
          whiteSpace: 'nowrap',
          cursor: 'help'
        }}
      >
        {STILL_IMPORTING}
      </Box>
    </Tooltip>
  );
}

/** The tag for `tile`, or nothing when its data is not mid-import. */
export const stillImportingTag = (tiles: Set<DashboardTile>, tile: DashboardTile) => (tiles.has(tile) ? <StillImportingTag /> : undefined);
