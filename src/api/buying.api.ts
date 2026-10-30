// The buy planner (Inventory › Plan, buy planner B9): the backend's `/api/v1/buy/` routes.
//
// Types mirror backend/app/buying (plan_views.py plan_payload / line_payload / run_payload / file_payload,
// memo.py compose / _card / live / shared_payload, chat.py Answer and its cards, order.py preview). Money and
// ratios are decimal strings, as the backend sends them; nothing here converts or rounds them.
//
// Every authed call takes the store scope: `X-Location-Id` is the only store signal these routes read, so a
// call made from a store's view carries that store (and a call made with none is the company view, or a
// list-grant role's first store: the response's `scope` says which).

import rawAxios, { type AxiosProgressEvent } from 'axios';

import axiosServices from 'utils/axios';

import type { TraceNode, TraceValue } from './agentTrace.api';

const BASE = '/buy';

/** A chat turn may take the server 60 s (B6's `BUY_CHAT_MAX_SECONDS`); the shared instance gives up at 20 s. */
export const ASK_TIMEOUT_MS = 75 * 1000;
/** Placing an order and writing a PDF can outlast the shared 20 s. */
export const SLOW_TIMEOUT_MS = 60 * 1000;
/** A drop is up to 30 MiB of files. */
export const DROP_TIMEOUT_MS = 10 * 60 * 1000;

export type PlanStatus = 'draft' | 'open' | 'frozen' | 'ordered' | 'closed' | 'cancelled';
export type RunStatus = 'idle' | 'queued' | 'running' | 'done' | 'failed' | 'stale';
export type RunStep = '' | 'reading_catalog' | 'encoding' | 'matching' | 'carrying' | 'sizing' | 'composing';

export type Scope = { scope: 'company'; location: null } | { scope: 'location'; location: { id: string; name: string } };

export interface Run {
  status: RunStatus;
  step: RunStep;
  started_at: string | null;
  finished_at: string | null;
  error: string;
}

export interface PlanSummary {
  id: string;
  name: string;
  season_label: string;
  location: { id: string; name: string };
  target_date: string;
  window_start: string;
  window_end: string;
  target_sell_through: string;
  sell_through_basis: string;
  budget_cost: string | null;
  status: PlanStatus;
  note: string;
  run: Run;
  created_at: string;
}

export interface IntakeFile {
  id: string;
  filename: string;
  format: 'csv' | 'xlsx' | 'pdf' | 'image' | 'unknown';
  status: 'pending' | 'read' | 'refused' | 'failed';
  reason: string;
  lines_created: number;
  lines_merged: number;
  images_attached: number;
  parked: { page: number; reason: string }[];
  warnings: string[];
  ambiguous_price_column: string | null;
  price_means: '' | 'retail' | 'wholesale';
  created_at: string;
  read_at: string | null;
}

export interface LineImage {
  id: string;
  url: string;
  thumb_url: string;
  width: number;
  height: number;
  page: number | null;
  position: number;
}

export type RevisionStatus = 'recommended' | 'hold' | 'insufficient' | 'cut' | 'flagged' | 'cleared';

export interface LineRevision {
  revision: number;
  as_of: string;
  suggested_qty: number | null;
  low_qty: number | null;
  high_qty: number | null;
  by_size: Record<string, number>;
  status: RevisionStatus;
  flags: string[];
  trace_id: string;
  built_at: string;
  cut_from: number | null;
  cut_sentence: string | null;
}

export interface Decision {
  owner_qty: number;
  by_size: Record<string, number> | null;
  note: string;
  via: 'memo' | 'chat';
  decided_by_email: string;
  decided_at: string | null;
  against: { revision: number | null; qty: number | null; trace_id: string | null };
  moved: boolean;
  moved_sentence: string | null;
}

export interface Line {
  id: string;
  position: number;
  source: 'upload' | 'typed' | 'carried_forward' | 'pdf' | 'image' | 'catalogue';
  name: string;
  category: string;
  category_key: string;
  brand: string;
  sizes: string[];
  intended_price: string | null;
  cost: string | null;
  needs_price: boolean;
  supplier_id: string | null;
  style_code_hint: string;
  product_id: string | null;
  link_source: 'none' | 'po' | 'receipt_match' | 'owner' | 'planner';
  excluded: boolean;
  excluded_at: string | null;
  purchase_order_id: string | null;
  flags: string[];
  images: LineImage[];
  picture: string | null;
  revision: LineRevision | null;
  decision: Decision | null;
  qty_used: number | null;
  used_source: 'owner' | 'planner' | 'none';
}

export interface Tree {
  root: string;
  nodes: Record<string, TraceNode>;
}

