// Query/mutation hooks for the onboarding wizard. Polling is hand-rolled
// window.setInterval per the ImportJobProgress precedent (3s, gated, cleaned
// up) — the repo has no refetchInterval precedent.

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useSWR from 'swr';

import {
  confirmProposal,
  getJob,
  getOnboardingRegistry,
  getOnboardingState,
  getProposal,
  getRejectedRows,
  getStagedTablePreview,
  proposeMapping,
  retryNormalize,
  updateProposal
} from 'api/onboarding.api';
import type { IngestPhase, MappingProposal, ProposalPatch, StagedTableSummary } from 'api/onboarding.api';
import { getCompanyBusinessInfo } from 'api/settings';
import qbApi from 'api/qb';
import squareApi from 'api/square';
import { googleDriveAPI } from 'api/googleDrive.api';
import { ACTIVE_PHASES, shouldPollState } from '../wizardState';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

const POLL_MS = 3000;

const snack = (message: string, color: 'success' | 'error' | 'info' | 'warning') =>
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

export function useOnboardingState(enabled: boolean = true) {
  const query = useQuery({
    queryKey: ['onboarding-state'],
    queryFn: getOnboardingState,
    enabled,
    staleTime: POLL_MS
  });

  const polling = shouldPollState(query.data, new Date());
  const refetch = query.refetch;

  useEffect(() => {
    if (!polling) return;
    const id = window.setInterval(() => {
      refetch();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [polling, refetch]);

  return { query, polling };
}

// Static per deploy → cache forever.
export function useOnboardingRegistry(enabled: boolean = true) {
  return useQuery({
    queryKey: ['onboarding-registry'],
    queryFn: getOnboardingRegistry,
    enabled,
    staleTime: Infinity,
    gcTime: Infinity
  });
}

// DELIBERATE SWR (not TanStack): shares the exact cache key BusinessInfo.tsx
// uses (`company-${companyId}`), so its post-save mutate() updates the
// wizard's step-1 gate for free.
export function useCompanyProfile(companyId: string | undefined) {
  return useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId!));
}

// Integration connection statuses (step 2 cards + the container's step-2
// checkmark). Shared query keys dedupe the requests between the two callers.
export function useIntegrationStatuses(companyId: string | undefined) {
  const qb = useQuery({
    queryKey: ['onboarding-int-qb', companyId],
    queryFn: () => qbApi.getConnectionStatus(companyId!),
    enabled: !!companyId,
    retry: false,
    staleTime: 30_000
  });
  const square = useQuery({
    queryKey: ['onboarding-int-square', companyId],
    queryFn: () => squareApi.getConnectionStatus(companyId!),
    enabled: !!companyId,
    retry: false,
    staleTime: 30_000
  });
  const drive = useQuery({
    queryKey: ['onboarding-int-drive'],
    queryFn: () => googleDriveAPI.getGoogleDriveStatus(),
    enabled: !!companyId,
    retry: false,
    staleTime: 30_000
  });
  const anyConnected = !!qb.data?.is_connected || !!square.data?.connected || !!drive.data?.connected;
  return { qb, square, drive, anyConnected };
}

// poll=true keeps GET /jobs/{id}/ warm while the job is in an active phase —
// required during 'normalizing' because only the job-detail endpoint advances
// Dataform status server-side (5s server debounce); /state/ does not.
export function useJobDetail(jobId: string | undefined, poll: boolean) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ['onboarding-job', jobId],
    queryFn: () => getJob(jobId!),
    enabled: !!jobId,
    staleTime: POLL_MS
  });

  const phase = query.data?.phase;
  const active = !!phase && ACTIVE_PHASES.includes(phase);
  const refetch = query.refetch;

  useEffect(() => {
    if (!poll || !active) return;
    const id = window.setInterval(() => {
      refetch();
    }, POLL_MS);
    return () => window.clearInterval(id);
  }, [poll, active, refetch]);

  // Phase edge (active → done|failed): the state list is now stale.
  const prevPhaseRef = useRef<IngestPhase | undefined>(undefined);
  useEffect(() => {
    const prev = prevPhaseRef.current;
    if (prev && phase && prev !== phase && ACTIVE_PHASES.includes(prev) && (phase === 'done' || phase === 'failed')) {
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    }
    prevPhaseRef.current = phase;
  }, [phase, qc]);

  return query;
}

// Raw tables are generation-keyed and immutable → cache forever.
export function useStagedTablePreview(stagedTableId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-preview', stagedTableId],
    queryFn: () => getStagedTablePreview(stagedTableId!),
    enabled: !!stagedTableId,
    staleTime: Infinity,
    gcTime: Infinity
  });
}

export function useProposal(proposalId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-proposal', proposalId],
    queryFn: () => getProposal(proposalId!),
    enabled: !!proposalId,
    staleTime: 0
  });
}

export function useRejectedRows(stagedTableId: string | undefined) {
  return useQuery({
    queryKey: ['onboarding-rejected', stagedTableId],
    queryFn: () => getRejectedRows(stagedTableId!),
    enabled: !!stagedTableId,
    staleTime: 30_000
  });
}

// Fired once per table (caller ref-guards); 201 first call, 200 after.
export function useProposeMapping() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (stagedTable: StagedTableSummary) => proposeMapping(stagedTable.id),
    onSuccess: (data: MappingProposal, stagedTable) => {
      qc.setQueryData(['onboarding-proposal', data.id], data);
      qc.invalidateQueries({ queryKey: ['onboarding-job', stagedTable.job] });
    }
  });
}

// The PATCH response IS the new truth (server-recomputed transforms) —
// replace the cache rather than refetching.
export function useUpdateProposal(proposalId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: ProposalPatch) => updateProposal(proposalId!, patch),
    onSuccess: (data: MappingProposal) => {
      qc.setQueryData(['onboarding-proposal', proposalId], data);
    }
  });
}

export function useConfirmProposal(proposalId: string | undefined, jobId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => confirmProposal(proposalId!),
    onSuccess: (data: MappingProposal) => {
      qc.setQueryData(['onboarding-proposal', proposalId], data);
      if (jobId) qc.invalidateQueries({ queryKey: ['onboarding-job', jobId] });
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    }
  });
}

export function useRetryNormalize() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (jobId: string) => retryNormalize(jobId),
    onSuccess: (data) => {
      qc.setQueryData(['onboarding-job', data.id], data);
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const serverText = error?.response?.data?.error;
      if (status === 409) {
        snack(serverText || 'This job is not ready to re-run normalization.', 'info');
      } else {
        snack(serverText || 'Could not restart normalization. Try again.', 'error');
      }
    }
  });
}
