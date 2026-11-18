import { describe, expect, it } from 'vitest';

import {
  appliedSentence,
  buildApproval,
  buildCreatePoRequest,
  buildOrdersSummary,
  checkPrice,
  copyListText,
  fromCents,
  GENERIC_PRICE_FAILURE,
  orderableSuggestionIds,
  ordersSentence,
  percentOff,
  posSentence,
  quickPrice,
  readAction,
  readPriceChangeFailure,
  readPriceChangeResult,
  readSkipped,
  rowKey,
  startingDrafts,
  toCents,
  vendorFixHref,
  type Draft,
  type MarkdownAction,
  type MarkdownRow,
  type PurchaseOrderAction
} from './actionPrefill';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const UUID_B = '22222222-2222-4222-8222-222222222222';
const PO_A = '33333333-3333-4333-8333-333333333333';
const PO_B = '44444444-4444-4444-8444-444444444444';

const row = (over: Partial<MarkdownRow> = {}): MarkdownRow => ({
  itemIds: [1, 2],
  name: 'Linen Shirt',
  sku: 'LINEN',
  variantCount: 2,
  price: '60.00',
  cost: '22.00',
  onHand: 12,
  suggestedPrice: null,
  ...over
});
const md = (rows: MarkdownRow[] = [row()], priceApply = 'allyvia'): MarkdownAction => ({
  kind: 'markdown',
  recommendationId: 'rec-1',
  priceApply,
  items: rows
});
const draft = (value: string, belowCostOk = false): Draft => ({ value, belowCostOk });

describe('money in cents', () => {
  it('reads plain amounts and nothing else', () => {
    expect(toCents('60.00')).toBe(6000);
    expect(toCents('60')).toBe(6000);
    expect(toCents('60.5')).toBe(6050);
    expect(toCents(' $48.25 ')).toBe(4825);
    expect(toCents(48.5)).toBe(4850);
    for (const bad of ['', 'abc', '-5.00', '1.005', '1,000.00', null, undefined, '48.00.00']) expect(toCents(bad)).toBeNull();
  });
  it('writes cents back with two places', () => {
    expect(fromCents(4800)).toBe('48.00');
    expect(fromCents(5)).toBe('0.05');
    expect(fromCents(123456)).toBe('1234.56');
  });
});

describe('percent off', () => {
  it('rounds to the cent, half a cent up', () => {
    expect(percentOff('60.00', 20)).toBe('48.00');
    expect(percentOff('60.00', 10)).toBe('54.00');
    expect(percentOff('59.99', 20)).toBe('47.99'); // 47.992
    expect(percentOff('0.05', 10)).toBe('0.05'); // 4.5 cents rounds up to 5: a price never rounds itself away
    expect(percentOff('19.99', 30)).toBe('13.99'); // 13.993
    expect(percentOff('10.05', 50)).toBe('5.03'); // 502.5 cents rounds up
  });
  it('refuses a price that is not an amount and a percent that is not a discount', () => {
    expect(percentOff('abc', 20)).toBeNull();
    expect(percentOff('60.00', 0)).toBeNull();
    expect(percentOff('60.00', 100)).toBeNull();
    expect(percentOff('60.00', -10)).toBeNull();
  });
  it('the quick button uses the row price', () => {
    expect(quickPrice(row({ price: '64.00' }), 30)).toBe('44.80');
  });
});

describe('checking a typed price', () => {
  it('an empty field is untouched and blocks nothing', () => {
    expect(checkPrice(row(), draft(''))).toMatchObject({ status: 'empty', blocking: false });
    expect(checkPrice(row(), undefined)).toMatchObject({ status: 'empty', blocking: false });
  });
  it('a valid drop is ok', () => {
    expect(checkPrice(row(), draft('48.00'))).toMatchObject({ status: 'ok', blocking: false, cents: 4800 });
  });
  it('text, zero and a price that is not a drop are blocked with a sentence', () => {
    expect(checkPrice(row(), draft('abc'))).toMatchObject({ status: 'invalid', blocking: true });
    expect(checkPrice(row(), draft('0'))).toMatchObject({ status: 'invalid', blocking: true });
    expect(checkPrice(row(), draft('61.00'))).toMatchObject({ status: 'not_a_drop', blocking: true });
    expect(checkPrice(row(), draft('60.00'))).toMatchObject({ status: 'not_a_drop', blocking: true });
    expect(checkPrice(row(), draft('61.00')).message).toContain('$60.00');
  });
  it('below cost warns and blocks until ticked', () => {
    const untick = checkPrice(row(), draft('20.00'));
    expect(untick).toMatchObject({ status: 'below_cost', blocking: true });
    expect(untick.message).toContain('$22.00');
    expect(checkPrice(row(), draft('20.00', true))).toMatchObject({ status: 'below_cost', blocking: false });
  });
  it('an unknown cost never warns', () => {
    expect(checkPrice(row({ cost: null }), draft('1.00'))).toMatchObject({ status: 'ok', blocking: false });
  });
  it('never uses words a shop owner would not', () => {
    for (const value of ['abc', '0', '61.00', '20.00']) {
      const message = checkPrice(row(), draft(value)).message ?? '';
      expect(message).not.toMatch(/—|status|null|undefined|_/);
    }
  });
});

