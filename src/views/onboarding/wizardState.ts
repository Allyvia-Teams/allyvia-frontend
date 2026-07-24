// Pure wizard-state derivation. The backend owns all onboarding state; the
// wizard's position is DERIVED from /onboarding/state/ + the company profile.
// deriveStepFromBackend is the refresh-resumability acceptance criterion —
// its priority table is pinned by wizardState.test.ts.

import type { IngestPhase, IngestionJob, JobError, OnboardingState, StagedTableSummary } from 'api/onboarding.api';
import type { CompanyBusinessInfo } from 'types/settings';

export const WIZARD_STEPS = [1, 2, 3, 4, 5, 6] as const;
export type WizardStep = (typeof WIZARD_STEPS)[number];

export const STEP_LABELS: Record<WizardStep, string> = {
  1: 'Business profile',
  2: 'Connect data',
  3: 'Upload files',
  4: 'Review & map',
  5: 'Progress',
  6: 'Data health'
};

export const ACTIVE_PHASES: IngestPhase[] = ['landed', 'ingesting', 'mapping_confirmed', 'normalizing'];

// Mirrors backend ONBOARDING_UPLOAD_URL_TTL_SECONDS = 900.
export const UPLOAD_TICKET_TTL_MS = 15 * 60 * 1000;

// '1'..'6' → number; anything else (null, '', '0', '7', '3.5', 'x') → null.
export function parseStepParam(value: string | null): WizardStep | null {
  if (value === null || !/^[1-6]$/.test(value)) return null;
  return Number(value) as WizardStep;
}

export function isProfileComplete(profile: Pick<CompanyBusinessInfo, 'industry' | 'address_line1'> | undefined): boolean {
  return !!profile?.industry && !!profile?.address_line1;
}

// An upload ticket younger than the TTL whose source has no job yet — the
// user is mid-upload or mid-Eventarc; keep polling and keep them on step 3.
export function hasFreshPendingSource(state: OnboardingState, now: Date): boolean {
  return state.sources.some((source) => {
    if (source.kind !== 'upload' || source.status !== 'pending') return false;
    if (state.jobs.some((job) => job.source === source.id)) return false;
    const created = Date.parse(source.created_at);
    if (Number.isNaN(created)) return false;
    return now.getTime() - created < UPLOAD_TICKET_TTL_MS;
  });
}

// Strict priority order — see the rule table in the Phase 4 design doc:
// 0 undefined state → 1 (loading skeleton)
// 1 any await_map → 4 (human review is the bottleneck; beats everything)
// 2 any active phase → 5 (pipeline in flight)
// 3 any failed → 5 (surface the error + its action)
// 4 fresh pending source → 3 (mid-upload/mid-Eventarc)
// 5 any done → 6 (show health)
// 6 any source at all (stale, jobless) → 3 (abandoned ticket → re-upload)
// 7 profile incomplete → 1
// 8 otherwise → 2
export function deriveStepFromBackend(state: OnboardingState | undefined, profile: CompanyBusinessInfo | undefined, now: Date): WizardStep {
  if (!state) return 1;
  if (state.jobs.some((job) => job.phase === 'await_map')) return 4;
  if (state.jobs.some((job) => ACTIVE_PHASES.includes(job.phase))) return 5;
  if (state.jobs.some((job) => job.phase === 'failed')) return 5;
  if (hasFreshPendingSource(state, now)) return 3;
  if (state.jobs.some((job) => job.phase === 'done')) return 6;
  if (state.sources.length > 0) return 3;
  if (!isProfileComplete(profile)) return 1;
  return 2;
}

// Manual-navigation clamp: 1–3 always reachable; 4 once a proposal exists
// (read-only after confirm); 5 once any job exists; 6 once any job is done.
export function isStepReachable(step: WizardStep, state: OnboardingState | undefined): boolean {
  if (step <= 3) return true;
  if (!state) return false;
  if (step === 4) {
    return state.jobs.some((job) => ['await_map', 'mapping_confirmed', 'normalizing', 'done'].includes(job.phase));
  }
  if (step === 5) return state.jobs.length > 0;
  return state.jobs.some((job) => job.phase === 'done');
}

// Explicit reachable ?step= is respected; anything else falls back to derived.
export function resolveStep(
  param: string | null,
  state: OnboardingState | undefined,
  profile: CompanyBusinessInfo | undefined,
  now: Date
): WizardStep {
  const parsed = parseStepParam(param);
  if (parsed !== null && isStepReachable(parsed, state)) return parsed;
  return deriveStepFromBackend(state, profile, now);
}

