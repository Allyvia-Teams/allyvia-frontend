// api/inventoryStock.query.ts
//
// The movements query-string builder, kept in its own module ON PURPOSE.
//
// `inventoryStock.api.ts` imports `utils/axios`, which imports `utils/mockApi.ts`,
// which reads `sessionStorage` at module load. Under vitest's node environment
// that throws at import time, so a test importing the api module cannot collect
// at all. The pure logic lives here so it stays testable without a jsdom
// environment or a mock of the whole axios layer.

export interface MovementFilters {
  locationId?: string | null;
  /** Repeatable on the wire — the backend 400s on an unknown reason. */
  reasons?: string[];
  start?: string;
  end?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Build the movements query string.
 *
 * Pure so the repeatable-`reason` behaviour can be tested: the backend reads
 * `?reason=sale&reason=shrinkage` via `getlist('reason')`, and handing axios an
 * array would serialise it as `reason[]=` — which that call silently ignores, so
 * the filter would appear to do nothing. Worth a test.
 */
export const buildMovementQuery = (filters: MovementFilters = {}): string => {
  const query = new URLSearchParams();
  if (filters.locationId) query.set('location_id', filters.locationId);
  (filters.reasons ?? []).forEach((reason) => query.append('reason', reason));
  if (filters.start) query.set('start', filters.start);
  if (filters.end) query.set('end', filters.end);
  if (filters.page) query.set('page', String(filters.page));
  if (filters.pageSize) query.set('page_size', String(filters.pageSize));
  return query.toString();
};
