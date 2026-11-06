// The decisions behind the daily pull and the disconnect on the connection
// settings screen, kept out of the component so they can be tested without a
// DOM (the repo has no jsdom).
//
// Nothing here is Shopify-specific: the backend reports the same `sync` shape
// for every connector that can stay in sync, so the screen reads it the same
// way for each.

import { formatDistance } from 'date-fns';

import type { ConnectionMode, ConnectionSync, PosConnection, Provider, PullStatus, RunStatus } from 'api/posIntegrations.api';

/** Statuses where the server is still working on a run and the screen should keep asking. */
export const ACTIVE_RUN_STATUSES: RunStatus[] = ['pending', 'extracting', 'validating', 'committing'];

export const isRunActive = (status?: RunStatus) => !!status && ACTIVE_RUN_STATUSES.includes(status);

export const PULL_STATUS_LABELS: Record<PullStatus, string> = {
  succeeded: 'Succeeded',
  failed: 'Failed',
  skipped: 'Skipped'
};

/** Statuses the backend will pull from (integrations/pulls.py PULLABLE). */
const PULLABLE = ['active', 'needs_attention'];

/** "5 minutes ago", or '' for a missing or unreadable time. */
export const relativeTime = (iso: string | null | undefined, now: Date = new Date()): string => {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return formatDistance(date, now, { addSuffix: true });
};

// Singular and plural, in the order a merchant cares about: sales first.
const COMMITTED_NOUNS: Array<[string, string, string]> = [
  ['order', 'order', 'orders'],
  ['inventory_level', 'stock level', 'stock levels'],
  ['customer', 'customer', 'customers'],
  ['product', 'product', 'products'],
  ['variant', 'variant', 'variants']
];

/** "3 orders, 1 stock level", or 'No changes' when nothing was committed. */
export const committedSummary = (committed: Record<string, number> | null | undefined): string => {
  const counts = committed ?? {};
  const known = new Set(COMMITTED_NOUNS.map(([entity]) => entity));
  const parts = COMMITTED_NOUNS.filter(([entity]) => counts[entity] > 0).map(
    ([entity, one, many]) => `${counts[entity]} ${counts[entity] === 1 ? one : many}`
  );
  Object.entries(counts)
    .filter(([entity, count]) => !known.has(entity) && count > 0)
    .forEach(([entity, count]) => parts.push(`${count} ${entity.replace(/_/g, ' ')}`));
  return parts.length ? parts.join(', ') : 'No changes';
};

/** "Last pull: 2 hours ago · Succeeded", or null before the first pull. */
export const lastPullLine = (sync: ConnectionSync | undefined, now: Date = new Date()): string | null => {
  const last = sync?.last_pull;
  if (!last) return null;
  const when = relativeTime(last.at, now) || 'at an unknown time';
  return `Last pull: ${when} · ${PULL_STATUS_LABELS[last.status] ?? last.status}`;
};

/** The failure error or the skip reason, whichever applies, or ''. */
export const lastPullDetail = (sync: ConnectionSync | undefined): string => {
  const last = sync?.last_pull;
  if (!last) return '';
  if (last.status === 'failed') return last.error || 'The pull failed.';
  if (last.status === 'skipped') return last.reason || '';
  return '';
};

/** True while the server is working on a pull or a disconnect, so the screen should keep asking. */
export const shouldPollSync = (connection: PosConnection | undefined): boolean =>
  !!connection?.sync?.pull_requested_at || connection?.sync?.disconnect?.state === 'pulling';

/**
 * Why "Pull now" is off, or null when it can be pressed. The backend refuses
 * the same cases with a 400/409; saying so up front saves the round trip.
 */
export const pullNowBlocker = (connection: PosConnection): string | null => {
  if (connection.status === 'disconnected' || !PULLABLE.includes(connection.status)) return 'This connection is not connected.';
  if (connection.mode !== 'ongoing') return 'Turn on keep in sync to pull changes every day.';
  if (connection.sync?.disconnect?.state === 'pulling') return 'Disconnecting. The final pull is running.';
  if (connection.sync?.pull_requested_at) return 'A pull is running.';
  if (isRunActive(connection.latest_run?.status)) return 'An import is running. Try again when it finishes.';
  return null;
};

export type DisconnectView = 'idle' | 'pulling' | 'failed' | 'done';

/** Which disconnect state the screen shows. */
export const disconnectView = (connection: PosConnection): DisconnectView => {
  if (connection.status === 'disconnected' || connection.sync?.disconnect?.state === 'disconnected') return 'done';
  const state = connection.sync?.disconnect?.state;
  if (state === 'pulling') return 'pulling';
  if (state === 'final_pull_failed') return 'failed';
  return 'idle';
};

/** Why the final pull failed, in the merchant's words where the backend gave some. */
export const finalPullError = (connection: PosConnection): string => {
  const progress = connection.sync?.disconnect;
  return asSentence(progress?.error || progress?.final_pull?.error || 'The final pull did not finish.');
};

/** Capitalised and closed with a stop, so a backend fragment reads as a sentence. */
const asSentence = (text: string): string => {
  const trimmed = text.trim();
  if (!trimmed) return trimmed;
  const capped = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
  return /[.!?]$/.test(capped) ? capped : `${capped}.`;
};

/**
 * The mode the connect wizard starts on. Shopify starts on keep in sync: the
 * daily pull that carries a merchant from the first import to switching
 * Shopify off only runs for ongoing connections. Everything else keeps the
 * one-time default.
 */
export const defaultConnectMode = (provider: Provider | undefined): ConnectionMode => (provider === 'shopify' ? 'ongoing' : 'one_time');
