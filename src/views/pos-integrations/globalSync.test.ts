import { describe, expect, it } from 'vitest';

import type { FinancialSourceStatus } from 'api/banking';
import type { BankConnection } from 'api/bankConnections';
import type { ConnectionSync, MigrationRunSummary, PosConnection } from 'api/posIntegrations.api';
import type { ImportJobStatus } from 'api/square';
import {
  BANK_FIRST_SCAN_FAILED,
  bankConnectedAt,
  bankSync,
  chipView,
  datasetPercent,
  datasetText,
  finishedImports,
  finishedMessage,
  globalSync,
  importJobError,
  importJobSync,
  isAnyImporting,
  posDatasets,
  posSync,
  progressRows,
  retryLabel,
  stateByKey,
  visibleIntegrations
} from './globalSync';
import type { IntegrationSync } from './globalSync';

const NOW = new Date('2026-11-11T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();

const job = (over: Partial<ImportJobStatus> = {}): ImportJobStatus => ({
  source: 'quickbooks',
  status: 'running',
  pct_complete: 0,
  completed_entities: 3,
  total_entities: 10,
  error_message: '',
  started_at: minutesAgo(2),
  completed_at: null,
  ...over
});

const sync = (over: Partial<ConnectionSync> = {}): ConnectionSync => ({
  last_pull: null,
  last_successful_pull_at: null,
  pull_requested_at: null,
  disconnect: null,
  backfill_years_done: [],
  own_app: false,
  ...over
});

const run = (over: Partial<MigrationRunSummary> = {}): MigrationRunSummary => ({
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
  started_at: minutesAgo(5),
  finished_at: null,
  created_at: minutesAgo(5),
  ...over
});

const connection = (over: Partial<PosConnection> = {}, syncOver: Partial<ConnectionSync> = {}): PosConnection => ({
  id: 'c1',
  provider: 'shopify',
  provider_label: 'Shopify',
  status: 'active',
  mode: 'ongoing',
  external_account_id: 'shop',
  token_expires_at: null,
  files: {},
  locations: {},
  latest_run: null,
  auto_commit: false,
  default_currency: 'USD',
  shop_domain: 'shop.myshopify.com',
  created_at: '2026-10-01T00:00:00Z',
  updated_at: '2026-10-01T00:00:00Z',
  sync: sync(syncOver),
  ...over
});

const bank = (over: Partial<NonNullable<FinancialSourceStatus['connection']>> | null = {}): FinancialSourceStatus => ({
  source: 'bank',
  choice_saved: true,
  bank_available: true,
  provider: 'stripe',
  quickbooks_connected: false,
  connection:
    over === null
      ? null
      : { id: 'b1', last_synced_at: null, institution_updated_at: null, history_complete: false, error_code: '', ...over }
});

const account = (over: Partial<BankConnection> = {}): BankConnection => ({
  id: 1,
  institution_name: 'Bank',
  display_name: 'Checking',
  last4: '1234',
  category: 'cash',
  subcategory: 'checking',
  status: 'active',
  subscribed: true,
  balance_currency: 'usd',
  balance_current: null,
  balance_available: null,
  balance_as_of: null,
  last_refreshed_at: null,
  created_at: minutesAgo(10),
  ...over
});

const shown = (items: IntegrationSync[]) => visibleIntegrations(items).map((item) => item.key);

describe('importJobSync (QuickBooks and Square)', () => {
  it('is importing while the job is pending or running, counted from the job', () => {
    const item = importJobSync('quickbooks', job(), true);
    expect(item.state).toBe('importing');
    expect(item.progress).toEqual({ done: 3, total: 10 });
    expect(chipView([item])).toEqual({ kind: 'importing', label: 'Importing 3 of 10' });
    expect(importJobSync('square', job({ status: 'pending', completed_entities: 0 }), true).state).toBe('importing');
  });

  it('takes the total from the job, not a constant', () => {
    expect(chipView([importJobSync('quickbooks', job({ completed_entities: 5, total_entities: 12 }), true)])?.label).toBe(
      'Importing 5 of 12'
    );
  });

  it('says Importing alone while the job has not counted its entities', () => {
    const item = importJobSync('quickbooks', job({ status: 'pending', total_entities: 0, completed_entities: 0 }), true);
    expect(item.progress.total).toBeNull();
    expect(chipView([item])?.label).toBe('Importing');
  });

  it('shows nothing once the job is complete: a routine QuickBooks sync in progress does not count', () => {
    // A "Sync now" or scheduled sync runs per-entity syncs; the import job stays complete.
    for (const status of ['complete', 'completed'] as const) {
      const item = importJobSync('quickbooks', job({ status, completed_entities: 10 }), true);
      expect(item.state).toBe('complete');
      expect(chipView([item])).toBeNull();
      expect(shown([item])).toEqual([]);
    }
  });

  it('shows nothing with no import job, or when not connected', () => {
    expect(importJobSync('quickbooks', job({ status: null }), true).state).toBe('idle');
    expect(importJobSync('quickbooks', null, true).state).toBe('idle');
    expect(importJobSync('quickbooks', job(), false).state).toBe('idle');
  });

  it('fails a failed import job with its error and offers to run it again', () => {
    const item = importJobSync('square', job({ source: 'square', status: 'failed', error_message: 'Token revoked.' }), true);
    expect(item.state).toBe('failed');
    expect(item.label).toBe('Square');
    expect(item.error).toBe('Token revoked.');
    expect(item.retry).toEqual({ kind: 'import_job', source: 'square' });
    expect(retryLabel(item.retry!)).toBe('Retry');
  });

  it('turns a missing queue into words a merchant can act on', () => {
    expect(importJobError('An error occurred (AWS.SimpleQueueService.NonExistentQueue)')).toBe(
      'Import could not be started. Please try again.'
    );
    expect(importJobError('')).toBe('Import failed.');
  });
});

describe('posSync', () => {
  it('is importing while the initial run is active, counted by dataset', () => {
    const item = posSync(
      connection({
        latest_run: run({ status: 'committing', progress: { customer: { valid: 2, committed: 2 }, order: { valid: 9, committed: 1 } } })
      })
    );
    expect(item.state).toBe('importing');
    expect(item.key).toBe('pos:c1');
    expect(item.progress).toEqual({ done: 1, total: 2 });
  });

  it('shows nothing for an incremental, webhook or poll run', () => {
    for (const kind of ['incremental', 'webhook'] as const) {
      const item = posSync(connection({ latest_run: run({ kind, status: 'extracting' }) }));
      expect(item.state).toBe('idle');
      expect(shown([item])).toEqual([]);
    }
  });

  it('shows nothing for Pull now, the daily pull or a disconnect’s final pull', () => {
    expect(posSync(connection({}, { pull_requested_at: minutesAgo(1) })).state).toBe('idle');
    expect(posSync(connection({}, { disconnect: { state: 'pulling' } })).state).toBe('idle');
  });

  it('shows nothing for a failed routine pull or a connection that needs signing in again', () => {
    const failedPull = { last_pull: { at: minutesAgo(60), trigger: 'schedule' as const, status: 'failed' as const, error: 'Timed out.' } };
    expect(posSync(connection({}, failedPull)).state).toBe('idle');
    expect(posSync(connection({ status: 'needs_reauth' })).state).toBe('idle');
    expect(posSync(connection({}, { disconnect: { state: 'final_pull_failed' } })).state).toBe('idle');
  });

  it('fails a failed initial run with the backend reason and offers to run it again', () => {
    const item = posSync(connection({ latest_run: run({ status: 'failed', error: { message: 'Shopify refused the token.' } }) }));
    expect(item.state).toBe('failed');
    expect(item.error).toBe('Shopify refused the token.');
    expect(item.retry).toEqual({ kind: 'pos_import', connectionId: 'c1' });
  });

  it('is complete once the initial run completes, and neither for approval nor cancel', () => {
    expect(posSync(connection({ latest_run: run({ status: 'completed' }) })).state).toBe('complete');
    expect(posSync(connection({ latest_run: run({ status: 'awaiting_approval' }) })).state).toBe('idle');
    expect(posSync(connection({ latest_run: run({ status: 'cancelled' }) })).state).toBe('idle');
  });

  it('shows nothing for a disconnected connection or one with no runs', () => {
    expect(posSync(connection({ status: 'disconnected', latest_run: run() })).state).toBe('idle');
    expect(posSync(connection()).state).toBe('idle');
  });
});

describe('posDatasets', () => {
  it('counts rows read against the source total before the commit, with nothing done', () => {
    expect(
      posDatasets(
        run({
          status: 'extracting',
          progress: { order: { staged: 50 }, customer: { extracted: 10 } },
          source_totals: { order: { count: 200 } }
        })
      )
    ).toEqual([
      { label: 'Customers', done: false, count: 10, total: null },
      { label: 'Orders', done: false, count: 50, total: 200 }
    ]);
  });

  it('counts rows written against valid rows while committing', () => {
    expect(
      posDatasets(
        run({
          status: 'committing',
          progress: { customer: { valid: 10, committed: 10 }, order: { valid: 190, committed: 40 } },
          source_totals: { order: { count: 200 } }
        })
      )
    ).toEqual([
      { label: 'Customers', done: true, count: 10, total: 10 },
      { label: 'Orders', done: false, count: 40, total: 190 }
    ]);
  });
});

describe('bankConnectedAt', () => {
  it('is the earliest still-linked account, or null with none to go by', () => {
    expect(
      bankConnectedAt([
        account({ created_at: minutesAgo(5) }),
        account({ id: 2, created_at: minutesAgo(40), status: 'disconnected' }),
        account({ id: 3, created_at: minutesAgo(12) })
      ])
    ).toBe(minutesAgo(12));
    expect(bankConnectedAt([])).toBeNull();
    expect(bankConnectedAt(undefined)).toBeNull();
  });
});

describe('bankSync', () => {
  it('is importing while the first scan has not landed and the connection is under 30 minutes old', () => {
    const item = bankSync(bank(), minutesAgo(29), NOW)!;
    expect(item.state).toBe('importing');
    expect(chipView([item])).toEqual({ kind: 'importing', label: 'Importing' });
  });

  it('fails at 30 minutes with the copy that sends them to Bank', () => {
    for (const age of [30, 90]) {
      const item = bankSync(bank(), minutesAgo(age), NOW)!;
      expect(item.state).toBe('failed');
      expect(item.error).toBe(BANK_FIRST_SCAN_FAILED);
      expect(item.error).toBe('The first bank scan has not finished. Open Bank to retry.');
      expect(item.retry).toEqual({ kind: 'open', path: '/integrations/bank' });
      expect(retryLabel(item.retry!)).toBe('Open');
    }
  });

  it('fails early when the connection reports an error before any scan landed', () => {
    expect(bankSync(bank({ error_code: 'ITEM_LOGIN_REQUIRED' }), minutesAgo(2), NOW)!.state).toBe('failed');
  });

  it('is complete once a scan has landed, and a later error never shows', () => {
    expect(bankSync(bank({ last_synced_at: minutesAgo(1) }), minutesAgo(10), NOW)!.state).toBe('complete');
    expect(bankSync(bank({ last_synced_at: minutesAgo(600), error_code: 'X' }), minutesAgo(900), NOW)!.state).toBe('complete');
  });

  it('shows nothing when there is no connection time to go by, or no connection', () => {
    expect(bankSync(bank(), null, NOW)!.state).toBe('idle');
    expect(bankSync(bank(null), minutesAgo(1), NOW)).toBeNull();
  });
});

describe('globalSync and the chip', () => {
  it('lists only first imports running or failed, QuickBooks first', () => {
    const items = globalSync({
      qbImportJob: job(),
      qbConnected: true,
      squareImportJob: job({ source: 'square', status: 'completed' }),
      squareConnected: true,
      posConnections: [
        connection({ latest_run: run({ status: 'failed' }) }),
        connection({ id: 'c2', latest_run: run({ kind: 'incremental', status: 'extracting' }) })
      ],
      bankSource: bank(),
      bankConnectedAt: minutesAgo(5),
      now: NOW
    });
    expect(shown(items)).toEqual(['quickbooks', 'pos:c1', 'bank']);
    expect(isAnyImporting(items)).toBe(true);
  });

  it('counts progress across every importing integration', () => {
    const items = globalSync({
      qbImportJob: job({ completed_entities: 3, total_entities: 10 }),
      qbConnected: true,
      posConnections: [connection({ latest_run: run({ status: 'committing', progress: { customer: { valid: 2, committed: 2 } } }) })],
      bankSource: bank(),
      bankConnectedAt: minutesAgo(5),
      now: NOW
    });
    expect(chipView(items)).toEqual({ kind: 'importing', label: 'Importing 4 of 11' });
  });

  it('counts failed first imports when nothing is importing', () => {
    const items = globalSync({
      qbImportJob: job({ status: 'failed' }),
      qbConnected: true,
      bankSource: bank(),
      bankConnectedAt: minutesAgo(45),
      now: NOW
    });
    expect(chipView(items)).toEqual({ kind: 'failed', label: '2 syncs failed' });
    expect(chipView(items.slice(0, 1))).toEqual({ kind: 'failed', label: '1 sync failed' });
    expect(isAnyImporting(items)).toBe(false);
  });

  it('shows no chip when every first import is done, whatever syncs routinely afterwards', () => {
    const items = globalSync({
      qbImportJob: job({ status: 'completed' }),
      qbConnected: true,
      posConnections: [connection({ latest_run: run({ kind: 'webhook', status: 'committing' }) }, { pull_requested_at: minutesAgo(1) })],
      bankSource: bank({ last_synced_at: minutesAgo(1) }),
      bankConnectedAt: minutesAgo(600),
      now: NOW
    });
    expect(shown(items)).toEqual([]);
    expect(chipView(visibleIntegrations(items))).toBeNull();
    expect(isAnyImporting(items)).toBe(false);
  });
});

describe('popover rows', () => {
  it('shows the count when done, A of B with a total, and so far without one', () => {
    expect(datasetText({ label: 'Orders', done: true, count: 1240, total: 1240 })).toBe('1,240');
    expect(datasetText({ label: 'Orders', done: false, count: 120, total: 4000 })).toBe('120 of 4,000');
    expect(datasetText({ label: 'Orders', done: false, count: 120, total: null })).toBe('120 so far');
    expect(datasetText({ label: 'Orders', done: false, count: 0, total: null })).toBe('Waiting');
  });

  it('gives a percentage only when the total is known', () => {
    expect(datasetPercent({ label: 'Orders', done: false, count: 50, total: 200 })).toBe(25);
    expect(datasetPercent({ label: 'Orders', done: false, count: 0, total: 0 })).toBe(100);
    expect(datasetPercent({ label: 'Orders', done: false, count: 50, total: null })).toBeNull();
  });

  it('falls back to one row from the job when a source has no datasets', () => {
    expect(progressRows(importJobSync('quickbooks', job(), true))).toEqual([{ label: 'Imported', done: false, count: 3, total: 10 }]);
    expect(progressRows(bankSync(bank(), minutesAgo(1), NOW)!)).toEqual([]);
  });
});

describe('finishedImports', () => {
  const qb = (status: ImportJobStatus['status']) => importJobSync('quickbooks', job({ status }), true);

  it('finds only first imports that went from importing to complete', () => {
    const previous = { quickbooks: 'importing', 'pos:c1': 'importing', 'pos:c2': 'importing', bank: 'importing' } as const;
    const now = [
      qb('completed'),
      posSync(connection({ latest_run: run({ status: 'awaiting_approval' }) })),
      posSync(connection({ id: 'c2', latest_run: run({ status: 'failed' }) })),
      bankSync(bank({ last_synced_at: minutesAgo(0) }), minutesAgo(3), NOW)!
    ];
    expect(finishedImports(previous, now).map((item) => item.key)).toEqual(['quickbooks', 'bank']);
  });

  it('says nothing on the first load, even for an import that is already complete', () => {
    expect(finishedImports({}, [qb('completed')])).toEqual([]);
  });

  it('says it once: after recording the new state, the same items finish nothing', () => {
    const now = [qb('completed')];
    expect(finishedImports(stateByKey(now), now)).toEqual([]);
  });

  it('names the integration in the message, with no em dash', () => {
    const message = finishedMessage(qb('completed'));
    expect(message).toBe('QuickBooks import finished.');
    expect(message).not.toMatch(/—/);
  });
});
