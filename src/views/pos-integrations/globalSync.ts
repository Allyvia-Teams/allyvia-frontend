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
 * Where an integration's first import stands. `review` is a POS import that
 * has read everything and is waiting for the merchant to approve it; nothing
 * is written yet, so it is not complete. `complete` and `idle` never show:
 * `complete` is the moment it finished (it earns one success message), and
 * `idle` is everything else, including all routine syncing afterwards.
 */
export type SyncState = 'importing' | 'review' | 'failed' | 'complete' | 'idle';

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
  /** When the server says this import started, for the poll backoff; absent when it does not say. */
  startedAt?: string | null;
  /**
   * The POS entity keys ("order", "product", ...) a POS first import covers,
   * while it runs or waits for review; empty until the run reports progress.
   * Absent for every other source. Read by the dashboard's "Still importing" tags.
   */
  entities?: string[];
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
    return {
      ...base,
      state: 'importing',
      progress: { done: total == null ? 0 : Math.min(job!.completed_entities, total), total },
      startedAt: job!.started_at
    };
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

/** Where the merchant approves an import that is waiting for them. */
export const posReportPath = (runId: string): string => `/integrations/pos/runs/${runId}/report`;

/**
 * The run that stands for the connection's import: `initial_run`, the most
 * recent run of kind "initial" (a retried import replaces a failed one), so a
 * webhook or poll run landing mid-import cannot hide it; `latest_run` from an
 * older server that does not send it.
 */
export const posInitialRun = (connection: PosConnection): MigrationRunSummary | null =>
  connection.initial_run !== undefined ? connection.initial_run : connection.latest_run;

/**
 * One POS connection, from its initial run. Only an initial run counts: "Pull
 * now", the daily pull, webhook and poll runs never do, and neither does a
 * failed pull or a connection that needs signing in again.
 */
