import { describe, expect, it } from 'vitest';

import type { OrderPreview } from 'api/buying.api';

import { vendorChecks } from './orderChecks';

const UNITS = "Northwind's minimum is 100 units an order. This plan has 40 for them.";
const COVER = 'Northwind takes one order for the season, about 150 days. This plan covers 90.';

const group = (supplier: string, checks?: unknown): OrderPreview['groups'][number] =>
  ({ supplier_id: `id-${supplier}`, supplier, units: 40, cost: '320.00', lines: [], ...(checks === undefined ? {} : { checks }) }) as never;

const preview = (groups: OrderPreview['groups']): OrderPreview => ({
  stale: false,
  refused: null,
  groups,
  skipped: [],
  ordered: [],
  purchase_orders: [],
  drift: []
});

describe('vendorChecks', () => {
  it("says each vendor group's checks as the server worded them, in its order", () => {
    const got = vendorChecks(
      preview([
        group('Northwind', [
          { kind: 'minimum_units', sentence: UNITS },
          { kind: 'season_cover', sentence: COVER }
        ]),
        group('Juniper Knits')
      ])
    );
    expect(got).toEqual([{ supplierId: 'id-Northwind', supplier: 'Northwind', sentences: [UNITS, COVER] }]);
  });

  it('is empty with no preview, no groups, or no checks (a plan with no vendor rules)', () => {
    expect(vendorChecks(null)).toEqual([]);
    expect(vendorChecks(undefined)).toEqual([]);
    expect(vendorChecks(preview([]))).toEqual([]);
    expect(vendorChecks(preview([group('Northwind'), group('Juniper Knits', [])]))).toEqual([]);
  });

  it('keeps two vendors apart', () => {
    const got = vendorChecks(
      preview([
        group('Northwind', [{ kind: 'minimum_units', sentence: UNITS }]),
        group('Juniper Knits', [
          {
            kind: 'order_ahead',
            sentence: 'Juniper Knits needs orders placed 90 days ahead. This plan orders 7 days before its window starts.'
          }
        ])
      ])
    );
    expect(got.map((g) => [g.supplier, g.sentences.length])).toEqual([
      ['Northwind', 1],
      ['Juniper Knits', 1]
    ]);
  });

  it('drops a check with no sentence, a repeat and a malformed list, and never words one itself', () => {
    const got = vendorChecks(
      preview([
        group('Northwind', [
          { kind: 'minimum_units', sentence: UNITS },
          { kind: 'minimum_units', sentence: `  ${UNITS} ` },
          { kind: 'minimum_value', sentence: '' },
          { kind: 'order_ahead' },
          null
        ]),
        group('Juniper Knits', 'not a list')
      ])
    );
    expect(got).toEqual([{ supplierId: 'id-Northwind', supplier: 'Northwind', sentences: [UNITS] }]);
  });

  it('does not depend on the refusal: a plan the order refuses shows no groups, so no checks', () => {
    expect(vendorChecks({ ...preview([]), refused: { code: 'stale', sentence: 'Re-size first.' } })).toEqual([]);
  });
});
