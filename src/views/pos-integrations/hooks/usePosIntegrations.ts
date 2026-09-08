// Query/mutation hooks for the POS migration wizard.
//
// Polling is a hand-rolled window.setInterval, matching the onboarding
// wizard's precedent rather than react-query's refetchInterval — the repo has
// no refetchInterval precedent and mixing the two makes cadence hard to reason
// about. The interval is gated on the run still being in flight and cleaned up
// on unmount, so a finished import stops polling instead of hammering the API
// for as long as the tab is open.

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveRun,
  authorizeConnection,
  cancelRun,
  completeOAuth,
  confirmMapping,
  createConnection,
  disconnect,
  getConnection,
  getMapping,
  getReport,
  getRun,
  listConnections,
  listProviders,
  listRuns,
  resolveDuplicates,
  skipInvalid,
  startRun,
  updateConnection,
  uploadFiles
} from 'api/posIntegrations.api';
import type { ConnectionMode, CsvEntity, DateOrder, Provider, RunStatus } from 'api/posIntegrations.api';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

const POLL_MS = 2500;

/** Statuses where the server is still working and the screen should keep asking. */
export const ACTIVE_RUN_STATUSES: RunStatus[] = ['pending', 'extracting', 'validating', 'committing'];

export const isRunActive = (status?: RunStatus) => !!status && ACTIVE_RUN_STATUSES.includes(status);

export const snack = (message: string, color: 'success' | 'error' | 'info' | 'warning') =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

const errorMessage = (error: unknown, fallback: string): string => {
  const response = (error as { response?: { data?: Record<string, unknown> } })?.response;
  const data = response?.data;
  if (!data) return fallback;
  if (typeof data.detail === 'string') return data.detail;
  // DRF field errors: surface the first one rather than a generic failure, so
  // "This provider cannot stay in sync" reaches the merchant verbatim.
  const first = Object.values(data)[0];
  if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
  return fallback;
};

export const keys = {
  providers: ['pos-integrations', 'providers'] as const,
  connections: ['pos-integrations', 'connections'] as const,
  connection: (id: string) => ['pos-integrations', 'connection', id] as const,
  mapping: (id: string) => ['pos-integrations', 'mapping', id] as const,
  runs: (connectionId?: string) => ['pos-integrations', 'runs', connectionId ?? 'all'] as const,
  run: (id: string) => ['pos-integrations', 'run', id] as const,
  report: (id: string) => ['pos-integrations', 'report', id] as const
};

// --- reads ----------------------------------------------------------------

export function useProviders() {
  return useQuery({ queryKey: keys.providers, queryFn: listProviders });
}

export function useConnections() {
  return useQuery({ queryKey: keys.connections, queryFn: listConnections });
}

export function useConnection(id: string | undefined) {
  return useQuery({
    queryKey: keys.connection(id ?? ''),
    queryFn: () => getConnection(id as string),
    enabled: !!id
  });
}

export function useMapping(id: string | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.mapping(id ?? ''),
    queryFn: () => getMapping(id as string),
    enabled: !!id && enabled
  });
}

export function useRuns(connectionId?: string) {
  return useQuery({ queryKey: keys.runs(connectionId), queryFn: () => listRuns(connectionId) });
}

/** Polls while the run is in flight, then stops. */
export function useRunPolling(runId: string | undefined) {
  const client = useQueryClient();
  const query = useQuery({
    queryKey: keys.run(runId ?? ''),
    queryFn: () => getRun(runId as string),
    enabled: !!runId
  });

  const status = query.data?.status;
  // Held in a ref so the effect below depends only on whether polling should
  // happen, not on every refetch identity — otherwise the interval is torn
  // down and rebuilt on each tick.
  const refetch = useRef(query.refetch);
  refetch.current = query.refetch;

  useEffect(() => {
    if (!runId || !isRunActive(status)) return undefined;
    const timer = window.setInterval(() => {
      refetch.current();
    }, POLL_MS);
    return () => window.clearInterval(timer);
  }, [runId, status]);

  // The report is only meaningful once the server has stopped writing it.
  useEffect(() => {
    if (runId && status && !isRunActive(status)) {
      client.invalidateQueries({ queryKey: keys.report(runId) });
    }
  }, [client, runId, status]);

  return query;
}

export function useReport(runId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: keys.report(runId ?? ''),
    queryFn: () => getReport(runId as string),
    enabled: !!runId && enabled
  });
}

