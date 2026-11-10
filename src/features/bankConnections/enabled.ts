import useSWR from 'swr';

import bankConnectionsApi from 'api/bankConnections';

/**
 * Whether Stripe bank connections are on for this deployment.
 *
 * There is no flags endpoint: the server answers 404 on every /bank/ route while
 * BANK_CONNECTIONS_ENABLED is off. So the list call doubles as the flag, and
 * every consumer shares one SWR key (one request per page).
 */
export const BANK_CONNECTIONS_KEY = 'bank-connections';

export function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const e = error as { status?: unknown; response?: { status?: unknown } };
  const status = e.response?.status ?? e.status;
  return typeof status === 'number' ? status : undefined;
}

/** true = on, false = off (404), undefined = not known yet (loading or another error). */
export function bankConnectionsEnabled(state: { data?: unknown; error?: unknown }): boolean | undefined {
  if (state.data !== undefined) return true;
  const status = errorStatus(state.error);
  if (status === 404) return false;
  if (status === 403) return true; // the routes exist; this role just may not use them
  return undefined;
}

/** Drop the Plaid "Bank account" tile once Stripe bank connections replace it. */
export function visibleIntegrations<T extends { id: string }>(items: T[], enabled: boolean | undefined): T[] {
  return enabled ? items.filter((item) => item.id !== 'bank') : items;
}

export function useBankConnections(active = true) {
  return useSWR(active ? BANK_CONNECTIONS_KEY : null, () => bankConnectionsApi.list(), { shouldRetryOnError: false });
}