export interface PlanDetail extends PlanSummary {
  lines: Line[];
  needs_price: { id: string; name: string }[];
  files: IntakeFile[];
  parked: { file: string; page: number; reason: string }[];
  summary: Tree | null;
}

// ---------------------------------------------------------------------------
// The memo (memo.py compose / _card / live)
// ---------------------------------------------------------------------------

export type ChunkRef = { trace_id: string; key: string } | { tree: 'memo' | 'summary'; key: string };

export interface Chunk {
  ref: ChunkRef;
  sentence: string | null;
  value: TraceValue | null;
  split?: Record<string, number> | null;
}

export interface MemoCard {
  line_id: string;
  position: number;
  name: string;
  brand: string;
  category_key: string;
  picture: string | null;
  chips: { taxonomy: string[]; attributes: Record<string, string | string[]>; colours: { family: string | null; raw: string | null }[] };
  sizes: string[];
  status: 'needs_price' | 'unsized' | 'insufficient' | RevisionStatus;
  flags: string[];
  number: Chunk | null;
  split: Chunk | null;
  price: Chunk | null;
  fit: Chunk | null;
  notes: Chunk[];
  cut: Chunk | null;
  decision: Chunk | null;
  note: string;
  moved: Chunk | null;
  owner: Chunk[];
}

export type MemoSection =
  | { kind: 'cover'; cover: Chunk | null; basis: Chunk | null }
  | { kind: 'totals'; figures: Chunk[]; expected_margin: Chunk | null }
  | { kind: 'months'; root: Chunk | null; rows: { row: Chunk | null; details: (Chunk | null)[] }[] }
  | { kind: 'items'; cards: MemoCard[] }
  | { kind: 'carried'; cards: MemoCard[] }
  | { kind: 'excluded'; lines: { line_id: string; name: string; excluded_at: string | null }[] }
  | { kind: 'caveats'; items: (Chunk | null)[] }
  | { kind: 'notes'; plan_note: string; lines: { line_id: string; name: string; note: string }[] };

export interface Memo {
  version: number;
  audience: 'owner';
  as_of: string | null;
  plan: {
    id: string;
    name: string;
    season_label: string;
    store: { id: string; name: string };
    target_date: string;
    window_start: string;
    window_end: string;
  };
  trees: { summary: Tree | null; memo: Tree | null };
  sections: MemoSection[];
}

export interface Live {
  status: PlanStatus;
  frozen_at: string | null;
  run: Run;
  orders: { line_id: string; po_number: string; po_status: string }[];
  matches: { line_id: string; product_id: string; rule: string; sentence: string; unlink: string }[];
  waiting: string | null;
  actions: { decide: boolean; edit: boolean; share: boolean; link: boolean };
}

export interface MemoResponse {
  frozen: boolean;
  memo: Memo;
  live: Live;
  posture: Tree | null;
}

// The shared projection (memo.py shared_payload): another shape, on purpose.
export interface SharedFigure {
  amount: string | null;
  unit: string;
  low: string | null;
  high: string | null;
}

export interface SharedCard {
  name: string;
  brand: string;
  picture: string | null;
  chips: MemoCard['chips'];
  sizes: string[];
  number: SharedFigure | null;
  split: Record<string, number> | null;
  why: string | null;
  status: 'recommended' | 'hold' | 'flagged' | 'insufficient' | 'needs_price' | 'unsized' | 'cleared' | null;
  flags: string[];
  fit: 'fits' | 'stretch' | 'no_signal' | null;
}

export interface SharedMemo {
  version: number;
  audience: 'shared';
  as_of: string | null;
  plan: { name: string; season_label: string; store: string; target_date: string; window_start: string; window_end: string };
  cover: string | null;
  basis: string | null;
  totals: { units: SharedFigure | null; expected_revenue: SharedFigure | null };
  months: {
    sentence: string | null;
    value: SharedFigure | null;
    rows: { sentence: string | null; value: SharedFigure | null; details: (string | null)[] }[];
  };
  items: SharedCard[];
  carried: SharedCard[];
  caveats: (string | null)[];
}

// ---------------------------------------------------------------------------
// Versions, shares, the order, the chat
// ---------------------------------------------------------------------------

export type VersionKind = 'revision' | 'months' | 'file' | 'decision' | 'link' | 'excluded' | 'review' | 'frozen';

export interface VersionEntry {
  at: string;
  kind: VersionKind;
  sentence: string;
  line_id?: string;
  revision?: number;
}

export interface VersionDiff {
  changed: { key: string; field: string; before: unknown; after: unknown }[];
  added: string[];
  removed: string[];
}

