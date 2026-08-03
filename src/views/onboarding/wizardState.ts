// Pure wizard-state derivation. The backend owns all onboarding state; the
// wizard's position is DERIVED from /onboarding/state/ + the company profile.
// deriveStepFromBackend is the refresh-resumability acceptance criterion —
// its priority table is pinned by wizardState.test.ts.

import type {
  IngestPhase,
  IngestionJob,
  JobError,
  OnboardingSource,
  OnboardingState,
  SourceKind,
  StagedTableSummary
} from 'api/onboarding.api';
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

// Non-upload kinds whose sources come from POST /sources/ {kind} (Phase 5).
export const INTEGRATION_KINDS: readonly SourceKind[] = ['square', 'quickbooks', 'stripe', 'google_drive'];

export const KIND_LABELS: Record<SourceKind, string> = {
  upload: 'Upload',
  square: 'Square',
  quickbooks: 'QuickBooks',
  stripe: 'Stripe',
  google_drive: 'Google Drive'
};

// Freshness window for a pending integration source awaiting its ingest
// callback (mid-export/mid-Eventarc). Same 15-minute budget as upload tickets.
export const INTEGRATION_PENDING_TTL_MS = UPLOAD_TICKET_TTL_MS;

// jobs[].source is a bare UUID — join back to the source's kind so display
// and auto-trigger logic can tell uploads from integration exports.
export function sourceKind(state: OnboardingState, sourceId: string): SourceKind | null {
  return state.sources.find((s) => s.id === sourceId)?.kind ?? null;
}

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

// A pending integration source with a fresh export and no job yet: the export
// just ran (or is running) and the Eventarc → callback round-trip hasn't
// created the IngestionJob. Keeps /state/ polling alive and the user on
// step 2 — NOT 3, which is the upload dropzone. Export failures flip the
// source to status 'error', so they naturally fall out of "pending" here.
export function hasFreshPendingIntegrationSource(state: OnboardingState, now: Date): boolean {
  return state.sources.some((source) => {
    if (!INTEGRATION_KINDS.includes(source.kind) || source.status !== 'pending') return false;
    if (state.jobs.some((job) => job.source === source.id)) return false;
    const exp = source.config?.last_export;
    if (exp?.state === 'failed') return false;
    const anchor = Date.parse(exp?.at ?? exp?.claimed_at ?? source.created_at);
    if (Number.isNaN(anchor)) return false;
    return now.getTime() - anchor < INTEGRATION_PENDING_TTL_MS;
  });
}

// Strict priority order — see the rule table in the Phase 4 design doc
// (rule 4.5 added by Phase 5):
// 0 undefined state → 1 (loading skeleton)
// 1 any await_map → 4 (human review is the bottleneck; beats everything)
// 2 any active phase → 5 (pipeline in flight)
// 3 any failed → 5 (surface the error + its action)
// 4 fresh pending upload source → 3 (mid-upload/mid-Eventarc)
// 4.5 fresh pending integration source → 2 (mid-export; step 2 owns the cards)
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
  if (hasFreshPendingIntegrationSource(state, now)) return 2;
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
// Step 2 also completes once any integration-backed job exists — an import
// proves the connection even when the status endpoints are unreadable.
export function stepCompletion(
  state: OnboardingState | undefined,
  profile: CompanyBusinessInfo | undefined,
  integrationsConnected: boolean
): Record<WizardStep, boolean> {
  const jobs = state?.jobs ?? [];
  const anyDone = jobs.some((job) => job.phase === 'done');
  const anyActive = jobs.some((job) => ACTIVE_PHASES.includes(job.phase));
  const anyAwaitMap = jobs.some((job) => job.phase === 'await_map');
  const anyIntegrationJob =
    !!state &&
    jobs.some((job) => {
      const kind = sourceKind(state, job.source);
      return kind !== null && kind !== 'upload';
    });
  return {
    1: isProfileComplete(profile),
    2: integrationsConnected || anyIntegrationJob,
    3: jobs.length > 0,
    4: jobs.some((job) => ['mapping_confirmed', 'normalizing', 'done'].includes(job.phase)) && !anyAwaitMap,
    5: anyDone && !anyActive,
    6: anyDone
  };
}

// Poll /state/ only while the machine is doing something: active pipeline
// phases or a fresh pending source (upload ticket or integration export).
// await_map/done/failed wait on the human.
export function shouldPollState(state: OnboardingState | undefined, now: Date): boolean {
  if (!state) return false;
  if (state.jobs.some((job) => ACTIVE_PHASES.includes(job.phase))) return true;
  return hasFreshPendingSource(state, now) || hasFreshPendingIntegrationSource(state, now);
}

export function jobsForSource(state: OnboardingState, sourceId: string): IngestionJob[] {
  return state.jobs.filter((job) => job.source === sourceId);
}

