// What the header's sync indicator shows. It is about one thing: an
// integration's FIRST import. Every integration keeps syncing in the
// background for as long as it is connected (scheduled and "Sync now" syncs,
// daily pulls, webhooks, polls); none of that may ever raise the chip.
//
// Pure functions, no React, so the rules test without a DOM (the repo has no
// jsdom). Each source comes out in the same shape, so the indicator renders
// one list without knowing which kind of integration a row is.

import type { FinancialSourceStatus } from 'api/banking';
import type { BankConnection } from 'api/bankConnections';
import type { MigrationRunSummary, PosConnection } from 'api/posIntegrations.api';
import { ENTITY_LABELS } from 'api/posIntegrations.api';
import type { ImportJobStatus } from 'api/square';

import { isMerchantImport, isRunActive } from './syncStatus';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * Where an integration's first import stands. `complete` and `idle` never
 * show: `complete` is the moment it finished (it earns one success message),
 * and `idle` is everything else, including all routine syncing afterwards.
 */
export type SyncState = 'importing' | 'failed' | 'complete' | 'idle';

export interface SyncDataset {
  label: string;
  done: boolean;
  count: number;
  /** Null when the server has not said how many there are. */
  total: number | null;
}

export type ImportJobSource = 'quickbooks' | 'square';

/** What the Retry button does for a failed first import. */
export type RetryAction =
  | { kind: 'import_job'; source: ImportJobSource }
  | { kind: 'pos_import'; connectionId: string }
  /** Nothing to retry from here: take them to the integration's page. */
  | { kind: 'open'; path: string };

export interface IntegrationSync {
  key: string;
  label: string;
  state: SyncState;
  /** Per-dataset progress, where the source reports it. */
  datasets: SyncDataset[];
  /** How far the import has got, for the chip's "Importing X of Y". Total null when unknown. */
  progress: { done: number; total: number | null };
  error: string | null;
  retry: RetryAction | null;
  /** The integration's own page. */
  path: string;
}

const NO_PROGRESS = { done: 0, total: null };

// ---------------------------------------------------------------------------
// QuickBooks and Square: the import job
// ---------------------------------------------------------------------------

const JOB_LABELS: Record<ImportJobSource, string> = { quickbooks: 'QuickBooks', square: 'Square' };
const JOB_PATHS: Record<ImportJobSource, string> = { quickbooks: '/integrations/quickbooks', square: '/integrations/square' };

/**
 * The import job's failure in the merchant's words. A queue that does not
 * exist is our problem, not theirs, so it reads as a start that did not
 * happen rather than an AWS error.
 */
export const importJobError = (message: string | null | undefined): string => {
  const text = message || '';
  const lower = text.toLowerCase();
  if (text.includes('SQS') || text.includes('SimpleQueueService') || lower.includes('queue does not exist')) {
    return 'Import could not be started. Please try again.';
  }
  return text || 'Import failed.';
};

/**
 * QuickBooks or Square from its import job (/company/:id/import-status/).
 * Only the job counts: per-entity sync statuses come from routine syncs as
 * well as the import, so they are never read here.
 */
export const importJobSync = (source: ImportJobSource, job: ImportJobStatus | null | undefined, connected: boolean): IntegrationSync => {
  const base = { key: source, label: JOB_LABELS[source], path: JOB_PATHS[source], datasets: [], error: null, retry: null };
  const status = connected ? job?.status : null;
  if (status === 'pending' || status === 'running') {
    const total = job!.total_entities > 0 ? job!.total_entities : null;
    return { ...base, state: 'importing', progress: { done: total == null ? 0 : Math.min(job!.completed_entities, total), total } };
  }
  if (status === 'failed') {
    return {
      ...base,
      state: 'failed',
      progress: NO_PROGRESS,
      error: importJobError(job!.error_message),
      retry: { kind: 'import_job', source }
    };
  }
  if (status === 'complete' || status === 'completed') return { ...base, state: 'complete', progress: NO_PROGRESS };
  return { ...base, state: 'idle', progress: NO_PROGRESS };
};

// ---------------------------------------------------------------------------
// POS connections: the initial run
// ---------------------------------------------------------------------------

// The order a merchant reads a run in, matching the progress screen.
const POS_ENTITY_ORDER = ['customer', 'product', 'variant', 'inventory_level', 'vendor', 'employee', 'order', 'expense'];

