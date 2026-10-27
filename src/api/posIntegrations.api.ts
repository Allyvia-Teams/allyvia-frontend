// POS integrations API client.
//
// Types mirror backend/app/integrations/api/serializers.py and the report shape
// built by integrations/pipeline/reconcile.py. The frontend never talks to a
// POS — everything goes through these endpoints, which is what keeps provider
// credentials server-side and lets one UI serve every connector.

import axiosServices from 'utils/axios';

const BASE = '/integrations';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Provider = 'csv' | 'square' | 'shopify' | 'clover' | 'lightspeed';

export type ConnectionStatus = 'connecting' | 'active' | 'needs_reauth' | 'needs_attention' | 'disconnected';

export type ConnectionMode = 'one_time' | 'ongoing';

export type RunStatus = 'pending' | 'extracting' | 'validating' | 'awaiting_approval' | 'committing' | 'completed' | 'failed' | 'cancelled';

/** The four files a merchant can upload. Commit order, which is also FK order. */
export const CSV_ENTITIES = ['customer', 'product', 'inventory_level', 'order'] as const;
export type CsvEntity = (typeof CSV_ENTITIES)[number];

/** Display names, mirroring integrations/constants.py PROVIDER_LABELS. */
export const PROVIDER_LABELS: Record<Provider, string> = {
  csv: 'CSV / spreadsheet import',
  square: 'Square',
  shopify: 'Shopify',
  clover: 'Clover',
  lightspeed: 'Lightspeed Retail'
};

export const ENTITY_LABELS: Record<string, string> = {
  customer: 'Customers',
  product: 'Products',
  variant: 'Variants',
  inventory_level: 'Inventory',
  order: 'Orders',
  // The onboarding import's non-POS entities (backend S6).
  vendor: 'Vendors',
  employee: 'Employees',
  expense: 'Expenses'
};

export interface ProviderCard {
  provider: Provider;
  label: string;
  available: boolean;
  status: ConnectionStatus | 'available' | 'coming_soon';
  connection_id: string | null;
  supports_ongoing_sync: boolean | null;
}

export interface UploadedFile {
  filename: string | null;
  size: number | null;
  uploaded_at: string | null;
}

export interface PosConnection {
  id: string;
  provider: Provider;
  provider_label: string;
  status: ConnectionStatus;
  mode: ConnectionMode;
  external_account_id: string;
  token_expires_at: string | null;
  files: Partial<Record<CsvEntity, UploadedFile>>;
  /** `{id: name}` for an API connector's shops; empty for CSV. */
  locations: Record<string, string>;
  latest_run: MigrationRunSummary | null;
  auto_commit: boolean;
  default_currency: string;
  /** Shopify store domain, e.g. `mystore.myshopify.com`. Empty for other providers. */
  shop_domain: string;
  /** Webhook topics subscribed and the ones the provider refused; null when none were registered. */
  webhooks?: { topics: string[]; errors: Record<string, string> } | null;
  /** The daily pull and the disconnect, for the connection card. Optional so
   *  a backend without it still renders. */
  sync?: ConnectionSync;
  created_at: string;
  updated_at: string;
  latest_drift?: DriftReport | null;
}

export type PullTrigger = 'schedule' | 'manual' | 'poll' | 'disconnect';

export type PullStatus = 'succeeded' | 'failed' | 'skipped';

export interface LastPull {
  /** When the pull started. */
  at: string;
  finished_at?: string | null;
  trigger: PullTrigger;
  status: PullStatus;
  /** Why it was skipped, in plain words. */
  reason?: string | null;
  /** Why it failed, in plain words. */
  error?: string | null;
  run_id?: string | null;
  /** Entity to rows committed: customer, product, variant, inventory_level, order. */
  committed?: Record<string, number> | null;
  not_committed?: Record<string, number> | null;
  /** Rows waiting for a store mapping. */
  held?: number | null;
}

export type DisconnectState = 'pulling' | 'final_pull_failed' | 'disconnected';

export interface DisconnectProgress {
  state: DisconnectState;
  requested_at?: string | null;
  error?: string | null;
  final_pull?: { status: string; error?: string | null } | null;
  disconnected_at?: string | null;
}