describe('what Approve sends', () => {
  const action = md([
    row({ itemIds: [1, 2] }),
    row({ itemIds: [3], name: 'Linen Shirt L', sku: 'LINEN-L', price: '64.00', cost: '24.00', variantCount: 1 })
  ]);

  it('only the rows with a valid new price, each variant once, prices as two-place strings', () => {
    const drafts = { [rowKey(action.items[0])]: draft('48'), [rowKey(action.items[1])]: draft('') };
    const result = buildApproval(action, drafts);
    expect(result.canApprove).toBe(true);
    expect(result.changedRows).toBe(1);
    expect(result.body).toEqual({
      recommendation_id: 'rec-1',
      items: [
        { item_id: 1, new_price: '48.00' },
        { item_id: 2, new_price: '48.00' }
      ]
    });
  });

  it('nothing typed means nothing to approve', () => {
    expect(buildApproval(action, startingDrafts(action.items))).toMatchObject({ canApprove: false, body: null, changedRows: 0 });
  });

  it('a typed price that cannot be sent holds Approve for the whole review, so nothing is dropped quietly', () => {
    const drafts = { [rowKey(action.items[0])]: draft('48.00'), [rowKey(action.items[1])]: draft('70.00') };
    expect(buildApproval(action, drafts)).toMatchObject({ canApprove: false, problems: 1, body: null });
  });

  it('a ticked below-cost row sends the tick on each of its variants and no other row does', () => {
    const drafts = { [rowKey(action.items[0])]: draft('20.00', true), [rowKey(action.items[1])]: draft('50.00') };
    const { body } = buildApproval(action, drafts);
    expect(body?.items).toEqual([
      { item_id: 1, new_price: '20.00', confirm_below_cost: true },
      { item_id: 2, new_price: '20.00', confirm_below_cost: true },
      { item_id: 3, new_price: '50.00' }
    ]);
  });

  it('a tick on a row that is not below cost sends no tick', () => {
    const drafts = { [rowKey(action.items[0])]: draft('48.00', true) };
    expect(buildApproval(action, drafts).body?.items[0]).toEqual({ item_id: 1, new_price: '48.00' });
  });

  it('starts every field empty unless the API sent a price its code computed', () => {
    expect(startingDrafts(action.items)[rowKey(action.items[0])].value).toBe('');
    expect(startingDrafts([row({ suggestedPrice: '45.00' })])[rowKey(row())].value).toBe('45.00');
  });
});

describe('the answer and the failure', () => {
  it('counts changed and unchanged prices and says them plainly', () => {
    expect(readPriceChangeResult({ changed: [{}, {}], unchanged: [{}] })).toEqual({ changed: 2, unchanged: 1 });
    expect(readPriceChangeResult(null)).toEqual({ changed: 0, unchanged: 0 });
    expect(appliedSentence(0)).toBe('Those prices were already set.');
    expect(appliedSentence(1)).toBe('1 price changed.');
    expect(appliedSentence(3)).toBe('3 prices changed.');
  });
  it('reads the server sentence and the rows it marked', () => {
    const failure = readPriceChangeFailure({
      response: {
        status: 400,
        data: {
          detail: 'Nothing was changed.',
          errors: [
            { item_id: 2, code: 'below_cost', detail: 'Below cost.' },
            { item_id: null, detail: 'x' }
          ]
        }
      }
    });
    expect(failure).toEqual({ status: 400, sentence: 'Nothing was changed.', byItem: { 2: 'Below cost.' } });
  });
  it('a 409 carries the server sentence about the POS', () => {
    expect(readPriceChangeFailure({ response: { status: 409, data: { detail: posSentence('Square') } } }).sentence).toBe(
      'Your prices are set in Square. Change them there.'
    );
  });
  it('an error with no body falls back to a plain sentence', () => {
    expect(readPriceChangeFailure(new Error('network')).sentence).toBe(GENERIC_PRICE_FAILURE);
  });
});

