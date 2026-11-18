import { describe, expect, it, vi } from 'vitest';

import { ACTION_FLOWS, actOnRecommendation, runPrimaryAction } from './actions';
import { memoryStorage } from './testing/memoryStorage';
import { ORDER_FAILED, prefillMarkdown, prefillPurchaseOrder, type PrefillHost } from './prefillFlows';
import type { PrimaryActionKind, Recommendation } from './types';
import { readVisitRecord } from './visitRecord';

const UUID_A = '11111111-1111-4111-8111-111111111111';
const PO_A = '33333333-3333-4333-8333-333333333333';
const PO_B = '44444444-4444-4444-8444-444444444444';

const live = (
  kind: PrimaryActionKind,
  recommendationId: string | null = 'rec-1'
): Pick<Recommendation, 'id' | 'recommendationId' | 'primaryAction' | 'actionPayload'> => ({
  id: 'pending-1',
  recommendationId: recommendationId ?? undefined,
  primaryAction: { label: 'Review', kind }
});

const orderItem = (over: Record<string, unknown> = {}) => ({
  item_id: 1,
  product_id: UUID_A,
  name: 'Poppy Dress',
  sku: 'POPPY-001',
  size: '',
  color: '',
  store_id: 's',
  store_name: 'Uptown',
  suggestion_id: UUID_A,
  suggested_qty: 17,
  vendor_id: 'v',
  vendor_name: 'Northwind',
  state: 'suggested',
  ...over
});
const orderAction = (items = [orderItem()]) => ({
  recommendation_id: 'rec-1',
  kind: 'purchase_order',
  price_apply: 'allyvia',
  store: null,
  items
});
const markdownAction = (priceApply = 'allyvia') => ({
  recommendation_id: 'rec-1',
  kind: 'markdown',
  price_apply: priceApply,
  store: null,
  items: [
    { item_ids: [1], name: 'Linen Shirt', sku: 'LINEN', variant_count: 1, price: '60.00', cost: '22.00', on_hand: 5, suggested_price: null }
  ]
});

const host = (over: Partial<PrefillHost> = {}): PrefillHost & { navigate: ReturnType<typeof vi.fn>; notify: ReturnType<typeof vi.fn> } =>
  ({
    fetchAction: vi.fn(async () => orderAction()),
    createPurchaseOrders: vi.fn(async () => ({
      purchase_orders: [{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }],
      skipped: []
    })),
    reviewMarkdown: vi.fn(async () => ({ done: true, sentence: '1 price changed.' })),
    showOrders: vi.fn(async () => undefined),
    navigate: vi.fn(),
    notify: vi.fn(),
    ...over
  }) as never;

const deps = (prefillHost?: PrefillHost) => ({ navigate: vi.fn(), notify: vi.fn(), prefillHost });