/** Mirrors PosConnectionSerializer.get_sync in the backend. */
export interface ConnectionSync {
  last_pull: LastPull | null;
  last_successful_pull_at: string | null;
  /** Set while a "Pull now" is queued or running, cleared when it ends. */
  pull_requested_at: string | null;
  disconnect: DisconnectProgress | null;
  /** Years of order history the first import has staged, e.g. ["2021", "2022"]. */
  backfill_years_done: string[];
  own_app: boolean;
}

export interface DriftReport {
  id: number;
  entities: Record<string, { source: number; allyvia: number; divergence: number; over_threshold: boolean }>;
  max_divergence: number;
  over_threshold: boolean;
  error: string;
  generated_at: string;
}

export interface EntityProgress {
  extracted?: number;
  staged?: number;
  valid?: number;
  invalid?: number;
  warned?: number;
  committed?: number;
  unidentified?: number;
  duplicate_external_ids?: number;
}

export interface MigrationRunSummary {
  id: string;
  provider: Provider;
  kind: 'initial' | 'incremental' | 'webhook';
  status: RunStatus;
  progress: Record<string, EntityProgress>;
  source_totals: Record<string, { count?: number; derived?: boolean; [k: string]: unknown }>;
  blocker_count: number;
  warning_count: number;
  error: { kind?: string; message?: string };
  approved_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
}

// --- report ---------------------------------------------------------------

export type CheckStatus = 'ok' | 'warn' | 'blocker';

export interface TotalsRow {
  entity: string;
  source: number | null;
  source_derived: boolean;
  staged: number;
  valid: number;
  invalid: number;
  skipped: number;
  committed: number;
  status: CheckStatus;
  note: string;
}

export interface GrossSalesRow {
  currency: string;
  source: string | null;
  source_derived: boolean;
  staged: string;
  delta: string | null;
  status: CheckStatus;
  note: string;
}

export interface MonthlyRow {
  month: string;
  /** One row per (month, currency) since context-graph P8. Absent on a report
   *  stored before then, which was one row per month. */
  currency?: string;
  source: string | null;
  source_derived: boolean;
  staged: string;
  staged_orders: number;
  source_orders: number | null;
  delta: string | null;
  status: CheckStatus;
  /** Why the row could not be checked, e.g. a month the source reported as one
   *  number across currencies. */
  note?: string | null;
}

export interface InventoryRow {
  location: string;
  source: string | null;
  staged: string;
  delta: string | null;
  status: CheckStatus;
}

export interface IssueRollup {
  entity: string;
  code: string;
  severity: 'blocker' | 'warn';
  count: number;
  examples: Array<{ external_id: string; message: string }>;
}

export interface DuplicateGroup {
  staged_record_id: number;
  entity: string;
  external_id: string;
  match_field: string | null;
  match_value: string | null;
  existing_id: string | null;
  existing_label: string | null;
  incoming_label: string;
  proposed_action: 'merge' | 'review' | 'create';
  message: string;
}

export interface SampleRow {
  external_id: string;
  raw: unknown;
  normalized: Record<string, unknown>;
}

export interface PostCommitSection {
  checked_at: string;
  rows: Array<{ entity: string; committed: number; live: number | null; status: CheckStatus; note: string }>;
  ok: boolean;
  mismatched_entities: number;
}

export interface ReconciliationReport {
  generated_at: string;
  provider: Provider;
  run_id: string;
  totals: TotalsRow[];
  gross_sales: GrossSalesRow[];
  monthly_sales: MonthlyRow[];
  inventory: InventoryRow[];
  issues: IssueRollup[];
  duplicates: DuplicateGroup[];
  sample_audit: Record<string, SampleRow[]>;
  blockers: unknown[];
  blocker_count: number;
  warning_count: number;
  can_approve: boolean;
  notes: string[];
  post_commit?: PostCommitSection;
  committed?: Record<string, number>;
  /** What Inner Circle did after a customer or order import. Absent when it did not run. */
  inner_circle?: InnerCircleImportSummary;
}

