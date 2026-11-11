// What an integration tile and the integrations banner say about syncing.
//
// The scope rule: the "Still importing" tag and the banner show ONLY while an
// integration's first import is running or waiting for review, read from the
// same first-import states as the header (views/pos-integrations/globalSync).
// Routine background syncs (scheduled and "Sync now" syncs, daily pulls,
// webhooks, polls, bank scans) never raise a tag or the banner; a connected
// tile shows them as one plain "Last synced" line, with no chip.
//
// Pure functions, no React, so the rules test without a DOM.

import type { FinancialSourceStatus } from 'api/banking';
import type { PosConnection } from 'api/posIntegrations.api';
import type { ImportJobStatus } from 'api/square';
import type { SyncStatuses } from 'store/slices/syncProgress';
import type { IntegrationSync } from 'views/pos-integrations/globalSync';
import { relativeTime } from 'views/pos-integrations/syncStatus';

export const STILL_IMPORTING = 'Still importing';

/** The first-import states that put a tag on a tile and a line in the banner. */
const isFirstImportOpen = (item: IntegrationSync | undefined): item is IntegrationSync =>
  item?.state === 'importing' || item?.state === 'review';

/** One tile: whether it carries the "Still importing" tag, and its last routine sync. */
export interface TileSync {
  stillImporting: boolean;
  /** "Last synced 5 minutes ago", or null when there is nothing to say. */
  lastSynced: string | null;
}

/**
 * A tile's sync view. While its first import runs or waits for review it gets
 * the tag and no "Last synced" line; otherwise the line, when there is a time
 * to show and the integration is connected.
 */
export const tileSync = (
  item: IntegrationSync | undefined,
  lastSyncedAt: string | null | undefined,
  connected: boolean,
  now: Date = new Date()
): TileSync => {
  if (isFirstImportOpen(item)) return { stillImporting: true, lastSynced: null };
  const when = connected ? relativeTime(lastSyncedAt, now) : '';
  return { stillImporting: false, lastSynced: when ? `Last synced ${when}` : null };
};

/** "A", "A and B", "A, B and C". */
const listNames = (names: string[]): string =>
  names.length <= 1 ? (names[0] ?? '') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;

export interface ImportBanner {
  /** About the imports still running, or null when none is. */
  importing: string | null;
  /** One per import waiting for review, with where to approve it. */
  reviews: { key: string; text: string; path: string }[];
}

/**
 * The integrations banner, or null when no first import is running or waiting
 * for review. A failed first import is the header's to show, not the banner's.
 */
export const importBanner = (items: IntegrationSync[]): ImportBanner | null => {
  const importing = items.filter((item) => item.state === 'importing').map((item) => item.label);
  const reviews = items
    .filter((item) => item.state === 'review')
    .map((item) => ({
      key: item.key,
      text: `Your ${item.label} import is ready to review. Nothing has been written yet.`,
      path: item.retry?.kind === 'open' ? item.retry.path : item.path
    }));
  if (!importing.length && !reviews.length) return null;
  return {
    importing: importing.length
      ? `${STILL_IMPORTING} from ${listNames(importing)}. Figures across Allyvia may be incomplete until it finishes.`
      : null,
    reviews
  };
};

// ---------------------------------------------------------------------------
// When each integration last synced
// ---------------------------------------------------------------------------

const time = (iso: string | null | undefined): number => (iso ? new Date(iso).getTime() : NaN);

/** The newest readable time of those given, or null. */
export const newest = (...isos: Array<string | null | undefined>): string | null =>
  isos.filter((iso): iso is string => !Number.isNaN(time(iso))).sort((a, b) => time(b) - time(a))[0] ?? null;

/** QuickBooks: the newest entity sync it has reported, or the import job's finish. */
export const quickbooksLastSynced = (statuses: SyncStatuses | null | undefined, job: ImportJobStatus | null | undefined): string | null =>
  newest(...Object.values(statuses ?? {}).flatMap((entity) => [entity.completed_at, entity.last_synced]), job?.completed_at);

/** Square: when its import job last finished. */
export const squareLastSynced = (job: ImportJobStatus | null | undefined): string | null => newest(job?.completed_at);

/** A POS connection: its last successful pull, or a newer finished run (a webhook or poll). */
export const posLastSynced = (connection: PosConnection | undefined): string | null => {
  if (!connection) return null;
  const run = connection.latest_run;
  return newest(connection.sync?.last_successful_pull_at, run?.status === 'completed' ? run.finished_at : null);
};

/** The bank: its last scan. */
export const bankLastSynced = (source: FinancialSourceStatus | null | undefined): string | null =>
  newest(source?.connection?.last_synced_at);
