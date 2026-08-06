// api/qbPosting.api.ts
//
// Transport for the QuickBooks write-back surface (backend `qb/posting_views.py`).
//
// TRANSPORT ONLY. Every rule — the mapping state machine, the toggle gate, the
// accept-all plan, the integer-cent journal totals and the three honesty
// strings — lives in `views/inventory/qbPosting.ts`, which imports no axios and
// is therefore testable. A test that imports THIS file cannot collect at all:
// `utils/axios` pulls in `utils/mockApi.ts`, which reads `sessionStorage` at
// module load, and under vitest's node environment that throws before the first
// assertion runs.
//
// Query strings are passed in as strings rather than as axios `params` objects
// ON PURPOSE: `kind` and `status` are repeatable (`request.GET.getlist`) and
// axios 1.x serialises an array as `kind[]=sales_summary`, which that call
// silently ignores — the filter appears to do nothing while returning
// everything. Build them with `postingLogQuery` / `dayDrillQuery`.

import axiosServices from 'utils/axios';

const QB_BASE_URL = '/quickbooks';

// ---------------------------------------------------------------------------
// Settings, mappings, readiness
// ---------------------------------------------------------------------------

/** GET the whole settings screen in one call: flag, connection, 11 purposes, 3 kinds. */
export const getPostingSettings = async (): Promise<unknown> => {
  const response = await axiosServices.get(`${QB_BASE_URL}/posting-settings/`);
  return response.data;
};

/**
 * PATCH the posting flag. Admin only.
 *
 * FAILS CLOSED on enable: a 409 `mappings_incomplete` carries one blocker per
 * missing purpose (read it with `parseMappingConflict`). Disabling is never
 * blocked — check with `describeToggleTarget` before calling so the user is told
 * what is missing instead of being shown a conflict.
 */
export const setPostingEnabled = async (enabled: boolean): Promise<unknown> => {
  const response = await axiosServices.patch(`${QB_BASE_URL}/posting-settings/`, { qb_posting_enabled: enabled });
  return response.data;
};

/** GET suggested mappings plus the full active chart of accounts for the dropdown. */
export const getMappingSuggestions = async (): Promise<unknown> => {
  const response = await axiosServices.get(`${QB_BASE_URL}/posting-mappings/suggestions/`);
  return response.data;
};

/**
 * PUT `{mappings: {purpose: qb_account_uuid | null}}`. Admin only.
 *
 * ALL OR NOTHING server-side: one bad row saves nothing, and the 400 body names
 * the offending purpose. Build the body with `planAcceptAll` or
 * `singleMappingPayload` so a human-set mapping is never overwritten silently.
 */
export const savePostingMappings = async (mappings: Record<string, string | null>): Promise<unknown> => {
  const response = await axiosServices.put(`${QB_BASE_URL}/posting-mappings/`, { mappings });
  return response.data;
};

/**
 * POST the chart-of-accounts bootstrap. Admin only.
 *
 * This WRITES INTO A CUSTOMER'S CHART OF ACCOUNTS, so always dry-run first and
 * show `would_create` before the real call. Refused with 409
 * `quickbooks_not_connected` even for a dry run when QB is not connected.
 */
export const createMissingPostingAccounts = async (options: { dryRun: boolean; purposes?: string[] }): Promise<unknown> => {
  const body: Record<string, unknown> = { dry_run: options.dryRun };
  if (options.purposes && options.purposes.length > 0) {
    body.purposes = options.purposes;
  }
  const response = await axiosServices.post(`${QB_BASE_URL}/posting-accounts/create-missing/`, body);
  return response.data;
};

// ---------------------------------------------------------------------------
// The posting log
// ---------------------------------------------------------------------------

/**
 * GET the QBPosting ledger. `query` must come from `postingLogQuery` — a
 * malformed uuid or date is a 400 there, and an unvalidated one here would make
 * the table show an error instead of rows.
 */
export const listPostings = async (query = ''): Promise<unknown> => {
  const response = await axiosServices.get(`${QB_BASE_URL}/postings/${query ? `?${query}` : ''}`);
  return response.data;
};

/**
 * GET the day drill-down — the trust surface.
 *
 * `query` must come from `dayDrillQuery`, which returns null when either
 * required parameter is unusable; do not call this with a hand-built string.
 * This endpoint DEGRADES rather than refusing: it previews with the flag off and
 * with mappings incomplete, and attempts no HTTP to QuickBooks either way.
 */
export const getPostingDay = async (query: string): Promise<unknown> => {
  const response = await axiosServices.get(`${QB_BASE_URL}/postings/day/?${query}`);
  return response.data;
};

/**
 * POST a retry for one posting. Admin only.
 *
 * AMENDS, never duplicates: the executor sends the stored QBO Id + SyncToken as
 * a sparse update. The fail-closed gate runs first, so a disabled company or an
 * incomplete mapping answers 409 with no HTTP attempted — `canRetry` predicts
 * that client-side so the user gets a sentence instead of a conflict.
 */
export const retryPosting = async (postingId: string, options: { dryRun: boolean } = { dryRun: false }): Promise<unknown> => {
  const suffix = options.dryRun ? '?dry_run=1' : '';
  const response = await axiosServices.post(`${QB_BASE_URL}/postings/${postingId}/retry/${suffix}`, { dry_run: options.dryRun });
  return response.data;
};
