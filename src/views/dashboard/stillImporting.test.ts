import { describe, expect, it } from 'vitest';

import type { MigrationRunSummary, PosConnection } from 'api/posIntegrations.api';
import type { ImportJobStatus } from 'api/square';
import { globalSync } from 'views/pos-integrations/globalSync';
import type { IntegrationSync, SyncState } from 'views/pos-integrations/globalSync';

import { STILL_IMPORTING, STILL_IMPORTING_TOOLTIP, stillImportingTiles, TILE_DATASETS } from './stillImporting';

const SALES_TILES = ['revenue', 'sales', 'average_sale'];
const INVENTORY_TILES = ['low_stock', 'out_of_stock', 'inventory_value', 'inventory_margin'];

const item = (key: string, state: SyncState, entities?: string[]): IntegrationSync => ({
  key,
  label: key,
  state,
  datasets: [],
  progress: { done: 0, total: null },
  error: null,
  retry: null,
  path: '/',
  ...(entities ? { entities } : {})
});

const tiles = (items: IntegrationSync[]) => [...stillImportingTiles(items)].sort();

const job = (status: ImportJobStatus['status']): ImportJobStatus => ({
  source: 'quickbooks',
  status,
  pct_complete: 0,
  completed_entities: 1,
  total_entities: 4,
  error_message: '',
  started_at: '2026-11-11T11:55:00Z',
  completed_at: null
});

const run = (over: Partial<MigrationRunSummary>): MigrationRunSummary => ({
  id: 'r1',
  provider: 'shopify',
  kind: 'initial',
  status: 'extracting',
  progress: {},
  source_totals: {},
  blocker_count: 0,
  warning_count: 0,
  error: {},
  approved_at: null,
  started_at: '2026-11-11T11:55:00Z',
  finished_at: null,
  created_at: '2026-11-11T11:55:00Z',
  ...over
});

const connection = (initial: MigrationRunSummary | null, latest: MigrationRunSummary | null = initial): PosConnection =>
  ({
    id: 'c1',
    provider: 'shopify',
    provider_label: 'Shopify',
    status: 'active',
    mode: 'ongoing',
    external_account_id: 'shop',
    token_expires_at: null,
    files: {},
    locations: {},
    latest_run: latest,
    initial_run: initial,
    auto_commit: false,
    default_currency: 'USD',
    shop_domain: 'shop.myshopify.com',
    created_at: '2026-10-01T00:00:00Z',
    updated_at: '2026-10-01T00:00:00Z'
  }) as PosConnection;

describe('TILE_DATASETS', () => {
  it('ties revenue and sales tiles to orders, invoices and payments, and inventory tiles to products, variants and stock levels', () => {
    SALES_TILES.forEach((tile) => expect(TILE_DATASETS[tile as keyof typeof TILE_DATASETS]).toEqual(['orders', 'invoices', 'payments']));
    INVENTORY_TILES.forEach((tile) =>
      expect(TILE_DATASETS[tile as keyof typeof TILE_DATASETS]).toEqual(['products', 'variants', 'stock_levels'])
    );
  });
});

describe('stillImportingTiles', () => {
  it('tags nothing with no first import in flight', () => {
    expect(tiles([])).toEqual([]);
    expect(tiles([item('quickbooks', 'idle'), item('square', 'idle'), item('pos:c1', 'idle'), item('bank', 'idle')])).toEqual([]);
  });

  it('drops the tag once the import completes, and never shows one for a failed import', () => {
    expect(tiles([item('square', 'complete')])).toEqual([]);
    expect(tiles([item('square', 'failed')])).toEqual([]);
    expect(tiles([item('pos:c1', 'complete', ['order', 'product'])])).toEqual([]);
  });

  it('tags sales and inventory tiles while QuickBooks or Square first imports run', () => {
    const all = [...SALES_TILES, ...INVENTORY_TILES].sort();
    expect(tiles([item('quickbooks', 'importing')])).toEqual(all);
    expect(tiles([item('square', 'importing')])).toEqual(all);
  });

  it('tags only the tiles a POS run covers, while running and while waiting for review', () => {
    expect(tiles([item('pos:c1', 'importing', ['customer', 'order'])])).toEqual([...SALES_TILES].sort());
    expect(tiles([item('pos:c1', 'review', ['product', 'inventory_level'])])).toEqual([...INVENTORY_TILES].sort());
    expect(tiles([item('pos:c1', 'importing', ['customer', 'vendor', 'employee'])])).toEqual([]);
  });

  it('treats a POS run with no entities reported yet as covering sales and inventory', () => {
    expect(tiles([item('pos:c1', 'importing', [])])).toEqual([...SALES_TILES, ...INVENTORY_TILES].sort());
    expect(tiles([item('pos:c1', 'importing')])).toEqual([...SALES_TILES, ...INVENTORY_TILES].sort());
  });

  it('never tags anything for the bank first scan', () => {
    expect(tiles([item('bank', 'importing')])).toEqual([]);
  });

  it('combines several integrations', () => {
    expect(tiles([item('pos:c1', 'importing', ['order']), item('pos:c2', 'review', ['variant'])])).toEqual(
      [...SALES_TILES, ...INVENTORY_TILES].sort()
    );
  });

  describe('from the real first-import rules', () => {
    it('follows a POS initial run from running through review to done', () => {
      const progress = { order: { staged: 10 } };
      const running = globalSync({ posConnections: [connection(run({ status: 'extracting', progress }))] });
      expect(tiles(running)).toEqual([...SALES_TILES].sort());

      const review = globalSync({ posConnections: [connection(run({ status: 'awaiting_approval', progress }))] });
      expect(tiles(review)).toEqual([...SALES_TILES].sort());

      const done = globalSync({ posConnections: [connection(run({ status: 'completed', progress }))] });
      expect(tiles(done)).toEqual([]);
    });

    it('ignores a routine pull running after the first import finished', () => {
      const initial = run({ status: 'completed', progress: { order: { committed: 10 } } });
      const pull = run({ id: 'r2', kind: 'incremental', status: 'extracting', progress: { order: { staged: 3 } } });
      expect(tiles(globalSync({ posConnections: [connection(initial, pull)] }))).toEqual([]);
    });

    it('follows the QuickBooks import job', () => {
      expect(tiles(globalSync({ qbImportJob: job('running'), qbConnected: true })).length).toBeGreaterThan(0);
      expect(tiles(globalSync({ qbImportJob: job('completed'), qbConnected: true }))).toEqual([]);
      expect(tiles(globalSync({ qbImportJob: job('running'), qbConnected: false }))).toEqual([]);
    });
  });
});

describe('copy', () => {
  it('has no em dashes and no "Complete" tag', () => {
    [STILL_IMPORTING, STILL_IMPORTING_TOOLTIP].forEach((text) => {
      expect(text).not.toContain('—');
      expect(text).not.toMatch(/\bcomplete\b/i);
    });
  });
});
