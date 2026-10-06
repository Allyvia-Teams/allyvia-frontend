import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot be imported under vitest's node environment — it pulls in
// utils/mockApi.ts, which reads storage at module load. Mocking the module
// outright is the repo's established pattern (see posIntegrations.oauth.test.ts)
// and it is what lets the URLs themselves be asserted, which is the whole point
// here: these calls previously pointed at paths that did not exist.
//
// Label layouts and the PDF itself are now built client-side
// (utils/reports/inventory/inventoryLabelPdf), so only the per-item barcode
// endpoints remain server calls.
const get = vi.fn();
const post = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    get: (...args: unknown[]) => get(...args),
    post: (...args: unknown[]) => post(...args)
  }
}));
vi.mock('store', () => ({ store: { getState: () => ({}) } }));
vi.mock('utils/authStorage', () => ({ getRoleId: () => 'role-1' }));

import { getBarcodeImage, regenerateItemBarcode } from './inventory.api';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue({ data: new Blob() });
  post.mockResolvedValue({ data: {} });
});

describe('the barcode endpoint paths', () => {
  it('asks for one item barcode image under the item id', async () => {
    await getBarcodeImage('42');
    expect(get.mock.calls[0][0]).toBe('/inventory/labels/barcode/42/');
    expect(get.mock.calls[0][1]).toEqual({ responseType: 'blob' });
  });

  it('posts a regeneration to the item barcode subpath', async () => {
    await regenerateItemBarcode('42', 'Damaged label reprint');
    expect(post.mock.calls[0][0]).toBe('/inventory/labels/barcode/42/regenerate/');
    expect(post.mock.calls[0][1]).toEqual({ reason: 'Damaged label reprint' });
  });

  it('never prefixes a label path with /api/, which the baseURL already carries', async () => {
    await getBarcodeImage('42');
    await regenerateItemBarcode('42', 'Damaged label reprint');

    const paths = [...get.mock.calls, ...post.mock.calls].map((call) => String(call[0]));
    expect(paths).toHaveLength(2);
    for (const path of paths) {
      expect(path).not.toContain('/api/');
      expect(path.startsWith('/inventory/')).toBe(true);
      expect(path.endsWith('/')).toBe(true);
    }
  });
});

describe('regenerateItemBarcode', () => {
  it('unwraps the item envelope the endpoint returns', async () => {
    post.mockResolvedValue({ data: { item: { id: 42, barcode: '412345678903' } } });

    const item = await regenerateItemBarcode('42', 'Damaged label reprint');

    expect(item.barcode).toBe('412345678903');
  });
});