export interface VersionsPage {
  entries: VersionEntry[];
  page: number;
  pages: number;
  count: number;
  diff?: VersionDiff | null;
}

export interface Share {
  id: string;
  prefix: string;
  created_by_email: string;
  created_at: string;
  expires_at: string;
  revoked_at: string | null;
}

export interface OrderPreview {
  stale: boolean;
  refused: null | { code: 'closed' | 'busy' | 'stale'; sentence: string };
  groups: {
    supplier_id: string;
    supplier: string;
    units: number;
    cost: string;
    lines: {
      line_id: string;
      name: string;
      units: number;
      unit_cost: string;
      by_size: Record<string, number>;
      creates_style: boolean;
      reuses: 'style_code' | 'sibling_plan' | null;
      style: string | null;
      colour_split: string | null;
    }[];
  }[];
  skipped: { line_id: string; name: string; sentence: string }[];
  ordered: { line_id: string; name: string; po_number: string; po_id: string; po_status: string }[];
  purchase_orders: { id: string; po_number: string; status: string; supplier: string; lines: number }[];
  drift: { line_id: string; name: string; po_number: string; kind: 'store' | 'excluded' | 'qty'; sentence: string }[];
}

export interface OrderResult {
  placed: { line_id: string; name: string; state: string; po_number: string; po_id: string; created_style: boolean; sentence: string }[];
  skipped: { line_id: string; name?: string; state: string; sentence: string }[];
  stopped: string | null;
  order: OrderPreview;
}

export type ContextEntry = { line_id: string } | { trace_id: string; key: string };

export type Citation = { trace_id: string; key: string } | { line_id: string; field: string } | { message_id: string };

export interface ConfirmCall {
  method: 'PUT' | 'PATCH' | 'POST' | 'DELETE';
  path: string;
  body: Record<string, unknown>;
}

export interface ChatCard {
  kind: 'decision' | 'exclude' | 'include' | 'rerun' | 'whatif';
  line_id: string | null;
  line: string | null;
  sentence: string;
  before: Record<string, unknown>;
  after: Record<string, unknown>;
  confirm: ConfirmCall | null;
  /** A what-if card only. */
  overrides?: Record<string, unknown>;
  trace_id?: string;
  record?: null | { sentence: string; confirm: ConfirmCall };
}

export interface Answer {
  answer: string;
  citations: Citation[];
  proposals: ChatCard[];
  quick_replies: string[];
  conversation_id: string;
  message_id: string;
  refused: boolean;
}

// ---------------------------------------------------------------------------
// Calls
// ---------------------------------------------------------------------------

const scoped = (locationId?: string | null) => (locationId ? { headers: { 'X-Location-Id': locationId } } : {});

export const listPlans = async (locationId?: string | null): Promise<Scope & { plans: PlanSummary[] }> => {
  const { data } = await axiosServices.get(`${BASE}/plans/`, scoped(locationId));
  return data;
};

export interface NewPlan {
  name: string;
  target_date: string;
  location?: string;
  window_start?: string;
  window_end?: string;
  budget_cost?: string;
}

export const createPlan = async (payload: NewPlan, locationId?: string | null): Promise<Scope & { plans: PlanSummary[] }> => {
  const { data } = await axiosServices.post(`${BASE}/plans/`, payload, scoped(locationId));
  return data;
};

export const getPlan = async (planId: string, locationId?: string | null): Promise<Scope & { plan: PlanDetail }> => {
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/`, scoped(locationId));
  return data;
};

export const startRun = async (planId: string, locationId?: string | null): Promise<Scope & { run: Run }> => {
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/run/`, {}, scoped(locationId));
  return data;
};

export interface DropResult {
  files: IntakeFile[];
  refused: { file: string; reason: string }[];
  run: Run & { queued: boolean };
}

export const dropFiles = async (
  planId: string,
  files: File[],
  locationId?: string | null,
  onUploadProgress?: (event: AxiosProgressEvent) => void
): Promise<DropResult> => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/intake/`, form, {
    ...scoped(locationId),
    headers: { ...(locationId ? { 'X-Location-Id': locationId } : {}), 'Content-Type': 'multipart/form-data' },
    timeout: DROP_TIMEOUT_MS,
    onUploadProgress,
    // A drop of which nothing was kept is a 400 that still carries each refusal: the page says them.
    validateStatus: (status) => status === 201 || status === 400
  });
  return data;
};

export const answerPriceColumn = async (
  planId: string,
  fileId: string,
  priceMeans: 'retail' | 'wholesale',
  locationId?: string | null
): Promise<DropResult> => {
  const { data } = await axiosServices.post(
    `${BASE}/plans/${planId}/intake/`,
    { file_id: fileId, price_means: priceMeans },
    scoped(locationId)
  );
  return data;
};

export const addCatalogueStyles = async (planId: string, productIds: string[], locationId?: string | null): Promise<{ lines: Line[] }> => {
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/lines/`, { product_ids: productIds }, scoped(locationId));
  return data;
};

