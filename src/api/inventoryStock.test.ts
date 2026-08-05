import { describe, expect, it } from 'vitest';

// Imported from the pure module, not from inventoryStock.api: that pulls in
// utils/axios → utils/mockApi.ts, which reads sessionStorage at module load and
// therefore cannot be imported under vitest's node environment at all.
import { buildMovementQuery } from './inventoryStock.query';

describe('buildMovementQuery', () => {
  it('repeats `reason` rather than serialising an array', () => {
    // The backend reads getlist('reason'). Axios would send reason[]= for an
    // array, which that call ignores — the filter would silently do nothing.
    const query = buildMovementQuery({ reasons: ['sale', 'shrinkage'] });
    expect(query).toBe('reason=sale&reason=shrinkage');
    expect(query).not.toContain('reason[]');
  });

  it('maps camelCase filters to the snake_case the API expects', () => {
    const query = buildMovementQuery({
      locationId: 'loc-1',
      start: '2026-01-01',
      end: '2026-01-31',
      page: 2,
      pageSize: 50
    });
    const params = new URLSearchParams(query);
    expect(params.get('location_id')).toBe('loc-1');
    expect(params.get('start')).toBe('2026-01-01');
    expect(params.get('end')).toBe('2026-01-31');
    expect(params.get('page')).toBe('2');
    expect(params.get('page_size')).toBe('50');
  });

  it('omits absent filters entirely rather than sending empty values', () => {
    // `?location_id=` would be a falsy-but-present param; the backend treats any
    // truthy location_id as a filter, so an empty one must not be sent at all.
    expect(buildMovementQuery({})).toBe('');
    expect(buildMovementQuery({ locationId: null })).toBe('');
    expect(buildMovementQuery({ reasons: [] })).toBe('');
  });

  it('encodes values safely', () => {
    const query = buildMovementQuery({ reasons: ['count_adjust'] });
    expect(query).toBe('reason=count_adjust');
  });
});
