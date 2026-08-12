// api/inventoryLookup.api.ts
//
// Transport for GET /inventory/lookup/ — the counter lookup — and nothing else.
// Every decision about WHAT to send (exactly one of barcode/sku/style_id/q,
// trimmed, blank never sent) and what the answer MEANS lives in
// views/inventory/sizing.ts, which is axios-free and therefore testable; this
// file only moves bytes. Same axios instance and implicit company scoping
// (X-Role-ID via utils/axios) as every other inventory API module — passing a
// company_id explicitly would re-introduce the closed IDOR class.
//
// Read-only endpoint, read-only module: there is deliberately no POST here and
// none may be added — the lookup screen answers questions, it changes nothing.

import axiosServices from 'utils/axios';

import { LookupParam, LookupResponse } from 'views/inventory/sizing';

/**
 * One lookup round trip. Callers build `params` with sizing.ts's
 * `buildLookupQuery`/`toLookupQuery`, which guarantee the exactly-one-param
 * rule client-side; anything else earns the endpoint's 400.
 *
 * The response is a union: `q` answers with `{results, total, size_matches}`,
 * everything else with the style/matrix shape (including the style:null
 * variant-only answer). Discriminate with sizing.ts's `isSearchResponse`.
 */
export const lookupInventory = async (params: Partial<Record<LookupParam, string>>): Promise<LookupResponse> => {
  const response = await axiosServices.get<LookupResponse>('/inventory/lookup/', { params });
  return response.data;
};