// Stepper checkmarks; never blocks navigation (only step 1's Next gates).
export function stepCompletion(
  state: OnboardingState | undefined,
  profile: CompanyBusinessInfo | undefined,
  integrationsConnected: boolean
): Record<WizardStep, boolean> {
  const jobs = state?.jobs ?? [];
  const anyDone = jobs.some((job) => job.phase === 'done');
  const anyActive = jobs.some((job) => ACTIVE_PHASES.includes(job.phase));
  const anyAwaitMap = jobs.some((job) => job.phase === 'await_map');
  return {
    1: isProfileComplete(profile),
    2: integrationsConnected,
    3: jobs.length > 0,
    4: jobs.some((job) => ['mapping_confirmed', 'normalizing', 'done'].includes(job.phase)) && !anyAwaitMap,
    5: anyDone && !anyActive,
    6: anyDone
  };
}

// Poll /state/ only while the machine is doing something: active pipeline
// phases or a fresh pending source. await_map/done/failed wait on the human.
export function shouldPollState(state: OnboardingState | undefined, now: Date): boolean {
  if (!state) return false;
  if (state.jobs.some((job) => ACTIVE_PHASES.includes(job.phase))) return true;
  return hasFreshPendingSource(state, now);
}

export function jobsForSource(state: OnboardingState, sourceId: string): IngestionJob[] {
  return state.jobs.filter((job) => job.source === sourceId);
}

// jobs[].source is a bare UUID; the filename lives in sources[].config.filename.
export function sourceFilename(state: OnboardingState, sourceId: string): string {
  const source = state.sources.find((s) => s.id === sourceId);
  const filename = source?.config?.filename;
  if (typeof filename === 'string' && filename) return filename;
  return `Upload ${sourceId.slice(0, 8)}`;
}

// "sales.xlsx — Sheet2" when the ingest stats carry a sheet name for this table.
export function tableDisplayName(state: OnboardingState, job: IngestionJob, table: Pick<StagedTableSummary, 'bq_table_id'>): string {
  const filename = sourceFilename(state, job.source);
  const stat = (job.stats?.tables ?? []).find((t) => t.bq_table_id === table.bq_table_id);
  if (stat?.sheet) return `${filename} — ${stat.sheet}`;
  return filename;
}

// Mirrors services.py retry precondition: phase === 'mapping_confirmed' OR
// (phase === 'failed' AND error.kind === 'dataform'); otherwise the server 409s.
export function canRetryNormalize(job: Pick<IngestionJob, 'phase' | 'error'>): boolean {
  return job.phase === 'mapping_confirmed' || (job.phase === 'failed' && job.error?.kind === 'dataform');
}

export type ErrorAction = 'retry-normalize' | 'reupload' | 'support' | null;
export interface ErrorPresentation {
  title: string;
  description: string;
  action: ErrorAction;
}

export function jobErrorPresentation(error: JobError | null): ErrorPresentation | null {
  if (!error) return null;
  const message = error.message || '';
  switch (error.kind) {
    case 'auth':
      return {
        title: 'Connection expired',
        description: 'Authentication to the data source failed. Reconnect and try again.',
        action: 'reupload'
      };
    case 'validation':
      return {
        title: 'File rejected',
        description: `${message ? `${message} ` : ''}Fix the file and upload it again.`,
        action: 'reupload'
      };
    case 'convert':
      return {
        title: "Couldn't read this file",
        description: "We couldn't convert this file. Check that it's a valid CSV, XLSX, or NDJSON and re-upload.",
        action: 'reupload'
      };
    case 'load':
      return {
        title: 'Load failed',
        description: `BigQuery couldn't load this file.${message ? ` ${message}` : ''}`,
        action: 'reupload'
      };
    case 'dataform':
      return {
        title: 'Normalization failed',
        description: `${message ? `${message} ` : ''}You can retry without re-uploading.`,
        action: 'retry-normalize'
      };
    case 'assertion':
      return {
        title: 'Data-quality checks failed',
        description: 'Some rows failed validation. Contact support or re-upload a corrected file.',
        action: 'support'
      };
    default:
      return {
        title: 'Something went wrong',
        description: 'Something went wrong on our side. Contact support if it persists.',
        action: 'support'
      };
  }
}
