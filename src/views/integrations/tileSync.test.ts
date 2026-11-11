import { describe, expect, it } from 'vitest';

import type { FinancialSourceStatus } from 'api/banking';
import type { MigrationRunSummary, PosConnection } from 'api/posIntegrations.api';
import type { ImportJobStatus } from 'api/square';
import { bankSync, chipView, importJobSync, posSync } from 'views/pos-integrations/globalSync';
import {
  bankLastSynced,
  importBanner,
  newest,
  posLastSynced,
  quickbooksLastSynced,
  squareLastSynced,
  STILL_IMPORTING,
  tileSync
} from './tileSync';

const NOW = new Date('2026-11-11T12:00:00Z');
const minutesAgo = (minutes: number) => new Date(NOW.getTime() - minutes * 60 * 1000).toISOString();

const job = (over: Partial<ImportJobStatus> = {}): ImportJobStatus => ({
  source: 'quickbooks',
  status: 'running',
  pct_complete: 0,
  completed_entities: 3,
  total_entities: 10,
  error_message: '',
  started_at: minutesAgo(30),
  completed_at: null,
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

const connection = (over: Partial<PosConnection> = {}): PosConnection =>
  ({
    id: 'c1',
    provider: 'shopify',
    provider_label: 'Shopify',
    status: 'active',
    latest_run: null,
    ...over
  }) as PosConnection;

const bank = (over: Partial<NonNullable<FinancialSourceStatus['connection']>> = {}): FinancialSourceStatus => ({
  source: 'bank',
  choice_saved: true,
  bank_available: true,
  provider: 'plaid',
  quickbooks_connected: false,
  connection: { id: 'b1', last_synced_at: null, institution_updated_at: null, history_complete: false, error_code: '', ...over }
});

describe('tileSync: the scope rule', () => {
  const STILL = { label: 'Still importing', color: 'primary' };
  const REVIEW = { label: 'Review needed', color: 'warning' };
  const FAILED = { label: 'Import failed', color: 'error' };

  it('tags a running first import Still importing, with no Last synced line', () => {
    expect(tileSync(importJobSync('quickbooks', job(), true), minutesAgo(5), true, NOW)).toEqual({
      tag: STILL,
      reason: null,
      lastSynced: null
    });
    expect(tileSync(bankSync(bank({ history_complete: false }), null, NOW)!, minutesAgo(2), true, NOW).tag).toEqual(STILL);
    expect(STILL.label).toBe(STILL_IMPORTING);
  });

  it('tags an import waiting for approval Review needed, in the header’s warning colour', () => {
    const item = posSync(connection({ initial_run: run({ status: 'awaiting_approval' }) }));
    expect(tileSync(item, null, true, NOW)).toEqual({ tag: REVIEW, reason: null, lastSynced: null });
    expect(chipView([item])).toEqual({ kind: 'review', label: REVIEW.label });
  });

  it('tags a failed first import Import failed, with the same reason as the header popover', () => {
    const qb = importJobSync('quickbooks', job({ status: 'failed', error_message: 'Token revoked.' }), true);
    expect(tileSync(qb, minutesAgo(5), true, NOW)).toEqual({ tag: FAILED, reason: 'Token revoked.', lastSynced: null });
    expect(tileSync(qb, null, true, NOW).reason).toBe(qb.error);

    const pos = posSync(connection({ initial_run: run({ status: 'failed', error: { message: 'Shopify refused the token.' } }) }));
    expect(tileSync(pos, null, true, NOW)).toEqual({ tag: FAILED, reason: 'Shopify refused the token.', lastSynced: null });

    const bankItem = bankSync(bank({ history_complete: false, error_code: 'ITEM_LOGIN_REQUIRED' }), null, NOW)!;
    expect(tileSync(bankItem, null, true, NOW).reason).toBe('The first bank scan has not finished. Open Bank to retry.');
  });

  it('never tags a routine sync: it shows a plain Last synced line instead', () => {
    // QuickBooks: the import job finished long ago; a scheduled sync just ran.
    expect(tileSync(importJobSync('quickbooks', job({ status: 'completed' }), true), minutesAgo(5), true, NOW)).toEqual({
      tag: null,
      reason: null,
      lastSynced: 'Last synced 5 minutes ago'
    });
    // POS: a webhook run is committing right now, after a finished first import.
    const webhookBusy = connection({
      initial_run: run({ status: 'completed' }),
      latest_run: run({ id: 'w1', kind: 'webhook', status: 'committing' })
    });
    expect(tileSync(posSync(webhookBusy), minutesAgo(60), true, NOW)).toEqual({
      tag: null,
      reason: null,
      lastSynced: 'Last synced about 1 hour ago'
    });
    // Bank: the history is in, so the first import is done.
    expect(
      tileSync(bankSync(bank({ history_complete: true, last_synced_at: minutesAgo(2) }), null, NOW)!, minutesAgo(2), true, NOW)
    ).toEqual({
      tag: null,
      reason: null,
      lastSynced: 'Last synced 2 minutes ago'
    });
  });

  it('never tags a routine sync failure', () => {
    const failedPull = connection({
      initial_run: run({ status: 'completed' }),
      sync: {
        last_pull: { at: minutesAgo(60), trigger: 'schedule', status: 'failed', error: 'Timed out.' },
        last_successful_pull_at: null,
        pull_requested_at: null,
        disconnect: null,
        backfill_years_done: [],
        own_app: false
      }
    });
    expect(tileSync(posSync(failedPull), minutesAgo(60), true, NOW).tag).toBeNull();
  });

  it('shows no line with no time to go by, or when not connected', () => {
    expect(tileSync(undefined, null, true, NOW).lastSynced).toBeNull();
    expect(tileSync(undefined, 'not a date', true, NOW).lastSynced).toBeNull();
    expect(tileSync(undefined, minutesAgo(5), false, NOW).lastSynced).toBeNull();
  });
});

describe('importBanner', () => {
  it('shows nothing when no first import runs or waits, whatever syncs routinely', () => {
    const items = [
      importJobSync('quickbooks', job({ status: 'completed' }), true),
      posSync(connection({ initial_run: run({ status: 'completed' }), latest_run: run({ kind: 'webhook', status: 'extracting' }) })),
      importJobSync('square', job({ status: 'failed' }), true)
    ];
    expect(importBanner(items)).toBeNull();
  });

  it('names every integration still importing', () => {
    expect(importBanner([importJobSync('quickbooks', job(), true)])?.importing).toBe(
      `${STILL_IMPORTING} from QuickBooks. Figures across Allyvia may be incomplete until it finishes.`
    );
    const three = [
      importJobSync('quickbooks', job(), true),
      importJobSync('square', job(), true),
      posSync(connection({ initial_run: run({ status: 'committing' }) }))
    ];
    expect(importBanner(three)?.importing).toContain('from QuickBooks, Square and Shopify.');
  });

  it('asks for review with a link to the report, and says nothing is written yet', () => {
    const banner = importBanner([posSync(connection({ initial_run: run({ id: 'r9', status: 'awaiting_approval' }) }))]);
    expect(banner).toEqual({
      importing: null,
      reviews: [
        {
          key: 'pos:c1',
          text: 'Your Shopify import is ready to review. Nothing has been written yet.',
          path: '/integrations/pos/runs/r9/report'
        }
      ]
    });
  });
});

describe('last synced times', () => {
  it('picks the newest readable time', () => {
    expect(newest(minutesAgo(10), null, 'nope', minutesAgo(2), undefined)).toBe(minutesAgo(2));
    expect(newest()).toBeNull();
  });

  it('QuickBooks: the newest entity sync or the import job', () => {
    const statuses = {
      invoice: { status: 'completed' as const, completed_at: minutesAgo(30) },
      customer: { status: 'completed' as const, last_synced: minutesAgo(8) }
    };
    expect(quickbooksLastSynced(statuses, job({ status: 'completed', completed_at: minutesAgo(600) }))).toBe(minutesAgo(8));
    expect(quickbooksLastSynced({}, job({ status: 'completed', completed_at: minutesAgo(600) }))).toBe(minutesAgo(600));
    expect(quickbooksLastSynced(undefined, null)).toBeNull();
  });

  it('Square: the import job’s finish', () => {
    expect(squareLastSynced(job({ status: 'completed', completed_at: minutesAgo(40) }))).toBe(minutesAgo(40));
    expect(squareLastSynced(null)).toBeNull();
  });

  it('POS: the last successful pull, or a newer finished run', () => {
    const sync = { last_successful_pull_at: minutesAgo(120) } as PosConnection['sync'];
    expect(posLastSynced(connection({ sync, latest_run: run({ kind: 'webhook', status: 'completed', finished_at: minutesAgo(3) }) }))).toBe(
      minutesAgo(3)
    );
    expect(posLastSynced(connection({ sync, latest_run: run({ kind: 'webhook', status: 'committing', finished_at: null }) }))).toBe(
      minutesAgo(120)
    );
    expect(posLastSynced(undefined)).toBeNull();
  });

  it('Bank: the last scan', () => {
    expect(bankLastSynced(bank({ last_synced_at: minutesAgo(15) }))).toBe(minutesAgo(15));
    expect(bankLastSynced(bank())).toBeNull();
    expect(bankLastSynced(null)).toBeNull();
  });
});
