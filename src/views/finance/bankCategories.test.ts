import { describe, it, expect, vi } from 'vitest';

// api/banking pulls in utils/axios, whose mock handlers touch sessionStorage at
// module scope; these tests need the module's constants, not its client.
vi.mock('utils/axios', () => ({ default: {} }));

import { AxiosError, AxiosHeaders } from 'axios';
import { BANK_CATEGORIES, type BankCategory, type BankCurrency, type ExpenseBucket } from 'api/banking';
import {
  groupedCategories,
  sourceChipLabel,
  reviewSnackbarText,
  coverageLabel,
  expenseCardView,
  merchantRulesPanel,
  retryMerchantRules
} from './bankCategories';

// A per-currency row exactly as /banking/report/ returns it in production today
// (captured 2026-09-22 from a connected bank-mode company). It carries none of
// the categorization fields: the Finance page shipped ahead of the backend that
// sorts bank transactions into expense buckets.
const TODAY_ROW = {
  currency: 'USD',
  cash_in: '3153.21',
  cash_out: '4195.00',
  net_cash_movement: '-1041.79',
  operating_expenses: '2415.00',
  classified_income: '3.21',
  pending_outflows: '42.00',
  pending_inflows: '0.00',
  card_spending: '54.99',
  cash_balance: '18250.44',
  card_balance: '612.30'
};

// The same month once categorization ships (design §4: operating_expenses is
// replaced). Rent and the bank fee are opex, Faire inventory, Adobe unreviewed.
const CATEGORIZED_ROW: BankCurrency = {
  currency: 'USD',
  cash_in: '3153.21',
  cash_out: '4195.00',
  net_cash_movement: '-1041.79',
  expenses_by_bucket: { inventory: '1280.00', labour: '0.00', opex: '2415.00', capex: '0.00', technology: '0.00', marketing: '0.00' },
  expenses_total: '3695.00',
  unclassified_outflow: '54.99',
  coverage: '0.9853',
  transaction_count: 7,
  classified_income: '3.21',
  pending_outflows: '42.00',
  pending_inflows: '0.00',
  card_spending: '54.99',
  cash_balance: '18250.44',
  card_balance: '612.30'
};

const NOTHING_SPENT = { inventory: '0.00', labour: '0.00', opex: '0.00', capex: '0.00', technology: '0.00', marketing: '0.00' };

const httpError = (status: number) =>
  new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', undefined, undefined, {
    status,
    statusText: '',
    data: '',
    headers: {},
    config: { headers: new AxiosHeaders() }
  });
const offline = new AxiosError('Network Error', 'ERR_NETWORK');

describe('bank category grouping', () => {
  it('offers Expenses, Money movement and Other in that order', () => {
    expect(groupedCategories().map((g) => [g.label, g.options.length])).toEqual([
      ['Expenses', 6],
      ['Money movement', 2],
      ['Other', 4]
    ]);
  });
  it('offers every category exactly once, labelled', () => {
    const values = groupedCategories().flatMap((g) => g.options.map((o) => o.value));
    expect([...values].sort()).toEqual((Object.keys(BANK_CATEGORIES) as BankCategory[]).sort());
    expect(new Set(values).size).toBe(values.length);
    for (const option of groupedCategories().flatMap((g) => g.options)) {
      expect(option.label).toBe(BANK_CATEGORIES[option.value]);
    }
  });
});

describe('source chip label', () => {
  it('names who decided the category', () => {
    expect(sourceChipLabel('rule', true, 'opex')).toBe('Pending');
    expect(sourceChipLabel('owner', false, 'opex')).toBe('You');
    expect(sourceChipLabel('rule', false, 'opex')).toBe('Rule');
    expect(sourceChipLabel('none', false, 'needs_review')).toBe('Needs review');
    expect(sourceChipLabel('dictionary', false, 'opex')).toBe('Suggested');
    expect(sourceChipLabel('provider', false, 'labour')).toBe('Suggested');
  });
  it('lets pending outrank every source', () => {
    expect(sourceChipLabel('owner', true, 'needs_review')).toBe('Pending');
  });
});

describe('review snackbar text', () => {
  it('counts only the other transactions a new rule moved', () => {
    expect(reviewSnackbarText(false, 0, 'Faire')).toBe('Saved.');
    expect(reviewSnackbarText(true, 0, 'Faire')).toBe('Saved.');
    expect(reviewSnackbarText(true, 1, 'Faire')).toBe('Saved. Applied to 1 other transaction from "Faire".');
    expect(reviewSnackbarText(true, 14, 'Faire')).toBe('Saved. Applied to 14 other transactions from "Faire".');
  });
});

