// Query/mutation hooks for the onboarding wizard. Polling is hand-rolled
// window.setInterval per the ImportJobProgress precedent (3s, gated, cleaned
// up) — the repo has no refetchInterval precedent.

import { useEffect, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import useSWR from 'swr';

import {
  confirmProposal,
  createDriveSource,
  createIntegrationSource,
  deleteSource,
  getJob,
  getOnboardingRegistry,
  getOnboardingState,
  getProposal,
  getRejectedRows,
  getStagedTablePreview,
  listDriveFiles,
  proposeMapping,
  retryNormalize,
  updateProposal
} from 'api/onboarding.api';
import type {
  DeleteSourceResult,
  DriveFile,
  IngestPhase,
  IntegrationImportResult,
  IntegrationKind,
  MappingProposal,
  OnboardingState,
  ProposalPatch,
  StagedTableSummary
} from 'api/onboarding.api';
import { getCompanyBusinessInfo } from 'api/settings';
import qbApi from 'api/qb';
import squareApi from 'api/square';
import stripeApi from 'api/stripe.api';
import { googleDriveAPI } from 'api/googleDrive.api';
import { ACTIVE_PHASES, KIND_LABELS, shouldAutoTriggerNormalize, shouldPollState, sourceKind } from '../wizardState';
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
  // /api/stripe/status sits behind an admin gate server-side: a non-admin
  // onboarding role gets 403. retry:false + isError → the card chip degrades
  // to 'unknown'; it never blocks the wizard.
  const stripe = useQuery({
    queryKey: ['onboarding-int-stripe', companyId],
    queryFn: () => stripeApi.getConnectionStatus(companyId!),
    enabled: !!companyId,
    retry: false,
    staleTime: 30_000
  });
  const anyConnected = !!qb.data?.is_connected || !!square.data?.connected || !!drive.data?.connected || !!stripe.data?.connected;
  return { qb, square, drive, stripe, anyConnected };
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

export function useDeleteSource() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (sourceId: string) => deleteSource(sourceId),
    onSuccess: (data: DeleteSourceResult, sourceId: string) => {
      // A non-empty cleanup_errors still means the source is GONE — Phase B of
      // the server-side purge is best-effort and never un-deletes — so this is
      // a warning, not a failure.
      if (data.cleanup_errors.length > 0) {
        snack('File deleted, but some cleanup steps failed. Contact support if data reappears.', 'warning');
      } else {
        snack('File deleted.', 'success');
      }
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
      // The dead source's per-table caches are staleTime: Infinity, so drop
      // them explicitly or a ghost tab/card can render from cache.
      for (const key of ['onboarding-job', 'onboarding-preview', 'onboarding-proposal', 'onboarding-rejected']) {
        qc.removeQueries({ queryKey: [key], predicate: () => true });
      }
      return sourceId;
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const serverText = error?.response?.data?.error;
      if (status === 409) {
        // Integration kinds: recreated by the nightly export, so this is
        // informational rather than an error the user can act on here.
        snack(serverText || 'This source is managed by an integration and cannot be deleted.', 'info');
      } else {
        snack(serverText || 'Could not delete this file. Try again.', 'error');
      }
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

// One Import click per kind: POST /sources/ {kind} runs the per-entity export
// fan-out synchronously and answers with per-entity results (no job_id — jobs
// appear via the polled /state/). 409 = not connected; 502 = every entity failed.
export function useImportIntegration(kind: IntegrationKind) {
  const qc = useQueryClient();
  const label = KIND_LABELS[kind];
  return useMutation({
    mutationFn: () => createIntegrationSource(kind),
    onSuccess: (data: IntegrationImportResult) => {
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
      const exported = data.results.filter((r) => r.status === 'exported').length;
      const failed = data.results.filter((r) => r.status === 'failed').length;
      if (failed > 0) {
        snack(`Started ${exported} of ${data.results.length} ${label} imports; ${failed} failed.`, 'warning');
      } else {
        snack(`Importing ${exported} ${label} data set${exported === 1 ? '' : 's'}.`, 'success');
      }
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const serverText = error?.response?.data?.error;
      if (status === 409) {
        snack(serverText || `Connect ${label} before importing.`, 'warning');
      } else {
        snack(serverText || `${label} import failed. Try again.`, 'error');
      }
    }
  });
}

// Drive picker pick → per-file source + synchronous export. Re-picking the
// same file reuses its source (new generation ⇒ supersedence).
export function useImportDriveFile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: DriveFile) => createDriveSource(file.id, file.name, file.mime_type),
    onSuccess: (_data: IntegrationImportResult, file) => {
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
      snack(`Importing ${file.name} from Google Drive.`, 'success');
    },
    onError: (error: any) => {
      const status = error?.response?.status;
      const serverText = error?.response?.data?.error;
      if (status === 409) {
        snack(serverText || 'Connect Google Drive before importing.', 'warning');
      } else {
        snack(serverText || 'Could not import this file from Drive. Try again.', 'error');
      }
    }
  });
}

// Drive picker listing — enabled only while the dialog is open. retry:false so
// a 409 (disconnected) or 502 (Drive error) surfaces immediately in the dialog.
export function useDriveFiles(open: boolean, q: string, pageToken: string) {
  return useQuery({
    queryKey: ['onboarding-drive-files', q, pageToken],
    queryFn: () => listDriveFiles(q || undefined, pageToken || undefined),
    enabled: open,
    retry: false,
    staleTime: 30_000
  });
}

// Integration jobs are auto-confirmed server-side and parked at
// mapping_confirmed with an empty dataform_run_id (the ingest callback cannot
// run the Dataform trigger inside its 10s budget) — the wizard is the trigger
// until Phase 7's scheduled sweep. Mounted in OnboardingWizard so it runs on
// every step. Ref-guarded to ONE fire per job id per mount; errors are silent:
// a 409 just means another job's batch-claim already swept this one, and real
// trigger failures land in stats.normalize as trigger_failed for the retry UI.
export function useAutoTriggerNormalize(state: OnboardingState | undefined) {
  const qc = useQueryClient();
  const firedRef = useRef<Set<string>>(new Set());
  const { mutate } = useMutation({
    mutationFn: (jobId: string) => retryNormalize(jobId),
    onSuccess: (data) => {
      qc.setQueryData(['onboarding-job', data.id], data);
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: ['onboarding-state'] });
    }
  });

  useEffect(() => {
    if (!state) return;
    for (const job of state.jobs) {
      if (firedRef.current.has(job.id)) continue;
      if (!shouldAutoTriggerNormalize(job, sourceKind(state, job.source))) continue;
      firedRef.current.add(job.id);
      mutate(job.id);
    }
  }, [state, mutate]);
}