const orderedEntities = (progress: Record<string, unknown>): string[] => {
  const keys = Object.keys(progress);
  const known = POS_ENTITY_ORDER.filter((entity) => keys.includes(entity));
  return [...known, ...keys.filter((entity) => !POS_ENTITY_ORDER.includes(entity))];
};

/**
 * One dataset per entity in the run. Before the commit, the count is rows read
 * out of the source and nothing is done yet (nothing has been written). While
 * committing, the count is rows written, and an entity is done once every valid
 * row is in. Done never goes back to not done during a run.
 */
export const posDatasets = (run: MigrationRunSummary | null | undefined): SyncDataset[] => {
  if (!run?.progress) return [];
  const committing = run.status === 'committing';
  return orderedEntities(run.progress).map((entity) => {
    const progress = run.progress[entity] ?? {};
    const sourceCount = run.source_totals?.[entity]?.count;
    const sourceTotal = typeof sourceCount === 'number' ? sourceCount : null;
    const label = ENTITY_LABELS[entity] ?? entity.replace(/_/g, ' ');
    if (committing) {
      const total = progress.valid ?? sourceTotal;
      const count = progress.committed ?? 0;
      return { label, done: total != null && count >= total, count, total };
    }
    return { label, done: false, count: progress.staged ?? progress.extracted ?? 0, total: sourceTotal };
  });
};

/**
 * One POS connection, from its latest run. Only an initial run counts: "Pull
 * now", the daily pull, webhook and poll runs never do, and neither does a
 * failed pull or a connection that needs signing in again.
 */
export const posSync = (connection: PosConnection): IntegrationSync => {
  const run = connection.latest_run;
  const path = `/integrations/pos/connections/${connection.id}`;
  const base = { key: `pos:${connection.id}`, label: connection.provider_label, path, datasets: [], error: null, retry: null };
  if (connection.status === 'disconnected' || !run || !isMerchantImport(run)) return { ...base, state: 'idle', progress: NO_PROGRESS };

  if (isRunActive(run.status)) {
    const datasets = posDatasets(run);
    return {
      ...base,
      state: 'importing',
      datasets,
      progress: { done: datasets.filter((d) => d.done).length, total: datasets.length || null }
    };
  }
  if (run.status === 'failed') {
    return {
      ...base,
      state: 'failed',
      progress: NO_PROGRESS,
      error: run.error?.message || 'The import stopped before it finished.',
      retry: { kind: 'pos_import', connectionId: connection.id }
    };
  }
  // Awaiting approval and cancelled are neither running nor done.
  return { ...base, state: run.status === 'completed' ? 'complete' : 'idle', progress: NO_PROGRESS };
};

// ---------------------------------------------------------------------------
// Bank: the first scan
// ---------------------------------------------------------------------------

/** How long a first bank scan may run before the header calls it failed. */
export const BANK_FIRST_SCAN_MS = 30 * 60 * 1000;

export const BANK_FIRST_SCAN_FAILED = 'The first bank scan has not finished. Open Bank to retry.';

/**
 * When the bank connection was made: the earliest linked Stripe account that
 * is still linked. /banking/source/ does not say, and Plaid connections have
 * no list to ask, so this is null for them.
 */
export const bankConnectedAt = (accounts: BankConnection[] | null | undefined): string | null =>
  (accounts ?? [])
    .filter((account) => account.status !== 'disconnected' && !Number.isNaN(new Date(account.created_at).getTime()))
    .map((account) => account.created_at)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

/**
 * The bank's first scan. Both providers stamp `last_synced_at` when a scan
 * lands, so an unstamped connection is still on its first. Under 30 minutes
 * old it is importing; past that, or with an error before any scan landed, the
 * first import failed. With no connection time to go by it never shows.
 */
export const bankSync = (
  source: FinancialSourceStatus | null | undefined,
  connectedAt: string | null,
  now: Date = new Date()
): IntegrationSync | null => {
  const connection = source?.connection;
  if (!connection) return null;
  const base = { key: 'bank', label: 'Bank', path: '/integrations/bank', datasets: [], progress: NO_PROGRESS, error: null, retry: null };
  if (connection.last_synced_at) return { ...base, state: 'complete' };
  const connectedMs = connectedAt ? new Date(connectedAt).getTime() : NaN;
  if (Number.isNaN(connectedMs)) return { ...base, state: 'idle' };
  if (connection.error_code || now.getTime() - connectedMs >= BANK_FIRST_SCAN_MS) {
    return { ...base, state: 'failed', error: BANK_FIRST_SCAN_FAILED, retry: { kind: 'open', path: '/integrations/bank' } };
  }
  return { ...base, state: 'importing' };
};