export const patchLine = async (
  planId: string,
  lineId: string,
  fields: { excluded?: boolean; intended_price?: string },
  locationId?: string | null
): Promise<{ line: Line }> => {
  const { data } = await axiosServices.patch(`${BASE}/plans/${planId}/lines/${lineId}/`, fields, scoped(locationId));
  return data;
};

export interface DecisionBody {
  owner_qty: number;
  against_revision: number | null;
  note: string;
  via: 'memo';
}

export const recordDecision = async (
  planId: string,
  lineId: string,
  body: DecisionBody,
  locationId?: string | null
): Promise<{ line: Line; recorded: boolean }> => {
  const { data } = await axiosServices.put(`${BASE}/plans/${planId}/lines/${lineId}/decision/`, body, scoped(locationId));
  return data;
};

export const clearDecision = async (planId: string, lineId: string, locationId?: string | null): Promise<{ line: Line }> => {
  const { data } = await axiosServices.delete(`${BASE}/plans/${planId}/lines/${lineId}/decision/`, scoped(locationId));
  return data;
};

export const getMemo = async (planId: string, locationId?: string | null): Promise<Scope & MemoResponse> => {
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/memo/`, scoped(locationId));
  return data;
};

export const getMemoPdf = async (planId: string, locationId?: string | null): Promise<Blob> => {
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/memo.pdf`, {
    ...scoped(locationId),
    responseType: 'blob',
    timeout: SLOW_TIMEOUT_MS
  });
  return data;
};

export const getVersions = async (
  planId: string,
  page: number,
  locationId?: string | null,
  diffFor?: { line: string; revision: number }
): Promise<VersionsPage> => {
  const params: Record<string, string | number> = { page };
  if (diffFor) {
    params.line = diffFor.line;
    params.revision = diffFor.revision;
  }
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/versions/`, { ...scoped(locationId), params });
  return data;
};

export const listShares = async (planId: string, locationId?: string | null): Promise<{ shares: Share[] }> => {
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/share/`, scoped(locationId));
  return data;
};

export const createShare = async (
  planId: string,
  locationId?: string | null
): Promise<{ share: Share & { token: string; path: string } }> => {
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/share/`, {}, scoped(locationId));
  return data;
};

export const revokeShare = async (planId: string, shareId: string, locationId?: string | null): Promise<void> => {
  await axiosServices.delete(`${BASE}/plans/${planId}/share/${shareId}/`, scoped(locationId));
};

export const getOrderPreview = async (planId: string, locationId?: string | null): Promise<{ order: OrderPreview }> => {
  const { data } = await axiosServices.get(`${BASE}/plans/${planId}/order/`, scoped(locationId));
  return data;
};

export const placeOrder = async (planId: string, locationId?: string | null): Promise<OrderResult> => {
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/order/`, {}, { ...scoped(locationId), timeout: SLOW_TIMEOUT_MS });
  return data;
};

/** `GET ask/`: whether the assistant is on here (a 404 means the environment's kill switch is off). */
export const probeChat = async (planId: string, locationId?: string | null): Promise<void> => {
  await axiosServices.get(`${BASE}/plans/${planId}/ask/`, scoped(locationId));
};

export const ask = async (
  planId: string,
  payload: { message: string; context: ContextEntry[]; conversation_id?: string },
  locationId?: string | null
): Promise<Answer> => {
  const { data } = await axiosServices.post(`${BASE}/plans/${planId}/ask/`, payload, { ...scoped(locationId), timeout: ASK_TIMEOUT_MS });
  return data;
};

/** A confirm card's own call, exactly as the server wrote it (only her note filled in), relative to the API base. */
export const runConfirm = async (
  call: { method: ConfirmCall['method']; url: string; data: Record<string, unknown> },
  locationId?: string | null
) => {
  const { data } = await axiosServices.request({ method: call.method, url: call.url, data: call.data, ...scoped(locationId) });
  return data;
};

// ---------------------------------------------------------------------------
// The share link's public routes: a clean client, never the app's role or token.
// ---------------------------------------------------------------------------

const publicClient = rawAxios.create({ baseURL: import.meta.env.VITE_APP_API_URL || 'http://localhost:8000/api/v1/', timeout: 20000 });

export const getSharedMemo = async (token: string): Promise<SharedMemo> => {
  const { data } = await publicClient.get(`${BASE}/shared/${encodeURIComponent(token)}/`);
  return data;
};