describe('the POS list', () => {
  const action = md(
    [row(), row({ itemIds: [3], name: 'Poppy Dress', sku: 'POPPY-001', price: '90.00', cost: null, variantCount: 1 })],
    'Square'
  );
  it('says whose prices they are', () => {
    expect(posSentence('Square')).toBe('Your prices are set in Square. Change them there.');
  });
  it('lists each item with the price now, and the price she typed when she typed one', () => {
    const drafts = { [rowKey(action.items[0])]: draft('48.00') };
    expect(copyListText(action, drafts)).toBe('Linen Shirt (LINEN): now $60.00, new $48.00\nPoppy Dress (POPPY-001): now $90.00');
  });
  it('leaves out a price she typed that is not an amount', () => {
    expect(copyListText(action, { [rowKey(action.items[0])]: draft('abc') })).toContain('Linen Shirt (LINEN): now $60.00\n');
  });
});

describe('reading the action route', () => {
  const base = { recommendation_id: UUID_A, price_apply: 'allyvia' };
  it('reads each kind', () => {
    expect(readAction({ ...base, kind: 'none', items: [], store: null })).toEqual({
      kind: 'none',
      recommendationId: UUID_A,
      priceApply: 'allyvia'
    });
    const order = readAction({
      ...base,
      kind: 'purchase_order',
      items: [
        {
          item_id: 1,
          product_id: UUID_B,
          name: 'Poppy Dress',
          sku: 'POPPY-001',
          size: '',
          color: '',
          store_id: 's',
          store_name: 'Uptown',
          suggestion_id: UUID_B,
          suggested_qty: 17,
          vendor_id: 'v',
          vendor_name: 'Northwind',
          state: 'suggested'
        }
      ]
    });
    expect(order).toMatchObject({
      kind: 'purchase_order',
      items: [{ itemId: 1, suggestedQty: 17, vendorName: 'Northwind', state: 'suggested' }]
    });
    const markdown = readAction({
      ...base,
      kind: 'markdown',
      items: [
        { item_ids: [1, 2], name: 'Linen', sku: 'L', variant_count: 2, price: '60.00', cost: null, on_hand: 4, suggested_price: null }
      ]
    });
    expect(markdown).toMatchObject({ kind: 'markdown', items: [{ itemIds: [1, 2], price: '60.00', cost: null, suggestedPrice: null }] });
  });
  it('a body that is not one reads as null, and the card navigates as before', () => {
    for (const body of [null, 'x', [], {}, { recommendation_id: '' }]) expect(readAction(body)).toBeNull();
  });
  it('a quantity travels only with a suggestion', () => {
    const odd = readAction({
      ...base,
      kind: 'purchase_order',
      items: [{ item_id: 1, state: 'no_suggestion', suggested_qty: 40, suggestion_id: null }]
    });
    expect(odd).toMatchObject({ items: [{ suggestedQty: null }] });
    const ordered = readAction({
      ...base,
      kind: 'purchase_order',
      items: [{ item_id: 1, state: 'ordered', suggested_qty: 40, suggestion_id: UUID_A }]
    });
    expect(ordered).toMatchObject({ items: [{ suggestedQty: null }] });
  });
  it('drops a markdown row with no usable price', () => {
    const body = readAction({
      ...base,
      kind: 'markdown',
      items: [
        { item_ids: [1], price: 'x' },
        { item_ids: [], price: '1.00' }
      ]
    });
    expect(body).toMatchObject({ items: [] });
  });
});

describe('the create-po request', () => {
  const order = (over: Record<string, unknown>) => ({
    itemId: 1,
    productId: UUID_A,
    name: 'Poppy Dress',
    sku: 'POPPY-001',
    size: '',
    color: '',
    storeName: 'Uptown',
    suggestionId: UUID_A,
    suggestedQty: 17,
    vendorName: 'Northwind',
    state: 'suggested' as const,
    ...over
  });
  it('sends each open suggestion once and none for an item without one', () => {
    const items = [
      order({}),
      order({ itemId: 2, suggestionId: UUID_A }),
      order({ itemId: 3, suggestionId: null, state: 'no_suggestion' }),
      order({ itemId: 4, suggestionId: UUID_B, state: 'ordered' })
    ];
    expect(orderableSuggestionIds(items)).toEqual([UUID_A]);
    expect(buildCreatePoRequest(items)).toEqual({ suggestion_ids: [UUID_A] });
  });
  it('is null when no item has a suggestion, so the card navigates as it does today', () => {
    expect(buildCreatePoRequest([order({ suggestionId: null, state: 'no_suggestion' })])).toBeNull();
    expect(buildCreatePoRequest([])).toBeNull();
  });
});

describe('the draft orders sentence', () => {
  it('says one per vendor only when that is true', () => {
    expect(ordersSentence([{ vendorName: 'Northwind' }])).toBe('1 draft order made.');
    expect(ordersSentence([{ vendorName: 'Northwind' }, { vendorName: 'Acme' }])).toBe('2 draft orders made, one per vendor.');
    expect(ordersSentence([{ vendorName: 'Northwind' }, { vendorName: 'northwind' }])).toBe(
      '2 draft orders made, one per vendor and store.'
    );
  });
});

