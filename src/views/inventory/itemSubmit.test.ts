import { beforeEach, describe, expect, it, vi } from 'vitest';

// The one mock, at the outermost boundary: everything between the form's plan
// and the wire is the real api module, so these tests assert the URL the
// screen actually posts to rather than a stand-in for it. Mocking utils/axios
// also keeps the redux store (which it imports) out of a node test.
const post = vi.fn();

vi.mock('utils/axios', () => ({
  default: {
    post: (...args: unknown[]) => post(...args)
  }
}));

const { submitItem } = await import('./itemSubmit');

const variant = { sku: 'LIN-IVO-M', color: 'Ivory', size: 'M', opening_qty: 6 };

const style = {
  name: 'Linen Camp Shirt',
  style_code: 'EVER-LINENC',
  category: 'Shirts',
  description: '',
  brand: 'Everlane',
  season: 'SS26',
  attributes: { material: 'linen' },
  variants: [variant]
};

beforeEach(() => {
  post.mockReset();
  post.mockResolvedValue({ data: { id: 'style-7' } });
});

describe('submitItem', () => {
  it('posts to /inventory/products/ when no style was chosen', async () => {
    await submitItem({ door: 'create_style', payload: style });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/inventory/products/');
    expect(post.mock.calls[0][1]).toMatchObject({ style_code: 'EVER-LINENC', variants: [variant] });
  });

  it('posts to /inventory/products/{id}/variants/ when a style was chosen', async () => {
    await submitItem({ door: 'add_variant', productId: 'style-7', payload: variant });

    expect(post).toHaveBeenCalledTimes(1);
    expect(post.mock.calls[0][0]).toBe('/inventory/products/style-7/variants/');
    expect(post.mock.calls[0][1]).toMatchObject(variant);
  });

  it('never posts to the legacy item-create endpoint', async () => {
    await submitItem({ door: 'create_style', payload: style });
    await submitItem({ door: 'add_variant', productId: 'style-7', payload: variant });

    // The legacy door knows nothing about styles and writes its opening
    // quantity straight onto the column, skipping the stock ledger.
    post.mock.calls.forEach(([url]) => expect(url).not.toBe('/inventory/items/'));
  });

  it('re-mints and retries once when the server refuses the minted style code', async () => {
    // The code is minted against the products list the form loaded, so a style
    // created since then collides. The server is the authority and answers 400;
    // nothing was created, so one retry with a suffixed code is safe.
    post.mockRejectedValueOnce({
      response: { status: 400, data: { style_code: ['Product with this style code already exists.'] } }
    });

    await submitItem({ door: 'create_style', payload: style });

    expect(post).toHaveBeenCalledTimes(2);
    expect(post.mock.calls[1][1]).toMatchObject({ style_code: 'EVER-LINENC-2' });
  });

  it('gives up after one retry rather than looping on a style code', async () => {
    post.mockRejectedValue({ response: { status: 400, data: { style_code: ['Product with this style code already exists.'] } } });

    await expect(submitItem({ door: 'create_style', payload: style })).rejects.toBeDefined();
    expect(post).toHaveBeenCalledTimes(2);
  });

  it('does not retry a 400 about anything other than the style code', async () => {
    // A rejected size value is the operator's to fix; retrying would just
    // collect the same refusal with a different code.
    post.mockRejectedValue({ response: { status: 400, data: { detail: ['"XXL" is not on this scale.'] } } });

    await expect(submitItem({ door: 'create_style', payload: style })).rejects.toBeDefined();
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('does not retry an add-variant conflict', async () => {
    // 409 means the (size, colour) row already exists on the style — a
    // different SKU would create a duplicate rather than fix anything.
    post.mockRejectedValue({ response: { status: 409, data: { detail: { existing_sku: 'LIN-IVO-M' } } } });

    await expect(submitItem({ door: 'add_variant', productId: 'style-7', payload: variant })).rejects.toBeDefined();
    expect(post).toHaveBeenCalledTimes(1);
  });
});
