import { describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), patch: vi.fn() }));
vi.mock('utils/axios', () => ({ default: calls }));
import { storefrontAPI } from './storefront.api';

describe('storefront transport contract', () => {
  it('uses the existing versioned base URL without adding another api/v1', async () => {
    calls.get.mockResolvedValue({ data: { draft_revision: 3 } });
    await expect(storefrontAPI.getSite()).resolves.toEqual({ draft_revision: 3 });
    expect(calls.get).toHaveBeenCalledWith('/storefront/site/');
  });
  it('sends the loaded revision with section edits and leaves 409 available to the builder', async () => {
    const conflict = { response: { status: 409, data: { current: { site: { draft_revision: 4 }, pages: [] } } } };
    calls.put.mockRejectedValue(conflict);
    const edit = { sections: [], draft_revision: 3 };
    await expect(storefrontAPI.updateSections('page-1', edit)).rejects.toBe(conflict);
    expect(calls.put).toHaveBeenCalledWith('/storefront/pages/page-1/sections/', edit);
  });
});
