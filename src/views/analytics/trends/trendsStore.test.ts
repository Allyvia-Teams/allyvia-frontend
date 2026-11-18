import { describe, expect, it, vi } from 'vitest';

import {
  ALL_PARAM,
  canSeeAllStores,
  grantedSet,
  paramFor,
  pickStore,
  probeAccess,
  storeChoices,
  type AccessProbe,
  type StoreLocation
} from './trendsStore';

const loc = (id: string, name: string, over: Partial<StoreLocation> = {}): StoreLocation => ({
  id,
  name,
  is_default: false,
  is_active: true,
  ...over
});
const ONE = [loc('a', 'Bloomington', { is_default: true })];
const MANY = [loc('b', 'Oklahoma'), loc('a', 'Bloomington', { is_default: true }), loc('c', 'Closed', { is_active: false })];

describe('which store', () => {
  it('lists the active stores, the default first', () => {
    expect(storeChoices(MANY).map((c) => c.id)).toEqual(['a', 'b']);
    expect(storeChoices(undefined)).toEqual([]);
  });

  it('one store: sends its id with no picker, whatever the URL says', () => {
    for (const param of [null, ALL_PARAM, 'zzz']) {
      expect(pickStore(storeChoices(ONE), param, true)).toEqual({ locationId: 'a', selected: 'a', showPicker: false, offerAll: false });
    }
  });

  it('several: defaults to the default store, with the picker', () => {
    const pick = pickStore(storeChoices(MANY), null, true);
    expect(pick).toMatchObject({ locationId: 'a', showPicker: true, offerAll: true });
  });

  it('several: the store in the URL, else the default for an unknown id', () => {
    expect(pickStore(storeChoices(MANY), 'b', true).locationId).toBe('b');
    expect(pickStore(storeChoices(MANY), 'nope', true).locationId).toBe('a');
  });

  it('All stores sends no header, and only for a role that can see every store', () => {
    expect(pickStore(storeChoices(MANY), ALL_PARAM, true)).toMatchObject({ locationId: null, selected: ALL_PARAM });
    expect(pickStore(storeChoices(MANY), ALL_PARAM, false)).toMatchObject({ locationId: 'a', offerAll: false });
  });

  it('with no stores read yet, asks for nothing it could send wrong', () => {
    expect(pickStore([], null, true).showPicker).toBe(false);
  });

  it('a role limited to some stores sees only those', () => {
    const access: AccessProbe = { kind: 'some', granted: ['b'] };
    const choices = storeChoices(MANY, grantedSet(access));
    expect(choices.map((c) => c.id)).toEqual(['b']);
    expect(canSeeAllStores(access)).toBe(false);
    expect(pickStore(choices, ALL_PARAM, canSeeAllStores(access))).toMatchObject({ locationId: 'b', showPicker: false });
  });

  it('a role that can see all stores is not narrowed', () => {
    expect(grantedSet({ kind: 'all' })).toBeNull();
    expect(canSeeAllStores({ kind: 'all' })).toBe(true);
    expect(canSeeAllStores(undefined)).toBe(false);
  });

  it('keeps the default store out of the URL', () => {
    const choices = storeChoices(MANY);
    expect(paramFor('a', choices)).toBeNull();
    expect(paramFor('b', choices)).toBe('b');
    expect(paramFor(ALL_PARAM, choices)).toBe(ALL_PARAM);
  });
});

describe('probing what a role can read', () => {
  const choices = storeChoices(MANY);

  it('a company view that answers means every store is hers, and nothing more is asked', async () => {
    const read = vi.fn().mockResolvedValue({ scope: 'all_stores' });
    expect(await probeAccess(read, choices)).toEqual({ kind: 'all' });
    expect(read).toHaveBeenCalledTimes(1);
  });

  it('a role limited to some stores is let in to the ones that answer', async () => {
    const read = vi.fn(async (id: string | null) => {
      if (id === 'b') throw new Error('404');
      return { scope: 'store' };
    });
    expect(await probeAccess(read, choices)).toEqual({ kind: 'some', granted: ['a'] });
  });

  it('a role with no company view at all is still read store by store', async () => {
    const read = vi.fn(async (id: string | null) => {
      if (id === null) throw new Error('404');
      return { scope: 'store' };
    });
    expect(await probeAccess(read, choices)).toEqual({ kind: 'some', granted: ['a', 'b'] });
  });
});
