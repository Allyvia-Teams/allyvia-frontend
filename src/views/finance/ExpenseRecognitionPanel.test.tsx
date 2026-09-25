import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ExpenseRecognition } from 'types/expenseCatalogue';
import type { ProfitAndLossData } from 'types/finance';
import { normalizeProfitAndLoss } from 'utils/financeFormat';
import ExpenseRecognitionPanel from './ExpenseRecognitionPanel';

const report: ExpenseRecognition = {
  start_date: '2026-09-01',
  end_date: '2026-09-30',
  as_of: '2026-09-30',
  currencies: {
    USD: { recognized_expenses: '100.00', cash_paid: '200.00', outstanding: '50.00', unclassified: '5.00' },
    CAD: { recognized_expenses: '30.00', cash_paid: '0.00', outstanding: '30.00' }
  },
  coverage: [{ source: 'payroll', available: false, detail: 'Enter confirmed payroll costs manually.' }],
  complete: false,
  confidence: 'partial',
  sources: { native: true, quickbooks: false, vendor_bills: false },
  basis: 'Recognized costs',
  legacy_scalar_basis: 'Bill and purchase spend'
};

describe('recorded expenses panel', () => {
  it('renders currencies, incomplete coverage and accounting distinctions', () => {
    const html = renderToStaticMarkup(<ExpenseRecognitionPanel data={report} />);
    for (const text of [
      'USD',
      'CAD',
      '$100.00',
      '$200.00',
      'Partial expense coverage',
      'Payroll provider',
      'Enter confirmed payroll costs manually.',
      'not operating costs',
      'has not been recalculated'
    ])
      expect(html).toContain(text);
    expect(html).toContain('Recorded expenses by currency');
  });
  it('distinguishes absent data and empty recorded data from zero spending', () => {
    expect(renderToStaticMarkup(<ExpenseRecognitionPanel />)).toContain('not available for this period');
    const html = renderToStaticMarkup(<ExpenseRecognitionPanel data={{ ...report, currencies: {} }} />);
    expect(html).toContain('No expenses recorded');
    expect(html).toContain('Partial expense coverage');
    expect(html).not.toContain('$0.00');
  });
  it('does not display stale values while loading', () => {
    const html = renderToStaticMarkup(<ExpenseRecognitionPanel data={report} loading />);
    expect(html).toContain('Loading recorded expenses');
    expect(html).not.toContain('$100.00');
  });
  it('preserves the breakdown through P&L normalization', () => {
    const payload = { expense_recognition: report } as ProfitAndLossData;
    expect(normalizeProfitAndLoss(payload)?.expense_recognition).toEqual(report);
  });
});
