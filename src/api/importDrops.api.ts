// The file front door: bulk drops (context-graph P1a/P1b).
//
// Types mirror backend/app/integrations/front_door_service.py::payload. One
// drop takes N files or zips; each file is routed to the direct CSV lane or the
// onboarding lane with a one-sentence reason, and the drop is approved ONCE for
// both lanes (the onboarding lane imports per company, so its run is the
// company's; `report.also_in_onboarding_run` names what else is in it).

import type { AxiosProgressEvent } from 'axios';

import axiosServices from 'utils/axios';

import type { ReconciliationReport } from './posIntegrations.api';

const BASE = '/integrations';

/** A drop can be hundreds of MB; the shared instance's 20 s would cut it off. */
export const DROP_UPLOAD_TIMEOUT_MS = 10 * 60 * 1000;

export type DropLane = 'integrations' | 'onboarding';

export type DropStatus = 'receiving' | 'classified' | 'staging' | 'awaiting_approval' | 'committing' | 'completed' | 'failed';

export type DropFileStatus = 'classified' | 'parked' | 'sent' | 'staged' | 'committed' | 'refused' | 'failed';

export type LaneState = 'none' | 'waiting' | 'ready' | 'blocked' | 'importing' | 'imported' | 'failed';

export interface DropFileOnboarding {
  source_id: string;
  job_id: string | null;
  phase: string;
  needs_mapping: boolean;
}

export interface DropFile {
  id: string;
  name: string;
  member: string;
  size: number;
  lane: DropLane;
  entity: string;
  confidence: number | null;
  reason: string;
  ambiguous_dates: boolean;
  overridden: boolean;
  status: DropFileStatus;
  onboarding: DropFileOnboarding | null;
}

export interface HeldLocation {
  kind: string;
  value: string;
  label: string;
  order: number;
  inventory_level: number;
}

export interface OutsideSource {
  source_id: string;
  filename: string;
}

export interface DropReport {
  direct: ReconciliationReport | null;
  onboarding: ReconciliationReport | null;
  also_in_onboarding_run: OutsideSource[];
}

export interface BulkDrop {
  id: string;
  status: DropStatus;
  created_at: string;
  created_by_email: string;
  default_location_id: string | null;
  timezone: string;
  connection_id: string | null;
  run_id: string | null;
  waiting: string;
  lanes: Record<DropLane, number>;
  lane_state: { direct: LaneState; onboarding: LaneState; onboarding_reason: string };
  can_approve: boolean;
  files: DropFile[];
  report: DropReport;
  held_locations: HeldLocation[];
}

export interface DropSummary {
  id: string;
  status: DropStatus;
  created_at: string;
  files: number;
}

export interface StoreOption {
  id: string;
  name: string;
  kind: string;
  is_default: boolean;
  is_active: boolean;
}

export interface CreateDropOptions {
  defaultLocationId?: string;
  timezone?: string;
  onUploadProgress?: (event: AxiosProgressEvent) => void;
}

export const createDrop = async (files: File[], options: CreateDropOptions = {}): Promise<BulkDrop> => {
  const form = new FormData();
  files.forEach((file) => form.append('files', file));
  if (options.defaultLocationId) form.append('default_location_id', options.defaultLocationId);
  if (options.timezone) form.append('timezone', options.timezone);
  const { data } = await axiosServices.post(`${BASE}/drops/`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: DROP_UPLOAD_TIMEOUT_MS,
    onUploadProgress: options.onUploadProgress,
    // A drop refused whole (every file an identical re-drop) is a 409 that
    // still carries the drop — the page shows it rather than an error.
    validateStatus: (status) => status === 201 || status === 409
  });
  return data;
};

export const listDrops = async (): Promise<DropSummary[]> => {
  const { data } = await axiosServices.get(`${BASE}/drops/`);
  return data.results;
};

export const getDrop = async (id: string): Promise<BulkDrop> => {
  const { data } = await axiosServices.get(`${BASE}/drops/${id}/`);
  return data;
};

export const stageDrop = async (id: string): Promise<BulkDrop> => {
  const { data } = await axiosServices.post(`${BASE}/drops/${id}/stage/`);
  return data;
};

export const approveDrop = async (id: string): Promise<BulkDrop> => {
  const { data } = await axiosServices.post(`${BASE}/drops/${id}/approve/`);
  return data;
};

export const reclassifyFile = async (
  dropId: string,
  fileId: string,
  body: { lane?: DropLane; entity?: string; exclude?: boolean }
): Promise<BulkDrop> => {
  const { data } = await axiosServices.post(`${BASE}/drops/${dropId}/files/${fileId}/reclassify/`, body);
  return data;
};

export const listStores = async (connectionId: string): Promise<StoreOption[]> => {
  const { data } = await axiosServices.get(`${BASE}/connections/${connectionId}/locations/`);
  return data.stores;
};

export const mapLocationName = async (connectionId: string, name: string, locationId: string) => {
  const { data } = await axiosServices.post(`${BASE}/connections/${connectionId}/locations/map/`, {
    name,
    location_id: locationId
  });
  return data;
};
