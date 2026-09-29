// The settings-page row for a POS provider served by the unified
// integrations API (`/integrations/providers/`): Clover today.
//
// Pure, so the rules are testable without rendering a component that pulls in
// the API client. The card is the provider list's own entry; the connect
// wizard and the connection page are the same routes the POS hub uses.

import type { ProviderCard } from 'api/posIntegrations.api';

export type PosRowState = 'connected' | 'disconnected' | 'coming-soon' | 'loading' | 'unknown';

export interface PosRowView {
  state: PosRowState;
  primaryLabel: string;
  /** Where the primary button goes; null when there is nowhere to go. */
  route: string | null;
  disabled: boolean;
}

export function posProviderRow(
  provider: string,
  card: ProviderCard | undefined,
  { loading, error }: { loading: boolean; error: boolean }
): PosRowView {
  const connectRoute = `/integrations/pos/connect/${provider}`;
  if (loading) return { state: 'loading', primaryLabel: 'Connect', route: connectRoute, disabled: false };
  // An error reading the list is not a reason to hide a working connector.
  if (error) return { state: 'unknown', primaryLabel: 'Connect', route: connectRoute, disabled: false };
  if (!card || !card.available) return { state: 'coming-soon', primaryLabel: 'Unavailable', route: null, disabled: true };

  if (card.connection_id && card.status === 'active') {
    return {
      state: 'connected',
      primaryLabel: 'Manage',
      route: `/integrations/pos/connections/${card.connection_id}`,
      disabled: false
    };
  }
  if (card.connection_id && (card.status === 'needs_reauth' || card.status === 'needs_attention')) {
    return { state: 'disconnected', primaryLabel: 'Reconnect', route: connectRoute, disabled: false };
  }
  return { state: 'disconnected', primaryLabel: 'Connect', route: connectRoute, disabled: false };
}