export const posSync = (connection: PosConnection): IntegrationSync => {
  const run = posInitialRun(connection);
  const path = `/integrations/pos/connections/${connection.id}`;
  const base = { key: `pos:${connection.id}`, label: connection.provider_label, path, datasets: [], error: null, retry: null };
  if (connection.status === 'disconnected' || !run || !isMerchantImport(run)) return { ...base, state: 'idle', progress: NO_PROGRESS };

  if (isRunActive(run.status)) {
    const datasets = posDatasets(run);
    return {
      ...base,
      state: 'importing',
      datasets,
      entities: orderedEntities(run.progress ?? {}),
      progress: { done: datasets.filter((d) => d.done).length, total: datasets.length || null },
      startedAt: run.started_at ?? run.created_at
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
  if (run.status === 'awaiting_approval') {
    return {
      ...base,
      state: 'review',
      progress: NO_PROGRESS,
      entities: orderedEntities(run.progress ?? {}),
      retry: { kind: 'open', path: posReportPath(run.id) }
    };
  }
  // Cancelled is neither running nor done.
  return { ...base, state: run.status === 'completed' ? 'complete' : 'idle', progress: NO_PROGRESS };
};

// ---------------------------------------------------------------------------
// Bank: the first scan
// ---------------------------------------------------------------------------

/** How long a first bank scan may run before the header calls it failed, when the server sends no `history_complete`. */
export const BANK_FIRST_SCAN_MS = 30 * 60 * 1000;

/**
 * How long the header shows a bank whose history is still importing
 * (`history_complete` false, no error), counted from `created_at`. After that
 * it is idle in the header; with an error it is failed whatever its age.
 */
export const BANK_HISTORY_HEADER_MS = 24 * 60 * 60 * 1000;

export const BANK_FIRST_SCAN_FAILED = 'The first bank scan has not finished. Open Bank to retry.';

/**
 * When the bank connection was made, from the Stripe accounts list: the
 * earliest linked account that is still linked. The fallback for a server
 * whose /banking/source/ does not send `created_at` (see bankFirstScanStart).
 */
export const bankConnectedAt = (accounts: BankConnection[] | null | undefined): string | null =>
  (accounts ?? [])
    .filter((account) => account.status !== 'disconnected' && validTime(account.created_at))
    .map((account) => account.created_at)
    .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0] ?? null;

const validTime = (iso: string | null | undefined): iso is string => !!iso && !Number.isNaN(new Date(iso).getTime());

/**
 * When the bank's first scan started: `created_at` from /banking/source/ when
 * the server sends it, which covers Plaid as well as Stripe; otherwise the
 * Stripe accounts list. Null with neither to go by.
 */
export const bankFirstScanStart = (
  source: FinancialSourceStatus | null | undefined,
  accounts: BankConnection[] | null | undefined
): string | null => {
  const createdAt = source?.connection?.created_at;
  return validTime(createdAt) ? createdAt : bankConnectedAt(accounts);
};

/**
 * The bank's first import.
 *
 * The signal is `history_complete`, the server's flag behind Finance's "Your
 * bank history is still importing" alert, for Plaid and Stripe alike: false is
 * importing, true is complete, and an error before it turns true is a failed
 * first import. The flag can stay false for good (Plaid sets it only when a
 * sync page reports HISTORICAL_UPDATE_COMPLETE, Stripe only once a linked
 * account has a succeeded transaction refresh, never for an account linked
 * without the transactions permission), so a connection more than 24 hours old
 * (by `connectedAt`, i.e. `created_at`) stops importing: idle without an error,
 * failed with one. Without a connection time it stays importing.
 *
 * Only when the server does not send the flag does the old rule apply: both
 * providers stamp `last_synced_at` when a scan lands, so an unstamped
 * connection under 30 minutes old (by `connectedAt`) is importing, and past
 * that, or with an error first, failed. With no connection time it never shows.
 */
export const bankSync = (
  source: FinancialSourceStatus | null | undefined,
  connectedAt: string | null,
  now: Date = new Date()
): IntegrationSync | null => {
  const connection = source?.connection;
  if (!connection) return null;
  const base = { key: 'bank', label: 'Bank', path: '/integrations/bank', datasets: [], progress: NO_PROGRESS, error: null, retry: null };
  const failed: IntegrationSync = {
    ...base,
    state: 'failed',
    error: BANK_FIRST_SCAN_FAILED,
    retry: { kind: 'open', path: '/integrations/bank' }
  };

  if (typeof connection.history_complete === 'boolean') {
    if (connection.history_complete) return { ...base, state: 'complete' };
    if (connection.error_code) return failed;
    // Past a day the header lets go: the flag can stay false for good, and
    // Finance's "still importing" alert is the place that keeps saying so.
    const connectedMs = connectedAt ? new Date(connectedAt).getTime() : NaN;
    if (!Number.isNaN(connectedMs) && now.getTime() - connectedMs > BANK_HISTORY_HEADER_MS) return { ...base, state: 'idle' };
    return { ...base, state: 'importing', startedAt: connectedAt };
  }

  // Fallback for a server without the flag.
  if (connection.last_synced_at) return { ...base, state: 'complete' };
  const connectedMs = connectedAt ? new Date(connectedAt).getTime() : NaN;
  if (Number.isNaN(connectedMs)) return { ...base, state: 'idle' };
  if (connection.error_code || now.getTime() - connectedMs >= BANK_FIRST_SCAN_MS) return failed;
  return { ...base, state: 'importing', startedAt: connectedAt };
};

/** Whether the bank's first import can only be judged by the 30-minute fallback (no `history_complete`). */
export const bankNeedsConnectionTime = (source: FinancialSourceStatus | null | undefined): boolean => {
  const connection = source?.connection;
  return !!connection && typeof connection.history_complete !== 'boolean' && !connection.last_synced_at;
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

/** What the chip and popover list: first imports running, waiting for review, or failed. A finished one is gone for good. */
export const visibleIntegrations = (items: IntegrationSync[]): IntegrationSync[] =>
  items.filter((item) => item.state === 'importing' || item.state === 'review' || item.state === 'failed');

export const isAnyImporting = (items: IntegrationSync[]): boolean => items.some((item) => item.state === 'importing');

/**
 * Whether the header should keep rereading: a first import running, or one
 * waiting for review (the merchant may approve it on another page or device,
 * and the commit that follows is a running import).
 */
export const isPolling = (item: IntegrationSync): boolean => item.state === 'importing' || item.state === 'review';

// ---------------------------------------------------------------------------
// Poll backoff
// ---------------------------------------------------------------------------

export const FAST_POLL_MS = 5_000;
export const SLOW_POLL_MS = 60_000;
/** How long an import is polled fast before the poll slows down. */
export const FAST_POLL_WINDOW_MS = 10 * 60 * 1000;

/** The request that rereads an integration: one for every POS connection, one each otherwise. */
export const pollSource = (item: IntegrationSync): string => (item.key.startsWith('pos:') ? 'pos' : item.key);

/**
 * How often to reread one integration, or null when it needs no polling.
 * Importing: every 5 seconds for its first 10 minutes, then every 60, timed
 * from `since` (when it started importing; null counts as just now). Waiting
 * for review: every 60 seconds from the start, since nothing moves until the
 * merchant approves.
 */
export const pollIntervalMs = (item: IntegrationSync, since: number | null, now: number): number | null => {
  if (item.state === 'review') return SLOW_POLL_MS;
  if (item.state !== 'importing') return null;
  return since == null || now - since < FAST_POLL_WINDOW_MS ? FAST_POLL_MS : SLOW_POLL_MS;
};

/**
 * Each request's interval: the shortest of the integrations it rereads. `since`
 * gives an integration's import start in ms (the server's `startedAt` where it
 * has one, else when this tab first saw it importing).
 */
export const pollIntervals = (
  items: IntegrationSync[],
  since: (item: IntegrationSync) => number | null,
  now: number
): Record<string, number> => {
  const intervals: Record<string, number> = {};
  items.forEach((item) => {
    const interval = pollIntervalMs(item, since(item), now);
    if (interval == null) return;
    const source = pollSource(item);
    intervals[source] = Math.min(intervals[source] ?? Infinity, interval);
  });
  return intervals;
};

/** The requests due now: those whose interval has passed since they were last made. */
export const dueSources = (intervals: Record<string, number>, lastPolled: Record<string, number>, now: number): string[] =>
  Object.entries(intervals)
    .filter(([source, interval]) => now - (lastPolled[source] ?? now) >= interval)
    .map(([source]) => source)
    .sort();

export type ChipView = { kind: 'importing' | 'review' | 'failed'; label: string } | null;

/**
 * The header chip. Importing wins, since it is what is happening now; then a
 * failure, which stays listed until it is retried; then an import waiting for
 * review. Null (no chip at all) when no first import is running, waiting or
 * failed.
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
  if (items.some((item) => item.state === 'review')) return { kind: 'review', label: REVIEW_NEEDED };
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

/** The chip's and the integration tiles' word for an import waiting for review. */
export const REVIEW_NEEDED = 'Review needed';

/** The popover's line for an import waiting for review. */
export const REVIEW_TEXT = 'Your import is ready to review. Nothing has been written yet.';

/**
 * The first imports that finished since the last reading: importing (or
 * waiting for review, if the approved commit finished between two readings)
 * then, complete now. Each gets one success message. One that failed, was
 * cancelled, stopped for approval or went away gets none.
 */
export const finishedImports = (previous: Record<string, SyncState>, items: IntegrationSync[]): IntegrationSync[] =>
  items.filter((item) => (previous[item.key] === 'importing' || previous[item.key] === 'review') && item.state === 'complete');

export const finishedMessage = (item: IntegrationSync): string => `${item.label} import finished.`;

export const stateByKey = (items: IntegrationSync[]): Record<string, SyncState> =>
  Object.fromEntries(items.map((item) => [item.key, item.state]));
