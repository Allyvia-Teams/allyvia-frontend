import { describe, expect, it } from 'vitest';

import type { RuleProposal } from 'api/ruleProposals.api';

import {
  NEW_VENDOR,
  REVIEW_BLURB,
  REVIEW_TITLE,
  chooseVendor,
  confirmBlocker,
  confirmPayload,
  reviewButtonLabel,
  reviewDraft,
  valueText,
  vendorLine,
  vendorOptions
} from './ruleProposals';

const base: RuleProposal = {
  id: 'p1',
  kind: 'vendor_rule',
  status: 'proposed',
  quote: 'they make us buy at least a hundred units per order and the minimum is $500.',
  fields: { min_order_units: 100, min_order_value: '500.00' },
  spoken_name: 'Northwind',
  supplier_id: 's1',
  supplier_name: 'Northwind',
  current: { min_order_units: 50, min_order_value: null },
  suggestions: [],
  category_label: null,
  created_at: null,
  decided_by_email: null,
  decided_at: null
};

const unmatched: RuleProposal = {
  ...base,
  id: 'p2',
  fields: { description: 'Chunky knitwear', min_order_units: 24 },
  spoken_name: 'Juniper Knits',
  supplier_id: null,
  supplier_name: null,
  current: null,
  suggestions: [{ id: 's2', name: 'Juniper Knit Co', is_active: true }]
};

const storeRule: RuleProposal = {
  ...base,
  id: 'p3',
  kind: 'store_rule',
  fields: { statement: 'We do not reorder jewelry.', category_key: 'jewelry' },
  spoken_name: null,
  supplier_id: null,
  supplier_name: null,
  current: null,
  category_label: 'Jewelry'
};

const vendors = [
  { id: 's1', name: 'Northwind', min_order_units: 50, min_order_value: null, description: '' },
  { id: 's2', name: 'Juniper Knit Co', min_order_units: 24, min_order_value: null, description: 'Wool' },
  { id: 's3', name: 'Acme', min_order_units: null, min_order_value: null, description: '' }
];

describe('default ticks', () => {
  it('unticks a field that would overwrite a different value the vendor has, ticks the rest', () => {
    const draft = reviewDraft(base);
    expect(draft.fields.map((f) => [f.key, f.ticked, f.current])).toEqual([
      ['min_order_units', false, 'Now: 50 units'],
      ['min_order_value', true, null]
    ]);
  });

  it('ticks a field whose value is the same as the vendor has', () => {
    const draft = reviewDraft({ ...base, current: { min_order_units: 100, min_order_value: '500.00' } });
    expect(draft.fields.every((f) => f.ticked && f.current === null)).toBe(true);
  });

  it('treats "Not sure" as no value today', () => {
    const draft = reviewDraft({ ...base, fields: { reorder_policy: 'seasonal' }, current: { reorder_policy: 'unknown' } });
    expect(draft.fields[0]).toMatchObject({ ticked: true, current: null, value: 'seasonal' });
  });

  it('a picked vendor decides the ticks the same way, and typed values are kept', () => {
    let draft = reviewDraft(unmatched);
    expect(draft.fields.every((f) => f.ticked)).toBe(true);
    draft = { ...draft, fields: draft.fields.map((f) => (f.key === 'description' ? { ...f, value: 'Knitwear' } : f)) };
    draft = chooseVendor(draft, unmatched, 's2', vendors);
    expect(draft.vendor).toEqual({ mode: 'existing', supplierId: 's2' });
    expect(draft.fields.map((f) => [f.key, f.value, f.ticked, f.current])).toEqual([
      ['description', 'Knitwear', false, 'Now: Wool'],
      ['min_order_units', '24', true, null]
    ]);
  });
});