describe('what was made and what was left out', () => {
  const item = (over: Record<string, unknown>) => ({
    itemId: 1,
    productId: UUID_A,
    name: 'Poppy Dress',
    sku: 'POPPY-001',
    size: 'M',
    color: '',
    storeName: 'Uptown',
    suggestionId: UUID_A,
    suggestedQty: 17,
    vendorName: 'Northwind',
    state: 'suggested' as const,
    ...over
  });
  const action: PurchaseOrderAction = {
    kind: 'purchase_order',
    recommendationId: 'rec-1',
    priceApply: 'allyvia',
    items: [
      item({}),
      item({ itemId: 2, name: 'Linen Shirt', sku: 'LINEN-S', size: '', suggestionId: UUID_B, vendorName: null }),
      item({ itemId: 3, name: 'Tote', sku: 'TOTE', suggestionId: null, state: 'no_suggestion' as const }),
      item({ itemId: 4, name: 'Belt', sku: 'BELT', suggestionId: PO_A, state: 'ordered' as const })
    ]
  };
  const created = (orders: unknown[], skipped: unknown[] = []) => ({ purchase_orders: orders, skipped });

  it('one order and nothing left out goes straight to the editor', () => {
    const summary = buildOrdersSummary(
      { ...action, items: [action.items[0]] },
      created([{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }])
    );
    expect(summary.direct).toBe(true);
    expect(summary.orders[0].route).toBe(`/inventory/purchase-orders/${PO_A}`);
  });

  it('two orders are said and linked, not opened', () => {
    const summary = buildOrdersSummary(
      action,
      created([
        { id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' },
        { id: PO_B, po_number: 'PO-2', supplier_name: 'Acme' }
      ])
    );
    expect(summary.direct).toBe(false);
    expect(summary.sentence).toBe('2 draft orders made, one per vendor.');
    expect(summary.orders.map((o) => o.label)).toEqual(['Northwind, PO-1', 'Acme, PO-2']);
  });

  it('an item skipped for no vendor says so and links to where the vendor is set', () => {
    const summary = buildOrdersSummary(
      action,
      created(
        [{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }],
        [{ suggestion_id: UUID_B, reason: 'no_supplier', code: 'no_vendor', sku: 'LINEN-S', name: 'Linen Shirt', product_id: UUID_B }]
      )
    );
    const skipped = summary.leftOut.find((r) => r.key === UUID_B);
    expect(skipped?.reason).toBe('Linen Shirt has no vendor yet.');
    expect(skipped?.fix).toEqual({ label: 'Set a vendor on this item first', href: '/inventory?tab=stock&view=styles&q=LINEN-S' });
    expect(summary.direct).toBe(false);
  });

  it('an older server with no code still reads a no-supplier skip as no vendor', () => {
    expect(readSkipped({ skipped: [{ suggestion_id: UUID_B, reason: 'no_supplier' }] })[0].code).toBe('no_vendor');
    expect(readSkipped({ skipped: [{ suggestion_id: UUID_B, reason: 'not_live' }] })[0].code).toBe('not_live');
  });

  it('says an order already made and an item with no suggestion, and offers no fix for them', () => {
    const summary = buildOrdersSummary(
      { ...action, items: [action.items[0], action.items[2], action.items[3]] },
      created([{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }])
    );
    expect(summary.leftOut.map((r) => r.reason)).toEqual([
      'Tote (M) has no order suggested right now.',
      'Belt (M) is already on an order.'
    ]);
    expect(summary.leftOut.every((r) => r.fix === null)).toBe(true);
  });

  it('names nothing made when nothing was made', () => {
    expect(buildOrdersSummary(action, created([])).sentence).toBe('No draft orders were made.');
  });

  it('the vendor link searches Stock styles for the item', () => {
    expect(vendorFixHref({ sku: 'A B', name: 'x' })).toBe('/inventory?tab=stock&view=styles&q=A+B');
    expect(vendorFixHref({ sku: '', name: 'Tote' })).toBe('/inventory?tab=stock&view=styles&q=Tote');
  });

  it('owner-facing sentences carry no em dash, key or code name', () => {
    const summary = buildOrdersSummary(
      action,
      created(
        [{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }],
        [{ suggestion_id: UUID_B, code: 'no_vendor', sku: 'LINEN-S', name: 'Linen Shirt' }]
      )
    );
    const words = [summary.sentence, ...summary.leftOut.flatMap((r) => [r.reason, r.fix?.label ?? ''])].join(' ');
    expect(words).not.toMatch(/—|no_vendor|suggestion_id|_/);
  });
});
