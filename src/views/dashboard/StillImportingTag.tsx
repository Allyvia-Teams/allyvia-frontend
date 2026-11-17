import { useMemo } from 'react';

// project imports
import { useGlobalSync } from 'hooks/useGlobalSync';
import StatusTag from 'ui-component/frame/StatusTag';
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
  return <StatusTag label={STILL_IMPORTING} tooltip={STILL_IMPORTING_TOOLTIP} tone="info" />;
}

/** The tag for `tile`, or nothing when its data is not mid-import. */
export const stillImportingTag = (tiles: Set<DashboardTile>, tile: DashboardTile) => (tiles.has(tile) ? <StillImportingTag /> : undefined);
