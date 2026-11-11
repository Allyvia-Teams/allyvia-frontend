// Where a merchant who already has a POS connection should land, for the
// integrations catalog and the connect wizard. Kept free of api/axios imports
// so it can be tested without a DOM (the repo has no jsdom).

import type { PosConnection, Provider, RunStatus } from 'api/posIntegrations.api';
import { isMerchantImport, isRunActive } from './syncStatus';

/**
 * Router state for sending a merchant into the wizard to reconnect or finish
 * authorizing. The wizard then stays put even if an import is in flight.
 */
export const RECONNECT_STATE = { reconnect: true } as const;

export const isReconnecting = (state: unknown): boolean => !!state && (state as { reconnect?: unknown }).reconnect === true;

export const connectionPath = (connectionId: string) => `/integrations/pos/connections/${connectionId}`;

/** The provider's connection the wizard reuses: any that is not disconnected. */
export const findLiveConnection = (connections: PosConnection[] | undefined, provider: Provider | undefined) =>
  provider ? connections?.find((c) => c.provider === provider && c.status !== 'disconnected') : undefined;

const isRunInFlight = (status: RunStatus) => status === 'awaiting_approval' || isRunActive(status);

/**
 * Where the wizard should send a merchant whose connection already has an
 * import in flight, or null to show the wizard. A finished, failed or
 * cancelled run returns null so a re-import is still possible, and so does any
 * run the merchant did not start (a webhook delta or an incremental poll).
 */
export const wizardResumeRoute = (
  connection: Pick<PosConnection, 'status' | 'latest_run'> | undefined,
  { reconnecting = false }: { reconnecting?: boolean } = {}
): string | null => {
  if (!connection || reconnecting || connection.status === 'needs_reauth') return null;
  const run = connection.latest_run;
  if (!run || !isMerchantImport(run) || !isRunInFlight(run.status)) return null;
  return run.status === 'awaiting_approval' ? `/integrations/pos/runs/${run.id}/report` : `/integrations/pos/runs/${run.id}`;
};