describe('the order flow', () => {
  it('makes drafts from the suggestions and opens the editor on the one it made', async () => {
    const h = host();
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('done');
    expect(h.createPurchaseOrders).toHaveBeenCalledWith({ suggestion_ids: [UUID_A] });
    expect(h.navigate).toHaveBeenCalledWith(`/inventory/purchase-orders/${PO_A}`);
    expect(h.showOrders).not.toHaveBeenCalled();
  });

  it('shows the orders instead of opening one when it made two', async () => {
    const h = host({
      createPurchaseOrders: vi.fn(async () => ({
        purchase_orders: [
          { id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' },
          { id: PO_B, po_number: 'PO-2', supplier_name: 'Acme' }
        ],
        skipped: []
      }))
    });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('done');
    expect(h.navigate).not.toHaveBeenCalled();
    expect(vi.mocked(h.showOrders).mock.calls[0][0].sentence).toBe('2 draft orders made, one per vendor.');
  });

  it('shows what it left out even when it made one order', async () => {
    const h = host({
      fetchAction: vi.fn(async () => orderAction([orderItem(), orderItem({ item_id: 2, suggestion_id: PO_B, name: 'Tote', sku: 'TOTE' })])),
      createPurchaseOrders: vi.fn(async () => ({
        purchase_orders: [{ id: PO_A, po_number: 'PO-1', supplier_name: 'Northwind' }],
        skipped: [{ suggestion_id: PO_B, code: 'no_vendor', reason: 'no_supplier', sku: 'TOTE', name: 'Tote' }]
      }))
    });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('done');
    expect(h.navigate).not.toHaveBeenCalled();
    expect(vi.mocked(h.showOrders).mock.calls[0][0].leftOut[0].fix?.label).toBe('Set a vendor on this item first');
  });

  it('with no suggestion it makes nothing and the card navigates as it does today', async () => {
    const h = host({
      fetchAction: vi.fn(async () => orderAction([orderItem({ suggestion_id: null, suggested_qty: null, state: 'no_suggestion' })]))
    });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('navigate');
    expect(h.createPurchaseOrders).not.toHaveBeenCalled();
  });

  it('a card of another kind, a card with no Recommendation id and a failed read all navigate', async () => {
    expect(
      await prefillPurchaseOrder(
        live('purchase_order'),
        host({ fetchAction: vi.fn(async () => ({ recommendation_id: 'r', kind: 'none', price_apply: 'allyvia', items: [] })) })
      )
    ).toBe('navigate');
    const h = host();
    expect(await prefillPurchaseOrder(live('purchase_order', null), h)).toBe('navigate');
    expect(h.fetchAction).not.toHaveBeenCalled();
    expect(
      await prefillPurchaseOrder(
        live('purchase_order'),
        host({
          fetchAction: vi.fn(async () => {
            throw new Error('offline');
          })
        })
      )
    ).toBe('navigate');
  });

  it('a failed create-po is said and stops: no navigation, no marking', async () => {
    const h = host({
      createPurchaseOrders: vi.fn(async () => {
        throw new Error('500');
      })
    });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('stopped');
    expect(h.notify).toHaveBeenCalledWith(ORDER_FAILED, 'error');
    expect(h.navigate).not.toHaveBeenCalled();
  });

  it('a create-po that made nothing stops and says so', async () => {
    const h = host({ createPurchaseOrders: vi.fn(async () => ({ purchase_orders: [], skipped: [] })) });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('stopped');
    expect(h.navigate).not.toHaveBeenCalled();
    expect(h.showOrders).not.toHaveBeenCalled();
    expect(h.notify).toHaveBeenCalledWith('No draft orders were made. Check the vendors on these items.', 'error');
  });

  it('when the only item has no vendor, nothing is made, the item is listed with its fix, and the card is not marked', async () => {
    const h = host({
      createPurchaseOrders: vi.fn(async () => ({
        purchase_orders: [],
        skipped: [
          { suggestion_id: UUID_A, code: 'no_vendor', reason: 'no_supplier', sku: 'POPPY-001', name: 'Poppy Dress', product_id: UUID_A }
        ]
      }))
    });
    expect(await prefillPurchaseOrder(live('purchase_order'), h)).toBe('stopped');
    const summary = vi.mocked(h.showOrders).mock.calls[0][0];
    expect(summary.orders).toEqual([]);
    expect(summary.leftOut[0].fix?.label).toBe('Set a vendor on this item first');
    expect(h.navigate).not.toHaveBeenCalled();
  });
});

describe('the markdown flow', () => {
  it('opens the review and is done only when she approved', async () => {
    const approved = host({ fetchAction: vi.fn(async () => markdownAction()) });
    expect(await prefillMarkdown(live('markdown'), approved)).toBe('done');
    expect(approved.notify).toHaveBeenCalledWith('1 price changed.', 'success');
    const cancelled = host({
      fetchAction: vi.fn(async () => markdownAction()),
      reviewMarkdown: vi.fn(async () => ({ done: false, sentence: null }))
    });
    expect(await prefillMarkdown(live('markdown'), cancelled)).toBe('stopped');
    expect(cancelled.notify).not.toHaveBeenCalled();
  });

  it('hands a connected POS payload to the review as it is, so the review can offer no Approve', async () => {
    const h = host({ fetchAction: vi.fn(async () => markdownAction('Square')) });
    await prefillMarkdown(live('markdown'), h);
    expect(vi.mocked(h.reviewMarkdown).mock.calls[0][0].priceApply).toBe('Square');
  });

  it('a card with no markdown items navigates as before', async () => {
    const h = host({ fetchAction: vi.fn(async () => ({ ...markdownAction(), items: [] })) });
    expect(await prefillMarkdown(live('markdown'), h)).toBe('navigate');
    expect(h.reviewMarkdown).not.toHaveBeenCalled();
  });
});

describe('runPrimaryAction with the flows', () => {
  it('reports prefilled only when the draft exists or she approved', async () => {
    const d = deps(host());
    expect(await runPrimaryAction(live('purchase_order'), d)).toMatchObject({ outcome: 'prefilled' });
    expect(d.navigate).not.toHaveBeenCalled();
    const approve = deps(host({ fetchAction: vi.fn(async () => markdownAction()) }));
    expect(await runPrimaryAction(live('markdown'), approve)).toMatchObject({ outcome: 'prefilled' });
  });

  it('reports stopped when the dialog is cancelled or a request fails, and goes nowhere', async () => {
    const cancelled = deps(
      host({ fetchAction: vi.fn(async () => markdownAction()), reviewMarkdown: vi.fn(async () => ({ done: false, sentence: null })) })
    );
    expect(await runPrimaryAction(live('markdown'), cancelled)).toMatchObject({ outcome: 'stopped' });
    expect(cancelled.navigate).not.toHaveBeenCalled();
    const failed = deps(
      host({
        createPurchaseOrders: vi.fn(async () => {
          throw new Error('500');
        })
      })
    );
    expect(await runPrimaryAction(live('purchase_order'), failed)).toMatchObject({ outcome: 'stopped' });
    expect(failed.navigate).not.toHaveBeenCalled();
  });

  it('a flow that throws is said and stops', async () => {
    const flows = {
      ...ACTION_FLOWS,
      markdown: {
        ...ACTION_FLOWS.markdown!,
        prefill: vi.fn(async () => {
          throw new Error('boom');
        })
      }
    };
    const d = deps(host());
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(await runPrimaryAction(live('markdown'), d, flows)).toMatchObject({ outcome: 'stopped' });
    expect(d.notify).toHaveBeenCalled();
  });

  it('with nothing to prefill it navigates as it did', async () => {
    const d = deps(host({ fetchAction: vi.fn(async () => orderAction([orderItem({ suggestion_id: null, state: 'no_suggestion' })])) }));
    expect(await runPrimaryAction(live('purchase_order'), d)).toMatchObject({ outcome: 'navigated' });
    expect(d.navigate).toHaveBeenCalledWith('/inventory/purchase-orders/new');
  });

  it('without a host (Today) or without a Recommendation id every card navigates as before', async () => {
    const fetchAction = vi.fn(async () => orderAction());
    const noHost = deps(undefined);
    expect(await runPrimaryAction(live('purchase_order'), noHost)).toMatchObject({ outcome: 'navigated' });
    const noId = deps(host({ fetchAction }));
    expect(await runPrimaryAction(live('purchase_order', null), noId)).toMatchObject({ outcome: 'navigated' });
    expect(fetchAction).not.toHaveBeenCalled();
  });

  it('other kinds never reach the action route', async () => {
    const h = host();
    for (const kind of ['shift', 'invite', 'payment'] as const)
      expect(await runPrimaryAction(live(kind), deps(h))).toMatchObject({ outcome: 'navigated' });
    expect(h.fetchAction).not.toHaveBeenCalled();
  });
});

describe('actOnRecommendation with the flows', () => {
  const run = async (flowHost: PrefillHost, kind: PrimaryActionKind) => {
    const storage = memoryStorage();
    const onActed = vi.fn();
    const result = await actOnRecommendation(live(kind), { ...deps(flowHost), storage, refreshedAt: 'today', onActed });
    return { result, onActed, record: readVisitRecord(storage, 'today') };
  };

  it('marks the card acted on once the draft exists or she approved', async () => {
    const order = await run(host(), 'purchase_order');
    expect(order.onActed).toHaveBeenCalledWith('pending-1');
    expect(order.record.acted.map((e) => e.id)).toEqual(['pending-1']);
    const review = await run(host({ fetchAction: vi.fn(async () => markdownAction()) }), 'markdown');
    expect(review.onActed).toHaveBeenCalledWith('pending-1');
  });

  it('does not mark it after a cancelled dialog', async () => {
    const out = await run(
      host({ fetchAction: vi.fn(async () => markdownAction()), reviewMarkdown: vi.fn(async () => ({ done: false, sentence: null })) }),
      'markdown'
    );
    expect(out.result.outcome).toBe('stopped');
    expect(out.onActed).not.toHaveBeenCalled();
    expect(out.record.acted).toEqual([]);
  });

  it('does not mark it after a failed create-po', async () => {
    const out = await run(
      host({
        createPurchaseOrders: vi.fn(async () => {
          throw new Error('500');
        })
      }),
      'purchase_order'
    );
    expect(out.onActed).not.toHaveBeenCalled();
    expect(out.record.acted).toEqual([]);
  });
});
