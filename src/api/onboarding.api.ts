import axios from 'axios';
import axiosServices from 'utils/axios';

const BASE = '/onboarding';

// ---------------------------------------------------------------------------
// Types — mirror backend/app/onboarding/serializers.py verbatim.
// ---------------------------------------------------------------------------

export type IngestPhase = 'landed' | 'ingesting' | 'await_map' | 'mapping_confirmed' | 'normalizing' | 'done' | 'failed';
export type JobErrorKind = 'auth' | 'validation' | 'convert' | 'load' | 'dataform' | 'assertion' | 'internal';
export interface JobError {
  kind: JobErrorKind;
  message: string;
}

export type SourceKind = 'upload' | 'square' | 'quickbooks' | 'google_drive' | 'stripe';
// Kinds whose POST /sources/ runs the synchronous per-entity export fan-out.
export type IntegrationKind = 'square' | 'quickbooks' | 'stripe';
export type SourceStatus = 'pending' | 'active' | 'error' | 'disabled';

// Export outcome recorded on the source by the control plane (integration and
// Drive kinds only). 'running' carries claimed_at; the terminal states carry at.
export interface SourceLastExport {
  state: 'running' | 'succeeded' | 'failed';
  at?: string;
  claimed_at?: string;
  generation?: string;
  row_count?: number;
  message?: string;
}

export interface OnboardingSource {
  id: string;
  kind: SourceKind;
  status: SourceStatus;
  config: {
    filename?: string; // upload
    entity?: string; // square/quickbooks/stripe — one source per (kind, entity)
    file_id?: string; // google_drive — one source per picked file
    name?: string; // google_drive display name
    mime_type?: string; // google_drive
    last_export?: SourceLastExport;
    [k: string]: unknown;
  };
  created_at: string;
  updated_at: string;
}

export type IntegrationEntityStatus = 'exported' | 'failed' | 'in_flight';
export interface IntegrationEntityResult {
  source_id: string;
  entity: string;
  object_path?: string;
  status: IntegrationEntityStatus;
  row_count?: number;
  message?: string;
}
// 201 body of POST /sources/ for non-upload kinds. Carries NO job_id — the
// ingest callback stays the sole IngestionJob creator; jobs appear via /state/.
export interface IntegrationImportResult {
  kind: SourceKind;
  results: IntegrationEntityResult[];
}

export interface DriveFile {
  id: string;
  name: string;
  mime_type: string;
  size: number | null;
  modified_at: string | null;
  web_url: string | null;
}
export interface DriveFileList {
  files: DriveFile[];
  next_page_token: string;
}

export interface IngestTableStat {
  bq_table_id: string;
  sheet?: string | null;
  row_count?: number;
  bq_load_job_id?: string;
  source_uri?: string;
}
export interface NormalizeStats {
  state: 'triggering' | 'running' | 'succeeded' | 'failed' | 'cancelled' | 'trigger_failed';
  invocation_state?: string;
  actions?: { succeeded: number; failed: number; skipped: number; disabled: number; cancelled: number; total: number };
  failed_actions?: Array<{ target: string; failure_reason: string }>; // capped at 20
  last_polled_at?: string;
  finished_at?: string;
  poll_error?: string;
}
export interface JobStats {
  object?: Record<string, unknown>;
  tables?: IngestTableStat[];
  load_job_ids?: string[];
  row_counts?: number[];
  table_count?: number;
  total_rows?: number;
  finished_at?: string;
  normalize?: NormalizeStats;
  [k: string]: unknown;
}
export interface IngestionJob {
  id: string;
  source: string; // bare UUID; join filename client-side via sources[].config.filename
  phase: IngestPhase;
  bq_load_job_id: string;
  dataform_run_id: string;
  stats: JobStats;
  error: JobError | null;
  created_at: string;
  updated_at: string;
}
export interface OnboardingState {
  sources: OnboardingSource[];
  jobs: IngestionJob[];
  phases: Record<IngestPhase, number>; // all 7 keys always present, zeroed
}

export interface UploadTicket {
  source_id: string;
  upload_url: string;
  required_headers: Record<string, string>; // echo VERBATIM on the PUT
  object_path: string;
  expires_at: string;
}

export interface BQSchemaField {
  name: string;
  type: string; // LEGACY names (INTEGER/FLOAT/BOOLEAN/...)
  mode?: string;
}
export type ProposalStatus = 'proposed' | 'confirmed' | 'rejected';
export interface StagedTableSummary {
  id: string;
  job: string;
  bq_table_id: string;
  autodetected_schema: BQSchemaField[];
  row_count: number;
  inferred_entity: string;
  proposal_id: string | null;
  proposal_status: ProposalStatus | null;
  created_at: string;
  updated_at: string;
}
export interface IngestionJobDetail extends IngestionJob {
  staged_tables: StagedTableSummary[];
}

export interface StagedTablePreview {
  id: string;
  bq_table_id: string;
  row_count: number;
  inferred_entity: string;
  autodetected_schema: BQSchemaField[];
  rows: Array<Record<string, unknown>>; // ≤ 20
}

export type MappingSource = 'deterministic' | 'gemini' | 'manual' | 'memory';
export interface FieldMappingEntry {
  target: string;
  confidence: number | null;
  source: MappingSource;
}
export type FieldMappings = Record<string, FieldMappingEntry>;
export type TransformMap = Record<string, string[]>;
export interface MappingProposal {
  id: string;
  staged_table: string;
  proposed_entity: string;
  confidence: number | null;
  field_mappings: FieldMappings;
  transforms: TransformMap;
  status: ProposalStatus;
  confirmed_by: string | null;
  generated_sqlx: string;
  confirmed_at: string | null;
  created_at: string;
  updated_at: string;
}
export interface ProposalPatch {
  proposed_entity?: string;
  field_mappings?: FieldMappings;
  transforms?: TransformMap;
}
export interface MappingValidationDetail {
  error: string;
  detail: Record<string, string>; // 400 body of PATCH/confirm
}