export interface InnerCircleImportSummary {
  contacts_updated: number;
  duplicates_merged: number;
  ladder_created: boolean;
  enrolled: number;
  /** Why setup was skipped (a sentence), or how many customers it skipped. */
  skipped?: string | number | null;
  error?: string;
}

// --- mapping --------------------------------------------------------------

export type MappingSource = 'preset' | 'exact' | 'synonym' | 'duplicate' | 'unmapped';

export type DateOrder = 'mdy' | 'dmy' | 'iso' | 'ambiguous';

export interface MappingColumn {
  header: string;
  target: string;
  confidence: number;
  source: MappingSource;
  samples: string[];
}

export interface MappingProposal {
  entity: CsvEntity;
  preset: string | null;
  columns: MappingColumn[];
  date_order: DateOrder;
  date_is_ambiguous: boolean;
  date_evidence: Record<string, unknown>;
  row_sample_count: number;
  filename: string | null;
  confirmed: boolean;
}

export interface FieldOption {
  name: string;
  kind: 'str' | 'money' | 'qty' | 'bool' | 'date';
  help: string;
}

export interface MappingResponse {
  files: Partial<Record<CsvEntity, MappingProposal>>;
  fields: Record<string, FieldOption[]>;
}

// --- store mapping --------------------------------------------------------
// Mirrors ConnectionLocationsView in backend integrations/api/views.py.

export interface MappedStore {
  id: string;
  name: string;
  kind: string;
  is_default: boolean;
  is_active: boolean;
}

export interface HeldCounts {
  order: number;
  inventory_level: number;
}

export interface ProviderLocationRow {
  provider_location_id: string;
  name: string;
  meta: { address?: Record<string, string> | null; is_active?: boolean; [k: string]: unknown };
  /** False for a location the provider reports as closed. */
  is_active: boolean;
  store: MappedStore | null;
  mapping: 'auto' | 'manual' | null;
  /** The merchant chose not to import it; its rows stay held until mapped. */
  skipped: boolean;
  /** Open, no store, no "don't import": the first import will not start. */
  needs_decision: boolean;
  held: HeldCounts;
}

export interface ConnectionLocations {
  provider: Provider;
  stores: MappedStore[];
  locations: ProviderLocationRow[];
  ready: boolean;
  release_pending: boolean;
}

export type LocationChoice = { location_id: string } | { create: true; store_name?: string } | { skip: true };

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

export const listProviders = async (): Promise<ProviderCard[]> => {
  const { data } = await axiosServices.get(`${BASE}/providers/`);
  return data.providers;
};

export const listConnections = async (): Promise<PosConnection[]> => {
  const { data } = await axiosServices.get(`${BASE}/connections/`);
  return data;
};

export const getConnection = async (id: string): Promise<PosConnection> => {
  const { data } = await axiosServices.get(`${BASE}/connections/${id}/`);
  return data;
};

export const createConnection = async (payload: {
  provider: Provider;
  mode?: ConnectionMode;
  default_currency?: string;
  shop_domain?: string;
}): Promise<PosConnection> => {
  const { data } = await axiosServices.post(`${BASE}/connections/`, payload);
  return data;
};

export const updateConnection = async (
  id: string,
  payload: { mode?: ConnectionMode; auto_commit?: boolean; default_currency?: string; shop_domain?: string }
): Promise<PosConnection> => {
  const { data } = await axiosServices.patch(`${BASE}/connections/${id}/`, payload);
  return data;
};

/**
 * Disconnect. A connection kept in sync gets one final pull first, on the
 * worker: the backend answers 202 with the connection (`sync.disconnect.state`
 * is `pulling`) and the screen follows it. Otherwise it disconnects at once and
 * answers 204, which comes back as null. `finalPull: false` skips the pull.
 */
export const disconnect = async (id: string, { finalPull = true }: { finalPull?: boolean } = {}): Promise<PosConnection | null> => {
  const response = await axiosServices.delete(`${BASE}/connections/${id}/`, {
    params: finalPull ? undefined : { final_pull: 0 }
  });
  return response.status === 204 || !response.data ? null : response.data;
};

/** "Pull now": the daily pull, on demand. 202 with the connection. */
export const pullNow = async (id: string): Promise<PosConnection> => {
  const { data } = await axiosServices.post(`${BASE}/connections/${id}/pull/`, {});
  return data;
};

