// Static renders of the held store names (renderToStaticMarkup, the repo's precedent).

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { BulkDrop, HeldLocation } from 'api/importDrops.api';

import HeldLocations from './HeldLocations';

vi.mock('utils/axios', () => ({ default: {} }));
vi.mock('./useImportDrops', () => ({
  useStores: () => ({ data: [{ id: 'main', name: 'Main', is_active: true, kind: 'store' }] }),
  useMapLocation: () => ({ isPending: false, mutate: vi.fn() })
}));

const shop: HeldLocation = { kind: 'name', value: 'shop location', label: 'Shop location', order: 0, inventory_level: 6432 };
const custom: HeldLocation = { kind: 'name', value: 'my custom location', label: 'My Custom Location', order: 0, inventory_level: 305 };

function drop(held: HeldLocation[]): BulkDrop {
  return {
    id: 'd',
    status: 'completed',
    created_at: '2026-11-03T21:10:00Z',
    created_by_email: '',
    default_location_id: null,
    timezone: '',
    connection_id: 'c',
    run_id: 'r',
    waiting: '',
    lanes: { integrations: 1, onboarding: 0 },
    lane_state: { direct: 'imported', onboarding: 'none', onboarding_reason: '' },
    can_approve: false,
    files: [],
    report: { direct: null, onboarding: null, also_in_onboarding_run: [] },
    held_locations: held,
    onboarding_available: false
  };
}

describe('HeldLocations', () => {
  it('preselects the suggested store for the dominant name only, and still asks for Map', () => {
    const html = renderToStaticMarkup(<HeldLocations drop={drop([{ ...shop, suggested_location_id: 'main' }, custom])} />);
    const [shopRow, customRow] = html.split('My Custom Location');
    expect(shopRow).toContain('Main');
    expect(customRow).not.toContain('>Main<');
    expect(html.match(/>Map</g)).toHaveLength(2);
  });

  it('shows progress instead of the Map control while the rows are importing', () => {
    const html = renderToStaticMarkup(<HeldLocations drop={drop([{ ...shop, release: { state: 'running', total: 6432, done: 1500 } }])} />);
    expect(html).toContain('Mapped. Imported 1,500 of 6,432 rows.');
    expect(html).toContain('role="progressbar"');
    expect(html).not.toContain('>Map<');
  });
});
