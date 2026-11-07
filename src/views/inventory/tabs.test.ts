import { describe, expect, it } from 'vitest';

import {
  buyingAttentionCount,
  DEFAULT_VIEW,
  INVENTORY_TABS,
  inventoryHref,
  normalizedWorkspaceParams,
  readWorkspaceParams,
  REPORT_VIEWS,
  tabSubtitle,
  VIEWS_BY_TAB,
  withoutParam,
  withQuery
} from './tabs';
import { getSearchResultPath } from 'types/globalSearch';

const read = (s: string) => readWorkspaceParams(new URLSearchParams(s));

describe('readWorkspaceParams', () => {
  it('defaults to Today', () => {
    expect(read('')).toEqual({ tab: 'today', view: null, creating: false, query: '' });
  });

  it('reads the tab case-insensitively and defaults its view', () => {
    expect(read('?tab=Stock')).toMatchObject({ tab: 'stock', view: 'styles' });
  });

  it('falls back to Today for an unknown or empty tab', () => {
    expect(read('?tab=nope').tab).toBe('today');
    expect(read('?tab=').tab).toBe('today');
  });

  it('validates the view against the tab', () => {
    expect(read('?tab=buying&view=foo').view).toBe('orders');
    expect(read('?tab=buying&view=PLAN').view).toBe('plan');
  });

  it('reads creating as exactly new=1', () => {
    expect(read('?tab=counts&new=1').creating).toBe(true);
    expect(read('?tab=counts&new=0').creating).toBe(false);
  });

  it('sends a bare itemId link to Stock items', () => {
    expect(read('?itemId=12')).toMatchObject({ tab: 'stock', view: 'items' });
  });

  it('trims q', () => {
    expect(read('?tab=stock&q=  navy  ').query).toBe('navy');
  });
});

describe('vocabulary', () => {
  it('has a default view for every tab, inside its views', () => {
    for (const tab of INVENTORY_TABS) {
      const d = DEFAULT_VIEW[tab];
      if (d === null) expect(VIEWS_BY_TAB[tab]).toHaveLength(0);
      else expect(VIEWS_BY_TAB[tab]).toContain(d);
    }
  });

  it('builds report views from the insights slugs', () => {
    expect(REPORT_VIEWS).not.toContain('recommendations');
    expect(REPORT_VIEWS).toContain('sell-through');
    expect(REPORT_VIEWS).toContain('quickbooks');
  });
});

describe('inventoryHref', () => {
  it('writes tab, then view, then extras', () => {
    expect(inventoryHref('today')).toBe('/inventory?tab=today');
    expect(inventoryHref('stock', 'items', { itemId: '12' })).toBe('/inventory?tab=stock&view=items&itemId=12');
  });
});

describe('withQuery', () => {
  it('joins by whether base has a query', () => {
    expect(withQuery('/inventory?tab=today', { suggestion: 'x' })).toBe('/inventory?tab=today&suggestion=x');
    expect(withQuery('/inventory', { a: '1' })).toBe('/inventory?a=1');
    expect(withQuery('/x', {})).toBe('/x');
    expect(withQuery('/x', new URLSearchParams('a=1'))).toBe('/x?a=1');
  });
});

describe('buyingAttentionCount', () => {
  it('counts submitted and partially received', () => {
    expect(
      buyingAttentionCount([{ status: 'draft' }, { status: 'submitted' }, { status: 'partially_received' }, { status: 'received' }])
    ).toBe(2);
  });
});

describe('tabSubtitle', () => {
  it('joins the count and refreshed clauses', () => {
    expect(tabSubtitle('today', { today: 9, refreshedAt: '7:02 AM' })).toBe('9 things to do · suggestions refreshed today at 7:02 AM');
  });

  it('omits missing clauses and singularises', () => {
    expect(tabSubtitle('today', { today: null, refreshedAt: '7:02 AM' })).toBe('suggestions refreshed today at 7:02 AM');
    expect(tabSubtitle('today', { today: 1 })).toBe('1 thing to do');
    expect(tabSubtitle('today', {})).toBe('');
  });

  it('gives each other tab one plain sentence', () => {
    for (const tab of INVENTORY_TABS.filter((t) => t !== 'today')) {
      expect(tabSubtitle(tab, {})).not.toBe('');
    }
  });
});

describe('getSearchResultPath', () => {
  it('opens an inventory hit in the Stock tab', () => {
    expect(getSearchResultPath({ id: '12', label: 'x', group: 'Inventory', type: 'inventory' })).toBe(
      '/inventory?tab=stock&view=items&itemId=12'
    );
  });
});

describe('withoutParam', () => {
  it('deletes only the named key and keeps tab/view', () => {
    const before = new URLSearchParams('tab=stock&view=items&itemId=1');
    expect(withoutParam(before, 'itemId').toString()).toBe('tab=stock&view=items');
    // A copy: the input is untouched.
    expect(before.get('itemId')).toBe('1');
  });
});

describe('normalizedWorkspaceParams', () => {
  const norm = (q: string) => normalizedWorkspaceParams(new URLSearchParams(q))?.toString() ?? null;

  it('writes the resolved tab and view into a bare ?itemId= link, keeping itemId', () => {
    expect(norm('itemId=3')).toBe('tab=stock&view=items&itemId=3');
  });

  it('writes nothing when a tab is present or there is no itemId', () => {
    expect(norm('tab=today')).toBeNull();
    expect(norm('tab=stock&view=items&itemId=3')).toBeNull();
    expect(norm('')).toBeNull();
  });
});