/**
 * Start an OAuth connect. Returns the provider's consent URL, already carrying
 * a signed, short-lived state minted by the backend.
 *
 * The browser never talks to the provider's token endpoint and never sees a
 * token: it carries a code back to `completeOAuth`, which exchanges it
 * server-side. That is what keeps a merchant's credentials out of a page.
 */
export const authorizeConnection = async (id: string, redirectUri: string): Promise<{ authorize_url: string }> => {
  const { data } = await axiosServices.post(`${BASE}/connections/${id}/authorize/`, { redirect_uri: redirectUri });
  return data;
};

/** Finish an OAuth connect with the code and state the provider redirected back. */
export const completeOAuth = async (payload: { provider: Provider; code: string; state: string }): Promise<PosConnection> => {
  const { data } = await axiosServices.post(`${BASE}/oauth/callback/`, payload);
  return data;
};

/** Multipart upload, one file per entity key. */
export const uploadFiles = async (
  id: string,
  files: Partial<Record<CsvEntity, File>>
): Promise<{ saved: Record<string, string>; errors: Record<string, string> }> => {
  const form = new FormData();
  Object.entries(files).forEach(([entity, file]) => {
    if (file) form.append(entity, file);
  });
  const { data } = await axiosServices.post(`${BASE}/connections/${id}/upload/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return data;
};

export const getMapping = async (id: string): Promise<MappingResponse> => {
  const { data } = await axiosServices.get(`${BASE}/connections/${id}/mapping/`);
  return data;
};

export const confirmMapping = async (
  id: string,
  payload: { entity: CsvEntity; targets: Record<string, string>; date_order: DateOrder }
): Promise<void> => {
  await axiosServices.put(`${BASE}/connections/${id}/mapping/`, payload);
};

export const getLocations = async (id: string, refresh = false): Promise<ConnectionLocations> => {
  const { data } = await axiosServices.get(`${BASE}/connections/${id}/locations/`, {
    params: refresh ? { refresh: 1 } : undefined
  });
  return data;
};

export const mapLocation = async (
  id: string,
  payload: { provider_location_id: string } & LocationChoice
): Promise<{ store: MappedStore | null; skipped?: boolean; release: Record<string, unknown> }> => {
  const { data } = await axiosServices.post(`${BASE}/connections/${id}/locations/map/`, payload);
  return data;
};

export const startRun = async (id: string): Promise<MigrationRunSummary> => {
  const { data } = await axiosServices.post(`${BASE}/connections/${id}/runs/`, {});
  return data;
};

export const listRuns = async (connectionId?: string): Promise<MigrationRunSummary[]> => {
  const { data } = await axiosServices.get(`${BASE}/runs/`, {
    params: connectionId ? { connection: connectionId } : undefined
  });
  return data;
};

export const getRun = async (runId: string): Promise<MigrationRunSummary> => {
  const { data } = await axiosServices.get(`${BASE}/runs/${runId}/`);
  return data;
};

export const getReport = async (runId: string): Promise<ReconciliationReport> => {
  const { data } = await axiosServices.get(`${BASE}/runs/${runId}/report/`);
  return data;
};

export const approveRun = async (runId: string): Promise<MigrationRunSummary> => {
  const { data } = await axiosServices.post(`${BASE}/runs/${runId}/approve/`, {});
  return data;
};

export const cancelRun = async (runId: string): Promise<MigrationRunSummary> => {
  const { data } = await axiosServices.post(`${BASE}/runs/${runId}/cancel/`, {});
  return data;
};

export const resolveDuplicates = async (
  runId: string,
  decisions: Array<{ staged_record_id: number; action: 'merge' | 'create' }>
): Promise<{ updated: number; report: ReconciliationReport }> => {
  const { data } = await axiosServices.post(`${BASE}/runs/${runId}/duplicates/`, { decisions });
  return data;
};

export const skipInvalid = async (runId: string, entity?: string): Promise<{ skipped: number; report: ReconciliationReport }> => {
  const { data } = await axiosServices.post(`${BASE}/runs/${runId}/skip-invalid/`, entity ? { entity } : {});
  return data;
};
