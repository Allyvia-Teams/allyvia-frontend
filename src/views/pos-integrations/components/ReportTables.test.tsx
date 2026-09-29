import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { TotalsRow } from 'api/posIntegrations.api';

// Importing anything under api/ pulls utils/axios, whose mock layer touches
// sessionStorage at import time — absent in this environment.
vi.mock('utils/axios', () => ({ default: {} }));

const { TotalsTable } = await import('./ReportTables');

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
