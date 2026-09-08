import { beforeEach, describe, expect, it, vi } from 'vitest';

// utils/axios cannot be imported under vitest's node environment — it pulls in
// utils/mockApi.ts, which reads storage at module load. Mocking the module
// outright is the repo's established pattern (see posIntegrations.oauth.test.ts)
// and it is what lets the URLs themselves be asserted, which is the whole point
// here: these four calls previously pointed at paths that did not exist.
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

import { getBarcodeImage, getLabelSpecs, regenerateItemBarcode, renderLabels } from './inventory.api';

beforeEach(() => {
  get.mockReset();
  post.mockReset();
  get.mockResolvedValue({ data: [] });
  post.mockResolvedValue({ data: {} });
});

const RENDER_PAYLOAD = {
  spec_name: 'thermal_2.25x1.25',
  start_offset: 0,
  items: [{ item_id: '42', quantity: 3 }]
};

describe('the label endpoint paths', () => {
  it('asks for the layouts at the inventory app path', async () => {
    await getLabelSpecs();
    expect(get.mock.calls[0][0]).toBe('/inventory/labels/specs/');
  });

  it('asks for one item barcode image under the item id', async () => {
    await getBarcodeImage('42');
    expect(get.mock.calls[0][0]).toBe('/inventory/labels/barcode/42/');
  });

  it('posts a regeneration to the item barcode subpath', async () => {
    await regenerateItemBarcode('42', 'Damaged label reprint');
    expect(post.mock.calls[0][0]).toBe('/inventory/labels/barcode/42/regenerate/');
    expect(post.mock.calls[0][1]).toEqual({ reason: 'Damaged label reprint' });
  });

  it('posts a print run to the render path', async () => {
    post.mockResolvedValue({ data: new Blob(['%PDF-']) });
    await renderLabels(RENDER_PAYLOAD);
    expect(post.mock.calls[0][0]).toBe('/inventory/labels/render/');
  });

  it('never prefixes a label path with /api/, which the baseURL already carries', async () => {
    // The axios baseURL ends in '/api/v1/'. These four calls used to be
    // written as '/api/labels/...', so every one of them resolved to
    // <api>/api/v1/api/labels/... — a 404 the modal then hid.
    post.mockResolvedValue({ data: new Blob(['%PDF-']) });
    await getLabelSpecs();
    await getBarcodeImage('42');
    await regenerateItemBarcode('42', 'Damaged label reprint');
    await renderLabels(RENDER_PAYLOAD);

    const paths = [...get.mock.calls, ...post.mock.calls].map((call) => String(call[0]));
    expect(paths).toHaveLength(4);
    for (const path of paths) {
      expect(path).not.toContain('/api/');
      expect(path.startsWith('/inventory/')).toBe(true);
      // Django's APPEND_SLASH answers a slashless POST with a 301, and a
      // redirected POST arrives without its body.
      expect(path.endsWith('/')).toBe(true);
    }
  });
});

describe('renderLabels', () => {
  it('requests the PDF as a blob and passes the payload through unchanged', async () => {
    post.mockResolvedValue({ data: new Blob(['%PDF-']) });

    const blob = await renderLabels(RENDER_PAYLOAD);

    const [, body, config] = post.mock.calls[0];
    expect(body).toEqual(RENDER_PAYLOAD);
    expect(config).toEqual({ responseType: 'blob' });
    expect(blob).toBeInstanceOf(Blob);
  });

  it('surfaces the server message even though the error body is a blob', async () => {
    // responseType 'blob' applies to error bodies too, so a 400 arrives as a
    // Blob and the usual error.response.data.error read is undefined. Without
    // decoding it the clerk is told "try again" when the real answer is that
    // they asked for more labels than one run allows.
    post.mockRejectedValue({
      response: { status: 400, data: new Blob([JSON.stringify({ error: '1001 labels requested; the cap is 1000 per request.' })]) }
    });

    await expect(renderLabels(RENDER_PAYLOAD)).rejects.toThrow('the cap is 1000 per request');
  });

  it('falls back to a readable message when the error body is not JSON', async () => {
    post.mockRejectedValue({ response: { status: 502, data: new Blob(['<html>Bad Gateway</html>']) } });

    await expect(renderLabels(RENDER_PAYLOAD)).rejects.toThrow('Could not render the labels');
  });

  it('reads a plain JSON error body when axios parsed one', async () => {
    post.mockRejectedValue({ response: { status: 404, data: { detail: 'Item not found.' } } });

    await expect(renderLabels(RENDER_PAYLOAD)).rejects.toThrow('Item not found.');
  });
});

describe('regenerateItemBarcode', () => {
  it('unwraps the item envelope the endpoint returns', async () => {
    post.mockResolvedValue({ data: { item: { id: 42, barcode: '412345678903' } } });

    const item = await regenerateItemBarcode('42', 'Damaged label reprint');

    expect(item.barcode).toBe('412345678903');
  });
});