describe('the payload has only the ticked fields', () => {
  it('sends the ticked field, typed as the backend reads it, and the matched vendor', () => {
    expect(confirmPayload(reviewDraft(base))).toEqual({ fields: { min_order_value: '500.00' }, supplier_id: 's1' });
  });

  it('sends an edited value and leaves out every unticked field', () => {
    const draft = reviewDraft(base);
    const fields = draft.fields.map((f) => (f.key === 'min_order_units' ? { ...f, ticked: true, value: '120' } : { ...f, ticked: false }));
    expect(confirmPayload({ ...draft, fields })).toEqual({ fields: { min_order_units: 120 }, supplier_id: 's1' });
  });

  it('nothing ticked means no Confirm', () => {
    const draft = reviewDraft(base);
    const none = { ...draft, fields: draft.fields.map((f) => ({ ...f, ticked: false })) };
    expect(confirmBlocker(none)).toBe('Tick at least one thing to save.');
    expect(() => confirmPayload(none)).toThrow();
  });

  it('a ticked value the vendor form would refuse blocks Confirm', () => {
    const draft = reviewDraft({ ...base, fields: { order_ahead_days: 900 }, current: { order_ahead_days: null } });
    expect(confirmBlocker(draft)).toBe('Fix the highlighted values.');
  });
});

describe('an unmatched vendor needs a choice before Confirm', () => {
  it('blocks until a vendor is chosen', () => {
    const draft = reviewDraft(unmatched);
    expect(draft.vendor).toEqual({ mode: 'none' });
    expect(confirmBlocker(draft)).toBe('Choose the vendor this is about.');
  });

  it('a new vendor starts with the spoken name and needs one', () => {
    const draft = chooseVendor(reviewDraft(unmatched), unmatched, NEW_VENDOR, vendors);
    expect(draft.vendor).toEqual({ mode: 'new', name: 'Juniper Knits' });
    expect(confirmPayload(draft)).toEqual({
      fields: { description: 'Chunky knitwear', min_order_units: 24 },
      create_vendor: true,
      name: 'Juniper Knits'
    });
    expect(confirmBlocker({ ...draft, vendor: { mode: 'new', name: ' ' } })).toBe('Give the new vendor a name.');
  });

  it('offers the close names first, then the other vendors, then New vendor', () => {
    expect(vendorOptions(unmatched, vendors).map((o) => o.label)).toEqual(['Juniper Knit Co', 'Acme', 'Northwind', 'New vendor']);
  });

  it('says which vendor a row is about', () => {
    expect(vendorLine(base)).toBe('About Northwind');
    expect(vendorLine(unmatched)).toBe('Said as "Juniper Knits". Which vendor is this?');
  });
});

describe('store rules', () => {
  it('sends the edited sentence and the category, or no category', () => {
    const draft = reviewDraft(storeRule);
    expect(confirmPayload(draft)).toEqual({ fields: { statement: 'We do not reorder jewelry.', category_key: 'jewelry' } });
    expect(confirmPayload({ ...draft, statement: ' No jewelry reorders ', categoryKey: '' })).toEqual({
      fields: { statement: 'No jewelry reorders', category_key: null }
    });
  });

  it('needs a sentence of at most 300 characters', () => {
    const draft = reviewDraft(storeRule);
    expect(confirmBlocker({ ...draft, statement: '  ' })).toBe('Write the rule in a sentence.');
    expect(confirmBlocker({ ...draft, statement: 'x'.repeat(301) })).toMatch(/300 characters/);
  });
});

describe('words', () => {
  it('shows values in store words', () => {
    expect(valueText('order_ahead_days', 150)).toBe('150 days');
    expect(valueText('min_order_value', '500.00')).toBe('$500.00');
    expect(valueText('reorder_policy', 'seasonal')).toBe('One order per season');
    expect(valueText('min_order_units', null)).toBe('Not set');
  });

  it('the button shows only when there is something to review', () => {
    expect(reviewButtonLabel(0)).toBeNull();
    expect(reviewButtonLabel(3)).toBe('Review suggested rules (3)');
  });

  it('never says how the suggestion was made', () => {
    const copy = [REVIEW_TITLE, ...Object.values(REVIEW_BLURB), reviewButtonLabel(2) ?? ''].join(' ');
    expect(copy).not.toMatch(/\bAI\b|model|proposal/i);
  });
});
