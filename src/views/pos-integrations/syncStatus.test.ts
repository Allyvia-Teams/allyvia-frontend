import { describe, expect, it } from 'vitest';

import type { ConnectionSync, PosConnection } from 'api/posIntegrations.api';
import {
  committedSummary,
  defaultConnectMode,
  disconnectView,
  finalPullError,
  lastPullDetail,
  lastPullLine,
  pullNowBlocker,
  relativeTime,
  shouldPollSync
} from './syncStatus';

const NOW = new Date('2026-10-27T12:00:00Z');

const sync = (over: Partial<ConnectionSync> = {}): ConnectionSync => ({
  last_pull: null,
  last_successful_pull_at: null,
  pull_requested_at: null,
  disconnect: null,
  backfill_years_done: [],
  own_app: false,
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

describe('relativeTime', () => {
  it('reads an ISO time relative to now, and is empty for nothing', () => {
    expect(relativeTime('2026-10-27T10:00:00Z', NOW)).toBe('about 2 hours ago');
    expect(relativeTime(null, NOW)).toBe('');
    expect(relativeTime('not a date', NOW)).toBe('');
  });
});

describe('committedSummary', () => {
  it('names what came across, sales first, singular where it is one', () => {
    expect(committedSummary({ inventory_level: 1, order: 3 })).toBe('3 orders, 1 stock level');
    expect(committedSummary({ customer: 2, product: 1, variant: 4, order: 0 })).toBe('2 customers, 1 product, 4 variants');
  });

  it('says so when nothing changed', () => {
    expect(committedSummary({ order: 0 })).toBe('No changes');
    expect(committedSummary(null)).toBe('No changes');
  });

  it('keeps an entity it does not know rather than dropping it', () => {
    expect(committedSummary({ gift_card: 2 })).toBe('2 gift card');
  });
});

describe('lastPullLine and lastPullDetail', () => {
  it('is null before the first pull', () => {
    expect(lastPullLine(sync(), NOW)).toBeNull();
    expect(lastPullLine(undefined, NOW)).toBeNull();
  });

  it('gives when and how it ended, with no em dash', () => {
    const line = lastPullLine(sync({ last_pull: { at: '2026-10-27T11:55:00Z', trigger: 'schedule', status: 'succeeded' } }), NOW);
    expect(line).toBe('Last pull: 5 minutes ago · Succeeded');
    expect(line).not.toContain(String.fromCharCode(0x2014));
  });

  it('carries the error for a failure and the reason for a skip', () => {
    const failed = sync({ last_pull: { at: '2026-10-27T11:00:00Z', trigger: 'manual', status: 'failed', error: 'Shopify said no.' } });
    const skipped = sync({
      last_pull: { at: '2026-10-27T11:00:00Z', trigger: 'schedule', status: 'skipped', reason: 'An import was running.' }
    });
    expect(lastPullLine(failed, NOW)).toBe('Last pull: about 1 hour ago · Failed');
    expect(lastPullDetail(failed)).toBe('Shopify said no.');
    expect(lastPullDetail(skipped)).toBe('An import was running.');
    expect(lastPullDetail(sync({ last_pull: { at: '2026-10-27T11:00:00Z', trigger: 'manual', status: 'failed' } }))).toBe(
      'The pull failed.'
    );
    expect(lastPullDetail(sync({ last_pull: { at: '2026-10-27T11:00:00Z', trigger: 'schedule', status: 'succeeded' } }))).toBe('');
  });
});

describe('pullNowBlocker', () => {
  it('allows a pull on a connected, kept-in-sync connection with nothing running', () => {
    expect(pullNowBlocker(connection())).toBeNull();
    expect(pullNowBlocker(connection({ status: 'needs_attention' }))).toBeNull();
  });

  it('is off while a pull is requested, a disconnect is pulling, or an import is in flight', () => {
    expect(pullNowBlocker(connection({}, { pull_requested_at: '2026-10-27T11:59:00Z' }))).toBe('A pull is running.');
    expect(pullNowBlocker(connection({}, { disconnect: { state: 'pulling' } }))).toMatch(/final pull/);
    const run = { status: 'extracting' } as PosConnection['latest_run'];
    expect(pullNowBlocker(connection({ latest_run: run }))).toMatch(/import is running/);
  });

  it('is off for a one-time or unconnected connection', () => {
    expect(pullNowBlocker(connection({ mode: 'one_time' }))).toMatch(/keep in sync/);
    expect(pullNowBlocker(connection({ status: 'needs_reauth' }))).toMatch(/not connected/);
    expect(pullNowBlocker(connection({ status: 'disconnected' }))).toMatch(/not connected/);
  });

  it('allows a pull once a run has finished', () => {
    const run = { status: 'completed' } as PosConnection['latest_run'];
    expect(pullNowBlocker(connection({ latest_run: run }))).toBeNull();
  });
});

describe('shouldPollSync', () => {
  it('polls while a pull is requested or the final pull runs, and not otherwise', () => {
    expect(shouldPollSync(connection({}, { pull_requested_at: '2026-10-27T11:59:00Z' }))).toBe(true);
    expect(shouldPollSync(connection({}, { disconnect: { state: 'pulling' } }))).toBe(true);
    expect(shouldPollSync(connection({}, { disconnect: { state: 'final_pull_failed' } }))).toBe(false);
    expect(shouldPollSync(connection())).toBe(false);
    expect(shouldPollSync(connection({ sync: undefined }))).toBe(false);
    expect(shouldPollSync(undefined)).toBe(false);
  });
});

describe('disconnectView and finalPullError', () => {
  it('maps the disconnect progress to the state the screen shows', () => {
    expect(disconnectView(connection())).toBe('idle');
    expect(disconnectView(connection({}, { disconnect: { state: 'pulling' } }))).toBe('pulling');
    expect(disconnectView(connection({}, { disconnect: { state: 'final_pull_failed' } }))).toBe('failed');
    expect(disconnectView(connection({}, { disconnect: { state: 'disconnected' } }))).toBe('done');
    expect(disconnectView(connection({ status: 'disconnected' }))).toBe('done');
  });

  it('names why the final pull failed, falling back to a plain sentence', () => {
    expect(finalPullError(connection({}, { disconnect: { state: 'final_pull_failed', error: 'Shopify timed out.' } }))).toBe(
      'Shopify timed out.'
    );
    expect(
      finalPullError(
        connection({}, { disconnect: { state: 'final_pull_failed', final_pull: { status: 'failed', error: 'Token expired.' } } })
      )
    ).toBe('Token expired.');
    expect(finalPullError(connection({}, { disconnect: { state: 'final_pull_failed' } }))).toBe('The final pull did not finish.');
    // The backend's own 503 fragment is lower case with no stop.
    expect(
      finalPullError(connection({}, { disconnect: { state: 'final_pull_failed', error: 'the final pull could not be queued' } }))
    ).toBe('The final pull could not be queued.');
  });
});

describe('defaultConnectMode', () => {
  it('starts Shopify on keep in sync and everything else on one-time', () => {
    expect(defaultConnectMode('shopify')).toBe('ongoing');
    expect(defaultConnectMode('square')).toBe('one_time');
    expect(defaultConnectMode('csv')).toBe('one_time');
    expect(defaultConnectMode(undefined)).toBe('one_time');
  });
});
