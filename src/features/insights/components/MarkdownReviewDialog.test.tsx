import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { rowKey, type Draft, type MarkdownAction } from '../actionPrefill';
import { DraftOrdersContent } from './DraftOrdersDialog';
import { MarkdownReviewContent, type MarkdownReviewContentProps } from './MarkdownReviewDialog';

const noop = () => undefined;
const stripStyles = (html: string) => html.replace(/<style[^>]*>[\s\S]*?<\/style>/g, '');

const action = (priceApply = 'allyvia', cost: string | null = '22.00'): MarkdownAction => ({
  kind: 'markdown',
  recommendationId: 'rec-1',
  priceApply,
  items: [{ itemIds: [1, 2], name: 'Linen Shirt', sku: 'LINEN', variantCount: 2, price: '60.00', cost, onHand: 12, suggestedPrice: null }]
});

const render = (a: MarkdownAction, over: Partial<MarkdownReviewContentProps> = {}) =>
  stripStyles(
    renderToStaticMarkup(
      <MarkdownReviewContent
        action={a}
        drafts={{}}
        saving={false}
        failure={null}
        copied={false}
        onValue={noop}
        onTick={noop}
        onApprove={noop}
        onCopy={noop}
        onClose={noop}
        {...over}
      />
    )
  );

const typed = (a: MarkdownAction, value: string, belowCostOk = false): Record<string, Draft> => ({
  [rowKey(a.items[0])]: { value, belowCostOk }
});

describe('the price review when Allyvia is the till', () => {
  it('shows the price now, the cost, the units on hand and the quick buttons', () => {
    const html = render(action());
    expect(html).toContain('Linen Shirt');
    expect(html).toContain('Now $60.00');
    expect(html).toContain(', cost $22.00');
    expect(html).toContain(', 12 on hand');
    expect(html).toContain('2 sizes and colours');
    for (const label of ['10% off', '20% off', '30% off']) expect(html).toContain(label);
    expect(html).toContain('Nothing changes until you approve.');
  });

  it('starts empty: no price comes from the card, and Approve waits', () => {
    const html = render(action());
    expect(html).toMatch(/<input[^>]*value=""/);
    expect(html).toMatch(/data-review-approve[^>]*disabled|disabled[^>]*data-review-approve/);
  });

  it('a valid price enables Approve and says how many changes', () => {
    const a = action();
    const html = render(a, { drafts: typed(a, '48.00') });
    expect(html).toContain('Approve 1 change');
    expect(html).not.toMatch(/disabled=""[^>]*data-review-approve|data-review-approve[^>]*disabled=""/);
  });

  it('below cost shows the warning and the tick, and holds Approve until ticked', () => {
    const a = action();
    const unticked = render(a, { drafts: typed(a, '20.00') });
    expect(unticked).toContain('Below what it cost you ($22.00)');
    expect(unticked).toContain('Sell below cost');
    expect(unticked).toMatch(/data-review-approve[^>]*disabled|disabled[^>]*data-review-approve/);
    const ticked = render(a, { drafts: typed(a, '20.00', true) });
    expect(ticked).toContain('Approve 1 change');
  });

  it('a price that is not a drop is said under the field', () => {
    const a = action();
    expect(render(a, { drafts: typed(a, '61') })).toContain('The new price must be below the price now ($60.00).');
  });

  it('prints no cost when it is not known', () => {
    expect(render(action('allyvia', null))).not.toContain('cost');
  });

  it('shows what the server said about a row and about the whole request', () => {
    const html = render(action(), {
      failure: {
        status: 400,
        sentence: 'Nothing was changed. Fix the items marked and approve again.',
        byItem: { 2: 'Linen Shirt: nope.' }
      }
    });
    expect(html).toContain('Nothing was changed. Fix the items marked and approve again.');
    expect(html).toContain('Linen Shirt: nope.');
  });
});

describe('the price review when a connected POS sets her prices', () => {
  it('has no Approve, no price field and no quick buttons, and says whose prices they are', () => {
    const html = render(action('Square'));
    expect(html).toContain('Your prices are set in Square. Change them there.');
    expect(html).not.toMatch(/Approve/);
    expect(html).not.toContain('data-review-approve');
    expect(html).not.toContain('New price');
    expect(html).not.toContain('% off');
  });

  it('offers the list to copy, and still shows each item', () => {
    const html = render(action('Lightspeed'));
    expect(html).toContain('Copy list');
    expect(html).toContain('Linen Shirt');
    expect(html).toContain('Now $60.00');
    expect(render(action('Lightspeed'), { copied: true })).toContain('Copied');
  });
});

describe('the draft orders made', () => {
  const summary = {
    sentence: '2 draft orders made, one per vendor.',
    direct: false,
    orders: [
      { id: 'a', label: 'Northwind, PO-1', route: '/inventory/purchase-orders/a', vendorName: 'Northwind' },
      { id: 'b', label: 'Acme, PO-2', route: '/inventory/purchase-orders/b', vendorName: 'Acme' }
    ],
    leftOut: [
      {
        key: 'x',
        name: 'Tote',
        reason: 'Tote has no vendor yet.',
        fix: { label: 'Set a vendor on this item first', href: '/inventory?tab=stock&view=styles&q=TOTE' }
      }
    ]
  };
  const html = stripStyles(renderToStaticMarkup(<DraftOrdersContent summary={summary} onOpen={noop} onClose={noop} />));

  it('says how many, that nothing was sent, and links each order', () => {
    expect(html).toContain('2 draft orders made, one per vendor.');
    expect(html).toContain('Nothing has been sent to a vendor.');
    expect(html).toContain('Open Northwind, PO-1');
    expect(html).toContain('Open Acme, PO-2');
  });

  it('lists what was left out with its fix link', () => {
    expect(html).toContain('Not in these orders');
    expect(html).toContain('Tote has no vendor yet.');
    expect(html).toContain('Set a vendor on this item first');
    expect(html).toContain('href="/inventory?tab=stock&amp;view=styles&amp;q=TOTE"');
  });

  it('has no em dash', () => {
    expect(html).not.toContain('—');
  });
});
