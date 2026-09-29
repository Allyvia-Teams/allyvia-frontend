import { describe, expect, it } from 'vitest';

import {
  buildRefundLineDrafts,
  canSubmitLineRefund,
  isLineReturnable,
  refundSubtotal,
  selectedUnitCount,
  setLineDisposition,
  setLineQuantity,
  toRefundLineSelections,
  type RefundLineDraft
} from './refundLines';
import type { CartItem } from '../types/pos.types';

const item = (over: Partial<CartItem> & { lineId?: string } = {}): CartItem => ({
  product: {
    id: 'p1',
    name: 'Silk Shirt',
    sku: 'SHIRT-01',
    category: 'Tops',
    price: 19.99,
    stock: 4,
    imageUrl: '',
    taxRate: 0
  } as CartItem['product'],
  quantity: 3,
  discountAmount: 0,
  lineId: 'l1',
  returnedQuantity: 0,
  refundableQuantity: 3,
  ...over
});

const draft = (over: Partial<RefundLineDraft> = {}): RefundLineDraft => ({
  lineId: 'l1',
  name: 'Silk Shirt',
  sku: 'SHIRT-01',
  quantity: 3,
  returnedQuantity: 0,
  refundableQuantity: 3,
  selectedQuantity: 0,
  disposition: 'restock',
  unitPrice: 19.99,
  ...over
});

describe('buildRefundLineDrafts', () => {
  it('starts every line at zero selected', () => {
    const [line] = buildRefundLineDrafts([item()]);
    expect(line.selectedQuantity).toBe(0);
  });

  it('defaults every line to restock', () => {
    const [line] = buildRefundLineDrafts([item()]);
    expect(line.disposition).toBe('restock');
  });

  it("uses the server's refundableQuantity as the ceiling, not quantity", () => {
    // Two of three already returned: the ceiling is 1, not 3.
    const [line] = buildRefundLineDrafts([item({ returnedQuantity: 2, refundableQuantity: 1 })]);
    expect(line.refundableQuantity).toBe(1);
  });

  it('falls back to sold-minus-returned only when the server omitted it', () => {
    const [line] = buildRefundLineDrafts([item({ refundableQuantity: undefined, quantity: 5, returnedQuantity: 2 })]);
    expect(line.refundableQuantity).toBe(3);
  });

  it('never produces a negative ceiling', () => {
    const [line] = buildRefundLineDrafts([item({ refundableQuantity: undefined, quantity: 1, returnedQuantity: 4 })]);
    expect(line.refundableQuantity).toBe(0);
  });

  it('drops lines with no server line id, which cannot be returned against', () => {
    expect(buildRefundLineDrafts([item({ lineId: undefined })])).toHaveLength(0);
  });

  it('keeps fully-returned lines so the clerk can see why they are unavailable', () => {
    const drafts = buildRefundLineDrafts([item({ returnedQuantity: 3, refundableQuantity: 0 })]);
    expect(drafts).toHaveLength(1);
    expect(isLineReturnable(drafts[0])).toBe(false);
  });
});

describe('setLineQuantity', () => {
  it('caps at the refundable ceiling instead of over-refunding', () => {
    const lines = setLineQuantity([draft({ refundableQuantity: 2 })], 'l1', 5);
    expect(lines[0].selectedQuantity).toBe(2);
  });

  it('floors at zero', () => {
    const lines = setLineQuantity([draft()], 'l1', -3);
    expect(lines[0].selectedQuantity).toBe(0);
  });

  it('caps a line with nothing left at zero', () => {
    const lines = setLineQuantity([draft({ refundableQuantity: 0 })], 'l1', 1);
    expect(lines[0].selectedQuantity).toBe(0);
  });

  it('leaves other lines alone', () => {
    const lines = setLineQuantity([draft(), draft({ lineId: 'l2' })], 'l1', 2);
    expect(lines[1].selectedQuantity).toBe(0);
  });

  it('truncates a fractional quantity rather than sending it', () => {
    const lines = setLineQuantity([draft()], 'l1', 1.9);
    expect(lines[0].selectedQuantity).toBe(1);
  });

  it('treats a non-numeric quantity as zero', () => {
    const lines = setLineQuantity([draft({ selectedQuantity: 2 })], 'l1', Number.NaN);
    expect(lines[0].selectedQuantity).toBe(0);
  });
});

describe('setLineDisposition', () => {
  it('changes only the named line and keeps its quantity', () => {
    const lines = setLineDisposition([draft({ selectedQuantity: 2 }), draft({ lineId: 'l2' })], 'l1', 'damaged_writeoff');
    expect(lines[0].disposition).toBe('damaged_writeoff');
    expect(lines[0].selectedQuantity).toBe(2);
    expect(lines[1].disposition).toBe('restock');
  });
});

describe('refundSubtotal', () => {
  it('sums selected units at their unit price', () => {
    expect(refundSubtotal([draft({ selectedQuantity: 3 })])).toBe(59.97);
  });

  it('ignores unselected lines', () => {
    expect(refundSubtotal([draft({ selectedQuantity: 0 }), draft({ lineId: 'l2', selectedQuantity: 1, unitPrice: 10 })])).toBe(10);
  });

  it('is zero with nothing selected', () => {
    expect(refundSubtotal([draft()])).toBe(0);
  });

  it('does not leak floating point noise', () => {
    // 3 x 19.99 is 59.969999999999999 in IEEE 754.
    expect(String(refundSubtotal([draft({ selectedQuantity: 3 })]))).toBe('59.97');
  });
});

describe('toRefundLineSelections', () => {
  it('omits zero-quantity lines, which the server rejects', () => {
    const payload = toRefundLineSelections([draft({ selectedQuantity: 0 }), draft({ lineId: 'l2', selectedQuantity: 1 })]);
    expect(payload).toEqual([{ line_id: 'l2', quantity: 1, disposition: 'restock' }]);
  });

  it('carries each line its own disposition', () => {
    const payload = toRefundLineSelections([
      draft({ selectedQuantity: 1, disposition: 'discard' }),
      draft({ lineId: 'l2', selectedQuantity: 2, disposition: 'return_to_vendor' })
    ]);
    expect(payload.map((l) => l.disposition)).toEqual(['discard', 'return_to_vendor']);
  });

  it('is empty when nothing is selected', () => {
    expect(toRefundLineSelections([draft()])).toEqual([]);
  });
});

describe('canSubmitLineRefund / selectedUnitCount', () => {
  it('refuses an empty selection', () => {
    expect(canSubmitLineRefund([draft()])).toBe(false);
  });

  it('allows one selected unit', () => {
    expect(canSubmitLineRefund([draft({ selectedQuantity: 1 })])).toBe(true);
  });

  it('counts units across lines', () => {
    expect(selectedUnitCount([draft({ selectedQuantity: 2 }), draft({ lineId: 'l2', selectedQuantity: 3 })])).toBe(5);
  });
});
