import { describe, expect, it } from 'vitest';

import type { MigrationRunSummary, PosConnection, RunStatus } from 'api/posIntegrations.api';
import { findLiveConnection, isReconnecting, RECONNECT_STATE, wizardResumeRoute } from './resumeRoutes';

const run = (status: RunStatus, kind: MigrationRunSummary['kind'] = 'initial') =>
  ({ id: 'run-1', kind, status }) as PosConnection['latest_run'];

const connection = (over: Partial<PosConnection> = {}): PosConnection =>
  ({
    id: 'conn-1',
    provider: 'lightspeed',
    provider_label: 'Lightspeed',
    status: 'active',
    mode: 'ongoing',
    external_account_id: 'acct',
    token_expires_at: null,
    files: {},
    locations: {},
    latest_run: null,
    auto_commit: false,
    default_currency: 'USD',
    shop_domain: '',
    ...over
  }) as PosConnection;

// What ConnectWizard does on load: find the provider's live connection, then
// ask where an in-flight import on it should take the merchant.
const wizardDestination = (connections: PosConnection[], locationState: unknown = null) =>
  wizardResumeRoute(findLiveConnection(connections, 'lightspeed'), { reconnecting: isReconnecting(locationState) });

describe('connect wizard resume', () => {
  it('sends a run waiting for approval to its report page', () => {
    expect(wizardDestination([connection({ latest_run: run('awaiting_approval') })])).toBe('/integrations/pos/runs/run-1/report');
  });

  it('sends a run that is still importing to its progress page', () => {
    expect(wizardDestination([connection({ latest_run: run('committing') })])).toBe('/integrations/pos/runs/run-1');
  });

  it('treats every status the run poller follows as in flight', () => {
    for (const status of ['pending', 'extracting', 'validating', 'committing'] as RunStatus[]) {
      expect(wizardDestination([connection({ latest_run: run(status) })])).toBe('/integrations/pos/runs/run-1');
    }
  });

  it('stays in the wizard after a completed, failed or cancelled run so a re-import is possible', () => {
    for (const status of ['completed', 'failed', 'cancelled'] as RunStatus[]) {
      const live = findLiveConnection([connection({ latest_run: run(status) })], 'lightspeed');
      // The wizard still reuses the connection (and so reaches Read my data)…
      expect(live?.id).toBe('conn-1');
      // …and is not redirected away from it.
      expect(wizardDestination([connection({ latest_run: run(status) })])).toBeNull();
    }
  });

  it('behaves as before with no existing connection', () => {
    expect(findLiveConnection([], 'lightspeed')).toBeUndefined();
    expect(findLiveConnection(undefined, 'lightspeed')).toBeUndefined();
    expect(findLiveConnection([connection({ status: 'disconnected', latest_run: run('committing') })], 'lightspeed')).toBeUndefined();
    expect(findLiveConnection([connection({ provider: 'shopify' })], 'lightspeed')).toBeUndefined();
    expect(wizardDestination([])).toBeNull();
  });

  it('does not redirect when the wizard is opened to reconnect or re-authorize', () => {
    expect(wizardDestination([connection({ latest_run: run('awaiting_approval') })], RECONNECT_STATE)).toBeNull();
    expect(wizardDestination([connection({ status: 'needs_reauth', latest_run: run('committing') })])).toBeNull();
    expect(isReconnecting(null)).toBe(false);
    expect(isReconnecting({ other: true })).toBe(false);
  });
});

// Every Lightspeed webhook is stored as its own run, about one a second on a
// busy store, and latest_run is the newest run of any kind. Only an import the
// merchant started (kind initial) is something to resume.
describe('connect wizard resume by run kind', () => {
  it('does not redirect for a webhook run that is validating', () => {
    expect(wizardDestination([connection({ latest_run: run('validating', 'webhook') })])).toBeNull();
  });

  it('does not redirect for an incremental run that is committing', () => {
    expect(wizardDestination([connection({ latest_run: run('committing', 'incremental') })])).toBeNull();
  });

  it('still sends an initial import waiting for approval to its report page', () => {
    expect(wizardDestination([connection({ latest_run: run('awaiting_approval', 'initial') })])).toBe(
      '/integrations/pos/runs/run-1/report'
    );
  });

  it('still sends an initial import that is committing to its progress page', () => {
    expect(wizardDestination([connection({ latest_run: run('committing', 'initial') })])).toBe('/integrations/pos/runs/run-1');
  });
});