// ---------------------------------------------------------------------------
// All of them
// ---------------------------------------------------------------------------

export interface GlobalSyncSources {
  qbImportJob?: ImportJobStatus | null;
  qbConnected?: boolean;
  squareImportJob?: ImportJobStatus | null;
  squareConnected?: boolean;
  posConnections?: PosConnection[] | null;
  bankSource?: FinancialSourceStatus | null;
  bankConnectedAt?: string | null;
  now?: Date;
}

/** Every integration's first-import state, shown or not: QuickBooks, Square, POS, then the bank. */
export const globalSync = ({
  qbImportJob,
  qbConnected = false,
  squareImportJob,
  squareConnected = false,
  posConnections,
  bankSource,
  bankConnectedAt: connectedAt = null,
  now = new Date()
}: GlobalSyncSources): IntegrationSync[] =>
  [
    importJobSync('quickbooks', qbImportJob, qbConnected),
    importJobSync('square', squareImportJob, squareConnected),
    ...(posConnections ?? []).map(posSync),
    bankSync(bankSource, connectedAt, now)
  ].filter((item): item is IntegrationSync => item !== null);

/** What the chip and popover list: first imports running or failed. A finished one is gone for good. */
export const visibleIntegrations = (items: IntegrationSync[]): IntegrationSync[] =>
  items.filter((item) => item.state === 'importing' || item.state === 'failed');

export const isAnyImporting = (items: IntegrationSync[]): boolean => items.some((item) => item.state === 'importing');

export type ChipView = { kind: 'importing' | 'failed'; label: string } | null;

/**
 * The header chip. Importing wins over a failure, since it is what is
 * happening now; a failure stays listed until it is retried. Null (no chip at
 * all) when no first import is running or failed.
 */
export const chipView = (items: IntegrationSync[]): ChipView => {
  const importing = items.filter((item) => item.state === 'importing');
  if (importing.length) {
    const counted = importing.filter((item) => item.progress.total != null);
    const total = counted.reduce((sum, item) => sum + (item.progress.total ?? 0), 0);
    const done = counted.reduce((sum, item) => sum + item.progress.done, 0);
    return { kind: 'importing', label: total > 0 ? `Importing ${done} of ${total}` : 'Importing' };
  }
  const failed = items.filter((item) => item.state === 'failed').length;
  if (failed) return { kind: 'failed', label: `${failed} ${failed === 1 ? 'sync' : 'syncs'} failed` };
  return null;
};

/** "1,240" for a done dataset, "120 of 400" or "120 so far" while it runs. */
export const datasetText = (dataset: SyncDataset): string => {
  const count = dataset.count.toLocaleString('en-US');
  if (dataset.done) return count;
  if (dataset.total != null) return `${count} of ${dataset.total.toLocaleString('en-US')}`;
  return dataset.count > 0 ? `${count} so far` : 'Waiting';
};

/** Share of the dataset done, 0 to 100, or null when the total is unknown. */
export const datasetPercent = (dataset: SyncDataset): number | null => {
  if (dataset.total == null) return null;
  if (dataset.total === 0) return 100;
  return Math.min(100, Math.round((dataset.count / dataset.total) * 100));
};

/**
 * The rows the popover shows for an importing integration: its datasets, or
 * one row from the overall progress when the source only reports that.
 */
export const progressRows = (item: IntegrationSync): SyncDataset[] => {
  if (item.datasets.length) return item.datasets;
  if (item.progress.total == null) return [];
  return [{ label: 'Imported', done: false, count: item.progress.done, total: item.progress.total }];
};

export const retryLabel = (retry: RetryAction): string => (retry.kind === 'open' ? 'Open' : 'Retry');

/**
 * The first imports that finished since the last reading: importing then,
 * complete now. Each gets one success message. One that failed, was
 * cancelled, stopped for approval or went away gets none.
 */
export const finishedImports = (previous: Record<string, SyncState>, items: IntegrationSync[]): IntegrationSync[] =>
  items.filter((item) => previous[item.key] === 'importing' && item.state === 'complete');

export const finishedMessage = (item: IntegrationSync): string => `${item.label} import finished.`;

export const stateByKey = (items: IntegrationSync[]): Record<string, SyncState> =>
  Object.fromEntries(items.map((item) => [item.key, item.state]));
