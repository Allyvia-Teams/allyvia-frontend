// Which dashboard tiles carry the "Still importing" tag.
//
// A tile is tagged while a dataset its number depends on is part of a FIRST
// import that is running or waiting for review. It reads the same first-import
// states as the header's sync chip (views/pos-integrations/globalSync.ts), so
// routine syncs never tag anything, and the tag goes the moment the import
// completes (or fails, or is cancelled). There is no "Complete" tag.
//
// Pure, no React, so it tests without a DOM.

import type { IntegrationSync } from 'views/pos-integrations/globalSync';

/** The datasets a dashboard number can depend on. */
export type Dataset = 'orders' | 'invoices' | 'payments' | 'products' | 'variants' | 'stock_levels';

/** The dashboard tiles this tag is mapped for. */
export type DashboardTile = 'revenue' | 'sales' | 'average_sale' | 'low_stock' | 'out_of_stock' | 'inventory_value' | 'inventory_margin';

const SALES: Dataset[] = ['orders', 'invoices', 'payments'];
const INVENTORY: Dataset[] = ['products', 'variants', 'stock_levels'];

/** What each tile's number is built from. */
export const TILE_DATASETS: Record<DashboardTile, Dataset[]> = {
  revenue: SALES,
  sales: SALES,
  // Revenue divided by the sale count: both sales figures.
  average_sale: SALES,
  low_stock: INVENTORY,
  out_of_stock: INVENTORY,
  inventory_value: INVENTORY,
  inventory_margin: INVENTORY
};

/**
 * What a first import brings in, per source, from the backend's import:
 * QuickBooks pulls Items (inventory, with opening stock), Invoices and
 * Payments; Square's import bridges the catalog (items, variations, opening
 * stock levels) and orders, which carry their payments. The bank's first scan
 * feeds none of these tiles.
 */
const SOURCE_DATASETS: Record<string, Dataset[]> = {
  quickbooks: ['invoices', 'payments', 'products', 'stock_levels'],
  square: ['orders', 'payments', 'products', 'variants', 'stock_levels'],
  bank: []
};

/** A POS run's entity keys (MigrationRunSummary.progress) as datasets. */
const POS_ENTITY_DATASETS: Record<string, Dataset[]> = {
  order: ['orders'],
  product: ['products'],
  variant: ['variants'],
  inventory_level: ['stock_levels']
};

/** What a POS import covers before its run reports any entity: everything a POS import can bring in. */
const POS_DEFAULT: Dataset[] = ['orders', 'products', 'variants', 'stock_levels'];

const isFirstImportInFlight = (item: IntegrationSync): boolean => item.state === 'importing' || item.state === 'review';

const itemDatasets = (item: IntegrationSync): Dataset[] => {
  if (item.key.startsWith('pos:')) {
    if (!item.entities?.length) return POS_DEFAULT;
    return item.entities.flatMap((entity) => POS_ENTITY_DATASETS[entity] ?? []);
  }
  return SOURCE_DATASETS[item.key] ?? [];
};

/**
 * The tiles to tag "Still importing": those whose datasets are in a first
 * import that is running or waiting for review. Takes every integration's
 * first-import state (useGlobalSync().all).
 */
export const stillImportingTiles = (items: IntegrationSync[]): Set<DashboardTile> => {
  const importing = new Set(items.filter(isFirstImportInFlight).flatMap(itemDatasets));
  const tiles = (Object.keys(TILE_DATASETS) as DashboardTile[]).filter((tile) =>
    TILE_DATASETS[tile].some((dataset) => importing.has(dataset))
  );
  return new Set(tiles);
};

export const STILL_IMPORTING = 'Still importing';

/** The tag's hover text. */
export const STILL_IMPORTING_TOOLTIP = 'Your first import is still bringing in the data behind this number, so it may be incomplete.';