describe('coverage label', () => {
  it('reads coverage as a whole percentage, and says so when there is no outflow', () => {
    expect(coverageLabel(null)).toBe('No outflow in range');
    expect(coverageLabel('0.9375')).toBe('Coverage 94%');
    expect(coverageLabel('1.0000')).toBe('Coverage 100%');
    expect(coverageLabel('0.0000')).toBe('Coverage 0%');
  });
});

describe('expenses by category card', () => {
  it('reads as not available yet for the report production sends today, rather than crashing on the missing buckets', () => {
    expect(expenseCardView(TODAY_ROW)).toEqual({ state: 'unavailable' });
  });

  it('stays unavailable when any one categorization field is missing, so a partial payload never reaches the table', () => {
    for (const field of ['expenses_by_bucket', 'expenses_total', 'unclassified_outflow', 'coverage'] as const) {
      const row: BankCurrency = { ...CATEGORIZED_ROW };
      delete row[field];
      expect(expenseCardView(row), `without ${field}`).toEqual({ state: 'unavailable' });
    }
  });

  it('lists the six buckets in order with the total, the unreviewed outflow and the coverage', () => {
    expect(expenseCardView(CATEGORIZED_ROW)).toEqual({
      state: 'table',
      rows: [
        { bucket: 'inventory', label: 'Inventory purchase', amount: '$1,280.00' },
        { bucket: 'labour', label: 'Labour / payroll', amount: '$0.00' },
        { bucket: 'opex', label: 'Operating expense', amount: '$2,415.00' },
        { bucket: 'capex', label: 'Capital expense', amount: '$0.00' },
        { bucket: 'technology', label: 'Technology / software', amount: '$0.00' },
        { bucket: 'marketing', label: 'Marketing / advertising', amount: '$0.00' }
      ],
      total: '$3,695.00',
      unclassified: '$54.99',
      coverage: 'Coverage 99%'
    });
  });

  it('shows the empty state only when nothing was classified and there was no outflow to classify', () => {
    const quiet: BankCurrency = {
      ...CATEGORIZED_ROW,
      expenses_by_bucket: NOTHING_SPENT,
      expenses_total: '0.00',
      unclassified_outflow: '0.00',
      coverage: null
    };
    expect(expenseCardView(quiet)).toEqual({ state: 'empty' });
    // Money went out but none of it is sorted yet: the owner has to see how much.
    expect(expenseCardView({ ...quiet, unclassified_outflow: '1334.99', coverage: '0.0000' })).toMatchObject({
      state: 'table',
      total: '$0.00',
      unclassified: '$1,334.99',
      coverage: 'Coverage 0%'
    });
  });

  it('shows a bucket the backend did not send as a dash, never as $0.00', () => {
    const buckets: Partial<Record<ExpenseBucket, string>> = { ...CATEGORIZED_ROW.expenses_by_bucket };
    delete buckets.marketing;
    const view = expenseCardView({ ...CATEGORIZED_ROW, expenses_by_bucket: buckets as Record<ExpenseBucket, string> });
    expect(view.state).toBe('table');
    if (view.state !== 'table') return;
    expect(view.rows[5]).toEqual({ bucket: 'marketing', label: 'Marketing / advertising', amount: '—' });
  });
});

describe('merchant rules panel', () => {
  it('stays out of the way when this backend has no /banking/rules/ route', () => {
    expect(merchantRulesPanel('error', httpError(404))).toBe('hidden');
  });

  it('reports every other failure instead of hiding it', () => {
    expect(merchantRulesPanel('error', httpError(500))).toBe('error');
    expect(merchantRulesPanel('error', httpError(403))).toBe('error');
    expect(merchantRulesPanel('error', offline)).toBe('error');
  });

  it('appears only once the rules have loaded', () => {
    expect(merchantRulesPanel('pending', null)).toBe('hidden');
    expect(merchantRulesPanel('success', null)).toBe('ready');
  });

  it('asks a missing route once, and still retries other failures three times', () => {
    expect(retryMerchantRules(0, httpError(404))).toBe(false);
    expect([0, 1, 2, 3].map((failures) => retryMerchantRules(failures, httpError(500)))).toEqual([true, true, true, false]);
    expect(retryMerchantRules(0, offline)).toBe(true);
  });
});