// --- writes ---------------------------------------------------------------

export function useCreateConnection() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { provider: Provider; mode?: ConnectionMode; default_currency?: string }) => createConnection(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.providers });
      client.invalidateQueries({ queryKey: keys.connections });
    },
    onError: (error) => snack(errorMessage(error, 'Could not connect.'), 'error')
  });
}

export function useUpdateConnection(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { mode?: ConnectionMode; auto_commit?: boolean; default_currency?: string }) => updateConnection(id, payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.connection(id) });
      snack('Settings saved.', 'success');
    },
    onError: (error) => snack(errorMessage(error, 'Could not save settings.'), 'error')
  });
}

/** Where a provider sends the merchant back. One route serves every provider. */
export const OAUTH_REDIRECT_PATH = '/integrations/pos/callback';

export function oauthRedirectUri() {
  return `${window.location.origin}${OAUTH_REDIRECT_PATH}`;
}

export function useAuthorize(id: string) {
  return useMutation({
    mutationFn: () => authorizeConnection(id, oauthRedirectUri()),
    onError: (error) => snack(errorMessage(error, 'Could not start the connection.'), 'error')
  });
}

export function useCompleteOAuth() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { provider: Provider; code: string; state: string }) => completeOAuth(payload),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.providers });
      client.invalidateQueries({ queryKey: keys.connections });
    }
    // No snack on error: the callback screen shows the failure in place, and a
    // toast on a page the merchant lands on cold is noise on top of an error.
  });
}

export function useDisconnect() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => disconnect(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.providers });
      client.invalidateQueries({ queryKey: keys.connections });
      snack('Disconnected. Your imported data stays where it is.', 'success');
    },
    onError: (error) => snack(errorMessage(error, 'Could not disconnect.'), 'error')
  });
}

export function useUploadFiles(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (files: Partial<Record<CsvEntity, File>>) => uploadFiles(id, files),
    onSuccess: (data) => {
      client.invalidateQueries({ queryKey: keys.connection(id) });
      client.invalidateQueries({ queryKey: keys.mapping(id) });
      const failed = Object.values(data.errors || {});
      if (failed.length) snack(failed[0], 'warning');
    },
    onError: (error) => snack(errorMessage(error, 'Upload failed.'), 'error')
  });
}

export function useConfirmMapping(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (payload: { entity: CsvEntity; targets: Record<string, string>; date_order: DateOrder }) => confirmMapping(id, payload),
    onSuccess: () => client.invalidateQueries({ queryKey: keys.mapping(id) }),
    onError: (error) => snack(errorMessage(error, 'Could not save the mapping.'), 'error')
  });
}

export function useStartRun(id: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => startRun(id),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.runs(id) });
      client.invalidateQueries({ queryKey: keys.connection(id) });
    },
    onError: (error) => snack(errorMessage(error, 'Could not start the import.'), 'error')
  });
}

export function useApproveRun(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => approveRun(runId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.run(runId) });
      snack('Importing. This can take a few minutes for a large history.', 'info');
    },
    onError: (error) => snack(errorMessage(error, 'Could not approve this import.'), 'error')
  });
}

export function useCancelRun(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => cancelRun(runId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: keys.run(runId) });
      snack('Import cancelled. Nothing was written.', 'info');
    },
    onError: (error) => snack(errorMessage(error, 'Could not cancel.'), 'error')
  });
}

export function useResolveDuplicates(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (decisions: Array<{ staged_record_id: number; action: 'merge' | 'create' }>) => resolveDuplicates(runId, decisions),
    onSuccess: (data) => {
      // The server returns the rebuilt report, so seed it rather than refetch:
      // a large report is expensive and we already have the authoritative copy.
      client.setQueryData(keys.report(runId), data.report);
      snack(`Saved ${data.updated} decision${data.updated === 1 ? '' : 's'}.`, 'success');
    },
    onError: (error) => snack(errorMessage(error, 'Could not save your choices.'), 'error')
  });
}

export function useSkipInvalid(runId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (entity?: string) => skipInvalid(runId, entity),
    onSuccess: (data) => {
      client.setQueryData(keys.report(runId), data.report);
      snack(`${data.skipped} record${data.skipped === 1 ? '' : 's'} will be left out of the import.`, 'info');
    },
    onError: (error) => snack(errorMessage(error, 'Could not skip those records.'), 'error')
  });
}
