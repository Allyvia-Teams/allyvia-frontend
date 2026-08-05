import { describe, expect, it } from 'vitest';

import type { InvoiceAgingData, PaymentSplitData } from 'types/finance';

import { createInvoiceAgingTable, createPaymentMethodsTable } from './financePdfReports';

const splitOf = (methods: PaymentSplitData['payment_methods']): PaymentSplitData => ({ payment_methods: methods });

const agingOf = (summary: InvoiceAgingData['aging_summary']): InvoiceAgingData => ({
  aging_summary: summary,
  aging_details: []
});

describe('createPaymentMethodsTable', () => {
  it('renders each method count as a share of the total count', () => {
    const table = createPaymentMethodsTable(
      splitOf([
        { provider: 'pos_cash', amount: '300.00', count: 3 },
        { provider: 'Credit Card', amount: '100.00', count: 1 }
      ])
    );
    expect(table.rows.map((row) => row.percentage)).toEqual(['75.0%', '25.0%']);
  });

  it('renders an em dash — never NaN% — when every count is zero', () => {
    const table = createPaymentMethodsTable(splitOf([{ provider: 'pos_cash', amount: '0.00', count: 0 }]));
    expect(table.rows[0].percentage).toBe('—');
  });
});

describe('createInvoiceAgingTable', () => {
  it('renders each bucket as a share of the aging total', () => {
    const table = createInvoiceAgingTable(agingOf({ current: 500, days_31_60: 300, days_61_90: 150, over_90: 50, total: 1000 }));
    expect(table.rows.map((row) => row.percentage)).toEqual(['50.0%', '30.0%', '15.0%', '5.0%']);
  });

  it('renders em dashes — never NaN% — when the aging total is zero', () => {
    const table = createInvoiceAgingTable(agingOf({ current: 0, days_31_60: 0, days_61_90: 0, over_90: 0, total: 0 }));
    expect(table.rows.map((row) => row.percentage)).toEqual(['—', '—', '—', '—']);
  });
});
