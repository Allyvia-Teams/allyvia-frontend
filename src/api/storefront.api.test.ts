import { describe, expect, it, vi } from 'vitest';
const calls = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), patch: vi.fn(), post: vi.fn() }));
vi.mock('utils/axios', () => ({ default: calls }));
import { storefrontAPI } from './storefront.api';
import type { StorefrontSection } from 'types/storefront';

describe('storefront transport contract', () => {
  it('uses the existing versioned base URL without adding another api/v1', async () => {
    calls.get.mockResolvedValue({ data: { draft_revision: 3 } });
    await expect(storefrontAPI.getSite()).resolves.toEqual({ draft_revision: 3 });
    expect(calls.get).toHaveBeenCalledWith('/storefront/site/');
  });
  it('restores a version to draft without publishing it', async () => {
    calls.post.mockResolvedValue({ data: { site: { draft_revision: 5 }, pages: [] } });
    await storefrontAPI.restoreVersion('version-1');
    expect(calls.post).toHaveBeenCalledWith('/storefront/versions/version-1/restore/');
    expect(calls.post).not.toHaveBeenCalledWith('/storefront/publish/');
  });
  it('obtains preview links through the authenticated relative endpoint', async () => {
    calls.get.mockResolvedValue({ data: { url: 'https://demo.allyvia.shop/preview/signed', expires_in: 900 } });
    const preview = await storefrontAPI.getPreviewLink();
    expect(calls.get).toHaveBeenCalledWith('/storefront/preview-link/');
    expect(preview.expires_in).toBe(900);
  });
  it('preserves section visibility and rail labels in saves', async () => {
    const section: StorefrontSection = {
      id: 'hero-1',
      type: 'hero',
      fields: { heading: 'Hello' },
      is_visible: false,
      label: 'Seasonal hero'
    };
    const edit = { sections: [section], draft_revision: 3 };
    calls.put.mockResolvedValue({ data: edit });
    await storefrontAPI.updateSections('page-1', edit);
    expect(calls.put).toHaveBeenCalledWith('/storefront/pages/page-1/sections/', edit);
  });
  it('sends the loaded revision with section edits and leaves 409 available to the builder', async () => {
    const conflict = { response: { status: 409, data: { current: { site: { draft_revision: 4 }, pages: [] } } } };
    calls.put.mockRejectedValue(conflict);
    const edit = { sections: [], draft_revision: 3 };
    await expect(storefrontAPI.updateSections('page-1', edit)).rejects.toBe(conflict);
    expect(calls.put).toHaveBeenCalledWith('/storefront/pages/page-1/sections/', edit);
  });
});
