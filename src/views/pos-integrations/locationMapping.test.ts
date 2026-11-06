import { describe, expect, it } from 'vitest';

import type { MappedStore, ProviderLocationRow } from 'api/posIntegrations.api';
import {
  addressLine,
  choicePayload,
  currentChoice,
  heldLabel,
  NEW_STORE,
  newStoreNameTaken,
  SKIP,
  storesFor,
  summarize
} from './locationMapping';

const store = (id: string, name: string): MappedStore => ({ id, name, kind: 'store', is_default: false, is_active: true });

const row = (over: Partial<ProviderLocationRow> = {}): ProviderLocationRow => ({
  provider_location_id: 'gid://shopify/Location/1',
  name: 'Main Street',
  meta: {},
  is_active: true,
  store: null,
  mapping: null,
  skipped: false,
  needs_decision: true,
  held: { order: 0, inventory_level: 0 },
  ...over
});

describe('currentChoice', () => {
  it('is the store when mapped, SKIP when skipped, and empty while undecided', () => {
    expect(currentChoice(row({ store: store('s1', 'Main') }))).toBe('s1');
    expect(currentChoice(row({ skipped: true }))).toBe(SKIP);
    expect(currentChoice(row())).toBe('');
  });
});

describe('choicePayload', () => {
  it('turns each select value into the body the map endpoint takes', () => {
    expect(choicePayload('s1', row())).toEqual({ location_id: 's1' });
    expect(choicePayload(NEW_STORE, row())).toEqual({ create: true, store_name: 'Main Street' });
    expect(choicePayload(SKIP, row())).toEqual({ skip: true });
  });

  it('sends nothing when the choice did not change', () => {
    expect(choicePayload('s1', row({ store: store('s1', 'Main') }))).toBeNull();
    expect(choicePayload(SKIP, row({ skipped: true }))).toBeNull();
    expect(choicePayload('', row())).toBeNull();
  });
});

describe('storesFor', () => {
  it('never offers a store another location already imports into', () => {
    const main = store('s1', 'Main');
    const kiosk = store('s2', 'Kiosk');
    const a = row({ provider_location_id: 'a', store: main });
    const b = row({ provider_location_id: 'b' });
    expect(storesFor(b, [a, b], [main, kiosk]).map((s) => s.id)).toEqual(['s2']);
    expect(storesFor(a, [a, b], [main, kiosk]).map((s) => s.id)).toEqual(['s1', 's2']);
  });
});

describe('newStoreNameTaken', () => {
  it('matches names the way the backend does, ignoring case and spacing', () => {
    expect(newStoreNameTaken(row({ name: 'Main  street ' }), [store('s1', 'main street')])).toBe(true);
    expect(newStoreNameTaken(row({ name: 'Airport' }), [store('s1', 'Main')])).toBe(false);
  });
});

describe('summarize and labels', () => {
  it('counts mapped, skipped and undecided locations', () => {
    expect(
      summarize([row({ store: store('s1', 'M'), needs_decision: false }), row({ skipped: true, needs_decision: false }), row()])
    ).toEqual({ mapped: 1, skipped: 1, undecided: 1 });
  });

  it('names what is held in plain words', () => {
    expect(heldLabel({ order: 1, inventory_level: 12 })).toBe('1 sale and 12 stock levels');
    expect(heldLabel({ order: 0, inventory_level: 0 })).toBe('');
  });

  it('builds one address line from the metadata', () => {
    expect(addressLine(row({ meta: { address: { line1: '1 Terminal Rd', city: 'Tulsa', state: 'OK' } } }))).toBe(
      '1 Terminal Rd, Tulsa, OK'
    );
    expect(addressLine(row())).toBe('');
  });
});
