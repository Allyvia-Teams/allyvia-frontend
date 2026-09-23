import { describe, expect, it } from 'vitest';

import { buildInventoryLabelPdf, LABEL_LAYOUTS, PrintableInventoryLabel } from './inventoryLabelPdf';

const onePixelPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8//8/AwMDEwMDAwMDAwAkBgMB/DXemwAAAABJRU5ErkJggg==';
const label: PrintableInventoryLabel = {
  id: '17',
  name: 'Sweaters - S',
  sku: 'SWEA-0005',
  barcode: 'SWEA-0005',
  barcodePng: onePixelPng,
  quantity: 2
};

describe('inventory label PDF', () => {
  it('creates one physical-size thermal page per label', () => {
    const doc = buildInventoryLabelPdf([label], LABEL_LAYOUTS[0]);
    expect(doc.internal.getNumberOfPages()).toBe(2);
    expect(doc.internal.pageSize.getWidth()).toBe(162);
    expect(doc.internal.pageSize.getHeight()).toBe(90);
    expect(doc.output()).toMatch(/^%PDF/);
  });

  it('respects a partially used Avery sheet and continues onto the next page', () => {
    const doc = buildInventoryLabelPdf([label], LABEL_LAYOUTS[2], 29);
    expect(doc.internal.getNumberOfPages()).toBe(2);
    expect(doc.internal.pageSize.getWidth()).toBe(612);
    expect(doc.internal.pageSize.getHeight()).toBe(792);
  });

  it('refuses missing barcodes and excessive label counts', () => {
    expect(() => buildInventoryLabelPdf([{ ...label, barcode: '' }], LABEL_LAYOUTS[0])).toThrow(/barcode/);
    expect(() => buildInventoryLabelPdf([{ ...label, quantity: 501 }], LABEL_LAYOUTS[0])).toThrow(/500/);
  });
});