// jobs[].source is a bare UUID; the display name lives in sources[].config —
// "<Kind> — <entity>" for integration exports ("Square — product"), the picked
// file's name for Drive, config.filename for uploads.
// Only uploads and Drive files can be deleted. Integration sources (square /
// stripe / quickbooks) are recreated overnight by the nightly export
// (export_onboarding_source --all-companies get-or-creates a source for every
// entity the company still has rows for), so the server answers 409 for them
// and no delete affordance should render. Mirrors
// services.DELETABLE_SOURCE_KINDS.
export function canDeleteSource(source: Pick<OnboardingSource, 'kind'> | undefined | null): boolean {
  return source?.kind === 'upload' || source?.kind === 'google_drive';
}

export function sourceDisplayName(state: OnboardingState, sourceId: string): string {
  const source = state.sources.find((s) => s.id === sourceId);
  if (source && source.kind !== 'upload') {
    const label = KIND_LABELS[source.kind] ?? source.kind;
    const entity = source.config?.entity;
    if (typeof entity === 'string' && entity) return `${label} — ${entity}`;
    const name = source.config?.name;
    if (typeof name === 'string' && name) return name;
    return label;
  }
  const filename = source?.config?.filename;
  if (typeof filename === 'string' && filename) return filename;
  return `Upload ${sourceId.slice(0, 8)}`;
}

// "sales.xlsx — Sheet2" when the ingest stats carry a sheet name for this table.
export function tableDisplayName(state: OnboardingState, job: IngestionJob, table: Pick<StagedTableSummary, 'bq_table_id'>): string {
  const displayName = sourceDisplayName(state, job.source);
  const stat = (job.stats?.tables ?? []).find((t) => t.bq_table_id === table.bq_table_id);
  if (stat?.sheet) return `${displayName} — ${stat.sheet}`;
  return displayName;
}

export type IntegrationImportRollup = 'importing' | 'attention' | 'imported' | 'failed';
export interface IntegrationImportStatus {
  status: IntegrationImportRollup | null; // null = never imported this kind
  total: number; // sources of this kind
  importing: number;
  attention: number;
  imported: number;
  failed: number;
  message: string | null; // first failure message, when any source failed
}

function latestJobForSource(state: OnboardingState, sourceId: string): IngestionJob | null {
  let latest: IngestionJob | null = null;
  for (const job of state.jobs) {
    if (job.source !== sourceId) continue;
    if (!latest || Date.parse(job.created_at) > Date.parse(latest.created_at)) latest = job;
  }
  return latest;
}

// Per-source status: export failures (last_export / source.status) win, then a
// running or job-less fresh export counts as importing, then the latest job's
// phase governs. A re-export newer than the newest job is importing again —
// its callback hasn't landed yet.
function sourceImportStatus(state: OnboardingState, source: OnboardingSource): { status: IntegrationImportRollup; message: string | null } {
  const exp = source.config?.last_export;
  if (exp?.state === 'failed' || source.status === 'error') {
    return { status: 'failed', message: exp?.message || null };
  }
  if (exp?.state === 'running') return { status: 'importing', message: null };
  const job = latestJobForSource(state, source.id);
  if (!job) return { status: 'importing', message: null };
  if (exp?.state === 'succeeded' && exp.at && Date.parse(job.created_at) < Date.parse(exp.at)) {
    return { status: 'importing', message: null };
  }
  if (job.phase === 'await_map') return { status: 'attention', message: null };
  if (job.phase === 'failed') return { status: 'failed', message: job.error?.message || null };
  if (job.phase === 'done') return { status: 'imported', message: null };
  return { status: 'importing', message: null };
}

// Step-2 card rollup for one integration kind. Rollup precedence:
// importing > failed > attention > imported — the progress line wins while
// anything is in flight; failures beat attention because the Retry affordance
// lives on this card while review lives on step 4.
export function integrationImportStatus(state: OnboardingState, kind: SourceKind): IntegrationImportStatus {
  const sources = state.sources.filter((s) => s.kind === kind);
  const counts = { importing: 0, attention: 0, imported: 0, failed: 0 };
  let message: string | null = null;
  for (const source of sources) {
    const result = sourceImportStatus(state, source);
    counts[result.status] += 1;
    if (result.status === 'failed' && message === null && result.message) message = result.message;
  }
  let status: IntegrationImportRollup | null = null;
  if (counts.importing > 0) status = 'importing';
  else if (counts.failed > 0) status = 'failed';
  else if (counts.attention > 0) status = 'attention';
  else if (counts.imported > 0) status = 'imported';
  return { status, total: sources.length, ...counts, message };
}

// Integration jobs are auto-confirmed server-side and parked at
// mapping_confirmed with an empty dataform_run_id (the ingest callback cannot
// run the 10–30s Dataform trigger inside its 10s budget). The wizard fires the
// EXISTING POST /jobs/{id}/normalize/ for them; the server's dataform_run_id
// guard plus its 120s 'triggering' claim make repeated fires safe. Uploads
// never auto-fire — their confirm click triggers inline.
export function shouldAutoTriggerNormalize(
  job: Pick<IngestionJob, 'phase' | 'dataform_run_id' | 'stats'>,
  kind: SourceKind | null
): boolean {
  if (kind === null || kind === 'upload') return false;
  if (job.phase !== 'mapping_confirmed' || !!job.dataform_run_id) return false;
  return job.stats?.normalize?.state !== 'triggering';
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