export interface RejectedRowsResponse {
  id: string;
  bq_table_id: string;
  quarantine_table: string;
  rows: Array<Record<string, unknown>>; // ≤ 100; each has reject_reasons: string[]
  total: number;
  reasons_summary: Record<string, number>;
}

export interface RegistryField {
  name: string;
  type: string;
  aliases: string[];
  validator: string;
  description: string;
  required: boolean;
}
export interface RegistryEntity {
  name: string;
  description: string;
  fields: RegistryField[];
}
export interface OnboardingRegistry {
  entities: Record<string, RegistryEntity>;
  sentinel_targets: string[]; // ['extra', 'semantic_only']
  transform_ops: string[];
  legacy_type_map: Record<string, string>;
}

// ---------------------------------------------------------------------------
// Endpoint functions
// ---------------------------------------------------------------------------

export const getOnboardingState = async (): Promise<OnboardingState> => {
  const response = await axiosServices.get(`${BASE}/state/`);
  return response.data;
};

export const getOnboardingRegistry = async (): Promise<OnboardingRegistry> => {
  const response = await axiosServices.get(`${BASE}/registry/`);
  return response.data;
};

// content_type is ALWAYS sent so Content-Type is always signed into required_headers.
export const createUploadSource = async (filename: string, contentType: string): Promise<UploadTicket> => {
  const response = await axiosServices.post(`${BASE}/sources/`, { kind: 'upload', filename, content_type: contentType });
  return response.data;
};

// TTL re-ticket; same object_path.
export const reissueUploadTicket = async (sourceId: string): Promise<UploadTicket> => {
  const response = await axiosServices.post(`${BASE}/sources/${sourceId}/ingest/`);
  return response.data;
};

// Synchronous per-entity export fan-out for a connected integration.
// 201 when ≥1 entity exported; 409 {"error": "Connect X before importing."}
// when the integration isn't connected; 502 when every entity failed.
export const createIntegrationSource = async (kind: IntegrationKind): Promise<IntegrationImportResult> => {
  const response = await axiosServices.post(`${BASE}/sources/`, { kind });
  return response.data;
};

// Per-file Drive import; response has exactly one results[] entry. Re-picking
// the same file reuses its source (same object path, new generation).
export const createDriveSource = async (fileId: string, name: string, mimeType: string): Promise<IntegrationImportResult> => {
  const response = await axiosServices.post(`${BASE}/sources/`, {
    kind: 'google_drive',
    file_id: fileId,
    name,
    mime_type: mimeType
  });
  return response.data;
};

// Mime-filtered spreadsheet listing for the Drive picker. 409 when Drive is
// not connected; 502 on Drive API failure.
export const listDriveFiles = async (q?: string, pageToken?: string): Promise<DriveFileList> => {
  const params: Record<string, string> = {};
  if (q) params.q = q;
  if (pageToken) params.page_token = pageToken;
  const response = await axiosServices.get(`${BASE}/drive/files/`, { params });
  return response.data;
};

export const getJob = async (jobId: string): Promise<IngestionJobDetail> => {
  const response = await axiosServices.get(`${BASE}/jobs/${jobId}/`);
  return response.data;
};

// Retry-only path: 409 when not retriggerable, 502 when the trigger re-fails.
export const retryNormalize = async (jobId: string): Promise<IngestionJobDetail> => {
  const response = await axiosServices.post(`${BASE}/jobs/${jobId}/normalize/`);
  return response.data;
};

export const getStagedTablePreview = async (stagedTableId: string): Promise<StagedTablePreview> => {
  const response = await axiosServices.get(`${BASE}/staged-tables/${stagedTableId}/preview/`);
  return response.data;
};

// 201 first call, 200 thereafter; idempotent — never regenerates.
export const proposeMapping = async (stagedTableId: string): Promise<MappingProposal> => {
  const response = await axiosServices.post(`${BASE}/staged-tables/${stagedTableId}/propose/`);
  return response.data;
};

export const getProposal = async (proposalId: string): Promise<MappingProposal> => {
  const response = await axiosServices.get(`${BASE}/proposals/${proposalId}/`);
  return response.data;
};

export const updateProposal = async (proposalId: string, patch: ProposalPatch): Promise<MappingProposal> => {
  const response = await axiosServices.patch(`${BASE}/proposals/${proposalId}/`, patch);
  return response.data;
};

export const confirmProposal = async (proposalId: string): Promise<MappingProposal> => {
  const response = await axiosServices.post(`${BASE}/proposals/${proposalId}/confirm/`);
  return response.data;
};

export const getRejectedRows = async (stagedTableId: string): Promise<RejectedRowsResponse> => {
  const response = await axiosServices.get(`${BASE}/staged-tables/${stagedTableId}/rejected/`);
  return response.data;
};

// ---------------------------------------------------------------------------
// GCS PUT — deliberately NOT axiosServices: the interceptor's Authorization
// header makes GCS prefer header auth over the query signature (403) and
// withCredentials breaks CORS (GCS never returns Access-Control-Allow-Credentials).
// ---------------------------------------------------------------------------

const gcsClient = axios.create(); // bare: no interceptors, withCredentials false by default

export const uploadToGcs = async (ticket: UploadTicket, file: File, onProgress?: (pct: number) => void): Promise<void> => {
  await gcsClient.put(ticket.upload_url, file, {
    headers: { ...ticket.required_headers }, // verbatim echo — includes Content-Type because we always send content_type on POST
    onUploadProgress: (e) => {
      if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total));
    }
  });
};
