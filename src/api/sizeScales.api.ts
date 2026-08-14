// api/sizeScales.api.ts
//
// Transport for the size-scale settings endpoints (backend sizing_views.py)
// and nothing else. Every decision about WHAT to send — the {value, is_active}
// round-trip that keeps a reorder from resurrecting deactivated values, the
// whole-set bindings replace, the per-variant map writes — lives in
// views/inventory/sizeScales.ts, which is axios-free and therefore testable;
// this file only moves bytes. Same axios instance and implicit company scoping
// (X-Role-ID via utils/axios) as every other inventory API module — passing a
// company_id explicitly would re-introduce the closed IDOR class.

import axiosServices from 'utils/axios';

import { CategoryBindingRow, ScaleKind, SizeScale, UnmatchedReport } from 'views/inventory/sizeScales';

const BASE_URL = '/inventory';

export const listSizeScales = async (): Promise<SizeScale[]> => {
  const response = await axiosServices.get<SizeScale[]>(`${BASE_URL}/size-scales/`);
  return response.data;
};

export const getSizeScale = async (scaleId: string): Promise<SizeScale> => {
  const response = await axiosServices.get<SizeScale>(`${BASE_URL}/size-scales/${scaleId}/`);
  return response.data;
};

/** POST body from sizeScales.toCreatePayload — plain strings are fine here
 * because a brand-new scale has no deactivated values to lose. */
export const createSizeScale = async (payload: {
  name: string;
  kind: ScaleKind;
  axis_labels: string[];
  values: string[][];
}): Promise<SizeScale> => {
  const response = await axiosServices.post<SizeScale>(`${BASE_URL}/size-scales/`, payload);
  return response.data;
};

/** PATCH body from sizeScales.toPatchPayload — never carries kind/axes. */
export const patchSizeScale = async (scaleId: string, payload: Record<string, unknown>): Promise<SizeScale> => {
  const response = await axiosServices.patch<SizeScale>(`${BASE_URL}/size-scales/${scaleId}/`, payload);
  return response.data;
};

/** 409 with structured blockers while components/bindings/overrides reference
 * the scale — parse with sizeScales.parseSizeScaleError. */
export const deleteSizeScale = async (scaleId: string): Promise<void> => {
  await axiosServices.delete(`${BASE_URL}/size-scales/${scaleId}/`);
};

/**
 * REPLACES the whole ordered lists. The body MUST come from
 * sizeScales.toValuesPutPayload: entries sent as plain strings default
 * is_active to true on the server, which resurrects deactivated values — the
 * builder makes that shape unrepresentable, so do not construct this body by
 * hand.
 */
export const replaceSizeScaleValues = async (
  scaleId: string,
  payload: { values: Array<Array<{ value: string; is_active: boolean }>> }
): Promise<SizeScale> => {
  const response = await axiosServices.put<SizeScale>(`${BASE_URL}/size-scales/${scaleId}/values/`, payload);
  return response.data;
};

export const getUnmatchedSizes = async (scaleId: string): Promise<UnmatchedReport> => {
  const response = await axiosServices.get<UnmatchedReport>(`${BASE_URL}/size-scales/${scaleId}/unmatched/`);
  return response.data;
};

export const listCategoryBindings = async (): Promise<CategoryBindingRow[]> => {
  const response = await axiosServices.get<CategoryBindingRow[]>(`${BASE_URL}/category-bindings/`);
  return response.data;
};

/** Replaces the WHOLE set — a binding omitted from the body is deleted. Body
 * from sizeScales.toBindingsPutPayload after detectBindingProblems passes. */
export const replaceCategoryBindings = async (payload: {
  bindings: Array<{ category: string; scale_id: string }>;
}): Promise<CategoryBindingRow[]> => {
  const response = await axiosServices.put<CategoryBindingRow[]>(`${BASE_URL}/category-bindings/`, payload);
  return response.data;
};

export interface VariantSizeResponse {
  inventory_item_id: number;
  size: string;
  scale_id: string | null;
  components: Array<{ axis_index: number; value: string; position: number }>;
}

/** The ONE HTTP door to a variant's size — the MAP action writes one of these
 * per variant (there is no per-size bulk endpoint; see sizeScales.mapCandidates
 * for how the variants are found and why). */
export const setVariantSize = async (
  itemId: number,
  payload: { scale_id: string; values: string[] } | { raw: string }
): Promise<VariantSizeResponse> => {
  const response = await axiosServices.put<VariantSizeResponse>(`${BASE_URL}/variants/${itemId}/size/`, payload);
  return response.data;
};
