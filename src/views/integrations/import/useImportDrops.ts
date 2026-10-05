// Queries and mutations for the Import data screen (context-graph P1b).

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  approveDrop,
  createDrop,
  getDrop,
  listDrops,
  listStores,
  mapLocationName,
  reclassifyFile,
  stageDrop,
  type BulkDrop,
  type CreateDropOptions,
  type DropLane
} from 'api/importDrops.api';
import { snack } from 'views/pos-integrations/hooks/usePosIntegrations';

import { pollDelay } from './importDrop';

export const dropKeys = {
  all: ['import-drops'] as const,
  list: () => ['import-drops', 'list'] as const,
  detail: (id: string) => ['import-drops', 'detail', id] as const,
  stores: (connectionId: string) => ['import-drops', 'stores', connectionId] as const
};

/** The server's own sentence when it sent one; a fallback otherwise. */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>;
    if (typeof record.detail === 'string') return record.detail;
    const first = Object.values(record)[0];
    if (Array.isArray(first) && typeof first[0] === 'string') return first[0];
    if (typeof first === 'string') return first;
  }
  return fallback;
}

export function useDrops() {
  return useQuery({ queryKey: dropKeys.list(), queryFn: listDrops });
}

export function useDrop(id: string | undefined) {
  return useQuery({
    queryKey: dropKeys.detail(id ?? ''),
    queryFn: () => getDrop(id as string),
    enabled: !!id,
    refetchInterval: (query) => pollDelay(query.state.data as BulkDrop | undefined) ?? false
  });
}

export function useStores(connectionId: string | null | undefined) {
  return useQuery({
    queryKey: dropKeys.stores(connectionId ?? ''),
    queryFn: () => listStores(connectionId as string),
    enabled: !!connectionId
  });
}

export function useCreateDrop() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ files, options }: { files: File[]; options: CreateDropOptions }) => createDrop(files, options),
    onSuccess: (drop) => {
      client.setQueryData(dropKeys.detail(drop.id), drop);
      client.invalidateQueries({ queryKey: dropKeys.list() });
    },
    onError: (error) => snack(apiErrorMessage(error, 'Those files could not be uploaded.'), 'error')
  });
}

function useDropMutation<T>(fn: (vars: T) => Promise<BulkDrop>, failure: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (drop) => {
      client.setQueryData(dropKeys.detail(drop.id), drop);
      client.invalidateQueries({ queryKey: dropKeys.list() });
    },
    onError: (error) => snack(apiErrorMessage(error, failure), 'error')
  });
}

export function useApproveDrop() {
  return useDropMutation((id: string) => approveDrop(id), 'This drop could not be approved.');
}

export function useStageDrop() {
  return useDropMutation((id: string) => stageDrop(id), 'This drop could not be started again.');
}

export function useReclassify() {
  return useDropMutation(
    ({ dropId, fileId, lane, entity, exclude }: { dropId: string; fileId: string; lane?: DropLane; entity?: string; exclude?: boolean }) =>
      reclassifyFile(dropId, fileId, { lane, entity, exclude }),
    'That file could not be changed.'
  );
}

export function useMapLocation(dropId: string) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ connectionId, name, locationId }: { connectionId: string; name: string; locationId: string }) =>
      mapLocationName(connectionId, name, locationId),
    onSuccess: () => {
      client.invalidateQueries({ queryKey: dropKeys.detail(dropId) });
      snack('Mapped — those rows now import to that store.', 'success');
    },
    onError: (error) => snack(apiErrorMessage(error, 'That store name could not be mapped.'), 'error')
  });
}
