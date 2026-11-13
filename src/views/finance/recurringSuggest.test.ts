import { describe, expect, it } from 'vitest';
import type { ExpenseCategory, SuggestedGroup } from 'types/expenseCatalogue';
import { cadenceSentence, CHOICES, payloadFor, payloadsFor, rowsFor, savedMessage, sentenceMoney, withCategory } from './recurringSuggest';

const group = (over: Partial<SuggestedGroup> = {}): SuggestedGroup => ({
  payee: 'Oak Street Landlord',
  name: 'Shop lease',
  amount: '1200.00',
  currency: 'USD',
  category_id: 'cat-rent',
  category_name: 'Rent',
  treatment: 'operating_expense',
  count: 3,
  dates: ['2026-07-01', '2026-08-01', '2026-09-01'],
  entry_ids: ['e1', 'e2', 'e3'],
  suggested_cadence: 'monthly',
  start_date: '2026-10-01',
  day_of_month: 1,
  starts: { weekly: '2026-09-08', biweekly: '2026-09-15', monthly: '2026-10-01', yearly: '2027-09-01' },
  ...over
});

const categories: ExpenseCategory[] = [
  { id: 'cat-rent', name: 'Rent', group: 'opex', default_treatment: 'operating_expense', active: true },
  { id: 'cat-equip', name: 'Equipment', group: 'capex', default_treatment: 'capital_expenditure', active: true }
];

describe('the cadence sentence', () => {
  it('says monthly with the day', () => {
    expect(cadenceSentence({ amount: '1200.00', currency: 'USD', cadence: 'monthly', day_of_month: 1, start_date: '2026-10-01' })).toBe(
      '$1,200 every month on day 1'
    );
  });
  it('says every two weeks without a day', () => {
    expect(cadenceSentence({ amount: '85.00', currency: 'USD', cadence: 'biweekly', day_of_month: 14, start_date: '2026-10-14' })).toBe(
      '$85 every two weeks'
    );
  });
  it('says weekly and yearly', () => {
    expect(cadenceSentence({ amount: '20.00', currency: 'USD', cadence: 'weekly', day_of_month: 3, start_date: '2026-10-03' })).toBe(
      '$20 every week'
    );
    expect(cadenceSentence({ amount: '900.00', currency: 'USD', cadence: 'yearly', day_of_month: 10, start_date: '2026-03-10' })).toBe(
      '$900 every year on 10 March'
    );
  });
  it('reads a row with no cadence as monthly, as every older row was', () => {
    expect(cadenceSentence({ amount: '4500.00', currency: 'USD', day_of_month: 15, start_date: '2026-09-15' })).toBe(
      '$4,500 every month on day 15'
    );
  });
  it('keeps the cents when the amount is not whole', () => {
    expect(sentenceMoney('85.50', 'USD')).toBe('$85.50');
    expect(sentenceMoney('85.00', 'USD')).toBe('$85');
  });
  it('does not print a dash, a formula or a key', () => {
    const text = ['weekly', 'biweekly', 'monthly', 'yearly'].map((cadence) =>
      cadenceSentence({ amount: '10.00', currency: 'USD', cadence, day_of_month: 1, start_date: '2026-01-01' })
    );
    for (const line of text) expect(line).not.toMatch(/[—–_×]/);
  });
});

describe('the rows', () => {
  it('presets the picker to the suggestion and to Never when there is none', () => {
    const [a, b] = rowsFor([group(), group({ suggested_cadence: null, start_date: null, entry_ids: ['x', 'y'] })]);
    expect(a.choice).toBe('monthly');
    expect(b.choice).toBe('never');
  });
  it('carries payee, amount, how many times and the category', () => {
    const [row] = rowsFor([group()]);
    expect([row.payee, row.amountLabel, row.countLabel, row.categoryName]).toEqual(['Oak Street Landlord', '$1,200', '3 times', 'Rent']);
  });
  it('offers Never, Weekly, Every two weeks, Monthly, Yearly in that order', () => {
    expect(CHOICES.map((c) => c.label)).toEqual(['Never', 'Weekly', 'Every two weeks', 'Monthly', 'Yearly']);
  });
  it('takes the new category and its usual treatment', () => {
    const [row] = rowsFor([group()]);
    const moved = withCategory(row, 'cat-equip', categories);
    expect([moved.categoryId, moved.categoryName, moved.treatment]).toEqual(['cat-equip', 'Equipment', 'capital_expenditure']);
    expect(withCategory(row, 'gone', categories)).toBe(row);
  });
});

describe('the payloads', () => {
  it('builds a monthly template that starts after the last imported row', () => {
    const [row] = rowsFor([group()]);
    expect(payloadFor(row, 'req-1')).toEqual({
      request_id: 'req-1',
      name: 'Shop lease',
      amount: '1200.00',
      currency: 'USD',
      category_id: 'cat-rent',
      treatment: 'operating_expense',
      payee: 'Oak Street Landlord',
      source_reference: 'Repeats of 3 imported expenses, 2026-07-01 to 2026-09-01',
      start_date: '2026-10-01',
      day_of_month: 1,
      cadence: 'monthly'
    });
  });
  it('uses the start date for a weekly or biweekly day, and the cadence picked, not the suggestion', () => {
    const [row] = rowsFor([group()]);
    const weekly = payloadFor({ ...row, choice: 'weekly' }, 'r');
    expect([weekly?.cadence, weekly?.start_date, weekly?.day_of_month]).toEqual(['weekly', '2026-09-08', 8]);
    const biweekly = payloadFor({ ...row, choice: 'biweekly' }, 'r');
    expect([biweekly?.start_date, biweekly?.day_of_month]).toEqual(['2026-09-15', 15]);
    const yearly = payloadFor({ ...row, choice: 'yearly' }, 'r');
    expect([yearly?.start_date, yearly?.day_of_month]).toEqual(['2027-09-01', 1]);
  });
  it('creates nothing for Never', () => {
    const rows = rowsFor([group(), group({ payee: 'Cleaner', entry_ids: ['c1', 'c2'], count: 2 })]).map((r) => ({
      ...r,
      choice: 'never' as const
    }));
    expect(payloadFor(rows[0], 'r')).toBeNull();
    expect(payloadsFor(rows, () => 'r')).toEqual([]);
  });
  it('makes one payload per repeating row, each with its own request id', () => {
    const rows = rowsFor([
      group(),
      group({ payee: 'Cleaner', entry_ids: ['c1', 'c2'], count: 2, suggested_cadence: 'biweekly' }),
      group({ payee: 'One', entry_ids: ['o1', 'o2'], suggested_cadence: null })
    ]);
    const made = payloadsFor(rows, (row) => `id-${row.payee}`);
    expect(made.map((p) => [p.payee, p.cadence, p.request_id])).toEqual([
      ['Oak Street Landlord', 'monthly', 'id-Oak Street Landlord'],
      ['Cleaner', 'biweekly', 'id-Cleaner']
    ]);
  });
});

describe('the saved message', () => {
  it('counts', () => {
    expect(savedMessage(0)).toBe('Nothing set to repeat.');
    expect(savedMessage(1)).toBe('1 repeating expense saved.');
    expect(savedMessage(2)).toBe('2 repeating expenses saved.');
  });
});
