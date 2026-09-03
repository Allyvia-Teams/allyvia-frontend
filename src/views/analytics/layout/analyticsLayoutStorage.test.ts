import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { ANALYTICS_LAYOUT_STORAGE_KEY, loadStoredLayouts, saveStoredLayouts } from './analyticsLayoutStorage';

// vitest runs in the node environment here, so stand up the minimum of the
// storage API these helpers touch.
function installStorage(seed: Record<string, string> = {}) {
  const data = new Map(Object.entries(seed));
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    clear: () => data.clear()
  });
  return data;
}

beforeEach(() => installStorage());
afterEach(() => vi.unstubAllGlobals());

describe('analytics layout cache (ALL-144, shared devices)', () => {
  it('round-trips a layout for the signed-in user', () => {
    installStorage({ email: 'owner@example.com' });

    saveStoredLayouts({ ...DEFAULT_LAYOUTS, financial: ['financial-kpis'] });

    expect(loadStoredLayouts().financial).toEqual(['financial-kpis']);
  });

  // The reason the layout is stored server-side at all: a kiosk is shared, so
  // a cache with no owner check would hand the next person the previous
  // person's arrangement.
  it('ignores a cache written by a different user', () => {
    installStorage({ email: 'first@example.com' });
    saveStoredLayouts({ ...DEFAULT_LAYOUTS, financial: ['financial-kpis'] });

    installStorage({
      email: 'second@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({
        owner: 'first@example.com',
        layouts: { ...DEFAULT_LAYOUTS, financial: ['financial-kpis'] }
      })
    });

    expect(loadStoredLayouts()).toEqual(DEFAULT_LAYOUTS);
  });

  it('discards a pre-envelope cache that records no owner', () => {
    installStorage({
      email: 'owner@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({ financial: ['financial-kpis'] })
    });

    expect(loadStoredLayouts()).toEqual(DEFAULT_LAYOUTS);
  });

  it('returns defaults when nothing is cached', () => {
    expect(loadStoredLayouts()).toEqual(DEFAULT_LAYOUTS);
  });

  it('returns defaults for malformed JSON rather than throwing', () => {
    installStorage({ email: 'owner@example.com', [ANALYTICS_LAYOUT_STORAGE_KEY]: '{not json' });

    expect(loadStoredLayouts()).toEqual(DEFAULT_LAYOUTS);
  });

  it('drops stale widget ids held in the cache', () => {
    installStorage({
      email: 'owner@example.com',
      [ANALYTICS_LAYOUT_STORAGE_KEY]: JSON.stringify({
        owner: 'owner@example.com',
        layouts: { financial: ['financial-kpis', 'widget-removed-last-release'] }
      })
    });

    expect(loadStoredLayouts().financial).toEqual(['financial-kpis']);
  });

  it('survives storage being unavailable', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      }
    });

    expect(loadStoredLayouts()).toEqual(DEFAULT_LAYOUTS);
    expect(() => saveStoredLayouts(DEFAULT_LAYOUTS)).not.toThrow();
  });
});
