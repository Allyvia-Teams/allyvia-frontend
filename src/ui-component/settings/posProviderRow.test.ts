import { describe, expect, it } from 'vitest';

import type { ProviderCard } from 'api/posIntegrations.api';

import { posProviderRow } from './posProviderRow';

const card = (overrides: Partial<ProviderCard> = {}): ProviderCard => ({
  provider: 'clover',
  label: 'Clover',
  available: true,
  status: 'available',
  connection_id: null,
  supports_ongoing_sync: true,
  ...overrides
});

const settled = { loading: false, error: false };

describe('posProviderRow', () => {
  it('offers Connect for an available provider with no connection', () => {
    expect(posProviderRow('clover', card(), settled)).toEqual({
      state: 'disconnected',
      primaryLabel: 'Connect',
      route: '/integrations/pos/connect/clover',
      disabled: false
    });
  });

  it('manages an active connection on its own page', () => {
    expect(posProviderRow('clover', card({ status: 'active', connection_id: 'c-1' }), settled)).toEqual({
      state: 'connected',
      primaryLabel: 'Manage',
      route: '/integrations/pos/connections/c-1',
      disabled: false
    });
  });

  it('asks a connection that lost its authorization to reconnect', () => {
    for (const status of ['needs_reauth', 'needs_attention'] as const) {
      const view = posProviderRow('clover', card({ status, connection_id: 'c-1' }), settled);
      expect(view.primaryLabel).toBe('Reconnect');
      expect(view.route).toBe('/integrations/pos/connect/clover');
    }
  });

  it('treats a disconnected connection as not connected', () => {
    expect(posProviderRow('clover', card({ status: 'disconnected', connection_id: 'c-1' }), settled).primaryLabel).toBe('Connect');
  });

  it('is coming soon only when the backend says the provider is not built', () => {
    expect(posProviderRow('clover', card({ available: false, status: 'coming_soon' }), settled)).toEqual({
      state: 'coming-soon',
      primaryLabel: 'Unavailable',
      route: null,
      disabled: true
    });
    expect(posProviderRow('clover', undefined, settled).disabled).toBe(true);
  });

  it('keeps the button usable while loading or after a failed read', () => {
    expect(posProviderRow('clover', undefined, { loading: true, error: false }).state).toBe('loading');
    const failed = posProviderRow('clover', undefined, { loading: false, error: true });
    expect(failed.state).toBe('unknown');
    expect(failed.disabled).toBe(false);
    expect(failed.route).toBe('/integrations/pos/connect/clover');
  });
});
