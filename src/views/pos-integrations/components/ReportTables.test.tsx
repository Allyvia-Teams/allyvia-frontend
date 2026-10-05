import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { MonthlyRow, TotalsRow } from 'api/posIntegrations.api';

// Importing anything under api/ pulls utils/axios, whose mock layer touches
// sessionStorage at import time — absent in this environment.
vi.mock('utils/axios', () => ({ default: {} }));

const { MonthlySalesTable, TotalsTable } = await import('./ReportTables');

const row = (entity: string): TotalsRow => ({
  entity,
  source: 2,
  source_derived: false,
  staged: 2,
  valid: 2,
  invalid: 0,
  skipped: 0,
  committed: 0,
  status: 'ok',
  note: 'every source record reached staging'
});

describe('TotalsTable', () => {
  it("names the onboarding import's vendor, staff and expense rows the way it names the rest", () => {
    const html = renderToStaticMarkup(<TotalsTable rows={['vendor', 'employee', 'expense'].map(row)} />);
    expect(html).toContain('Vendors');
    expect(html).toContain('Employees');
    expect(html).toContain('Expenses');
    // the raw key is the fallback for an entity the table has never heard of
    expect(html).not.toMatch(/>vendor</);
  });
});

const month = (over: Partial<MonthlyRow>): MonthlyRow => ({
  month: '2026-07',
  currency: 'USD',
  source: '73.81',
  source_derived: false,
  staged: '73.81',
  staged_orders: 1,
  source_orders: 1,
  delta: '0.00',
  status: 'ok',
  note: null,
  ...over
});

const cells = (html: string) => (html.match(/<td[^>]*>.*?<\/td>/g) ?? []).map((cell) => cell.replace(/<[^>]+>/g, ''));

describe('MonthlySalesTable', () => {
  // The backend reconciles a month per currency (context-graph P8): 1200 JPY
  // plus 73.81 USD is not 1273.81 of anything. Two rows for one month must
  // each say which currency they are, or the merchant reads the same month twice.
  it('names the currency on each row when a month holds two', () => {
    const html = renderToStaticMarkup(
      <MonthlySalesTable
        rows={[
          month({ currency: 'JPY', source: '1200', staged: '1200', source_orders: null }),
          month({ currency: 'USD', source_orders: null })
        ]}
      />
    );
    expect(html).toContain('>Currency<');
    const text = cells(html);
    expect(text).toContain('JPY');
    expect(text).toContain('USD');
    expect(text.filter((cell) => cell === '2026-07')).toHaveLength(2);
  });

  it('keeps the single-currency table exactly as it was: no currency column', () => {
    const html = renderToStaticMarkup(<MonthlySalesTable rows={[month({}), month({ month: '2026-08' })]} />);
    expect(html).not.toContain('>Currency<');
    expect(cells(html)).not.toContain('USD');
  });

  it('says why a month could not be checked, instead of a bare warning', () => {
    const note = 'the source reported this month as one number (1273.81) across currencies, which cannot be split';
    const html = renderToStaticMarkup(
      <MonthlySalesTable
        rows={[
          month({ currency: 'JPY', source: null, delta: null, status: 'warn', note }),
          month({ source: null, delta: null, status: 'warn', note })
        ]}
      />
    );
    expect(html).toContain(note);
  });

  it('still renders a report stored before rows carried a currency', () => {
    const legacy = { ...month({}) } as Partial<MonthlyRow>;
    delete legacy.currency;
    delete legacy.note;
    const html = renderToStaticMarkup(<MonthlySalesTable rows={[legacy as MonthlyRow]} />);
    expect(html).not.toContain('>Currency<');
    expect(cells(html)).toContain('2026-07');
  });
});
