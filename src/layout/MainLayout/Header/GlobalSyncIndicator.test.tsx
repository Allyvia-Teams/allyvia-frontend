import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { IntegrationSync } from 'views/pos-integrations/globalSync';

// The hook reaches Redux, react-query and the API clients; the chip only needs
// what it returns.
const hook = vi.hoisted(() => ({ items: [] as IntegrationSync[] }));
vi.mock('hooks/useGlobalSync', () => ({
  useGlobalSync: () => ({ items: hook.items, importing: false, retry: () => undefined, retrying: null })
}));

import GlobalSyncIndicator, { IntegrationRow } from './GlobalSyncIndicator';

const item = (over: Partial<IntegrationSync> = {}): IntegrationSync => ({
  key: 'quickbooks',
  label: 'QuickBooks',
  state: 'importing',
  datasets: [],
  progress: { done: 0, total: null },
  error: null,
  retry: null,
  path: '/integrations/quickbooks',
  ...over
});

const render = (node: ReactElement) => renderToStaticMarkup(<MemoryRouter>{node}</MemoryRouter>);
const row = (over: Partial<IntegrationSync>) =>
  render(<IntegrationRow item={item(over)} onRetry={() => undefined} retrying={false} onNavigate={() => undefined} />);

describe('GlobalSyncIndicator chip', () => {
  beforeEach(() => {
    hook.items = [];
  });

  it('renders nothing when no first import is running or failed', () => {
    hook.items = [];
    expect(render(<GlobalSyncIndicator />)).toBe('');
  });

  it('says how far the first import has got', () => {
    hook.items = [item({ progress: { done: 3, total: 10 } })];
    const html = render(<GlobalSyncIndicator />);
    expect(html).toContain('Importing 3 of 10');
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).toContain('MuiChip-colorPrimary');
  });

  it('says Review needed in the warning color for an import waiting for approval', () => {
    hook.items = [
      item({ key: 'pos:c1', label: 'Shopify', state: 'review', retry: { kind: 'open', path: '/integrations/pos/runs/r1/report' } })
    ];
    const html = render(<GlobalSyncIndicator />);
    expect(html).toContain('Review needed');
    expect(html).toContain('MuiChip-colorWarning');
  });

  it('counts failures in the error color', () => {
    hook.items = [item({ state: 'failed', error: 'Stopped.' })];
    const html = render(<GlobalSyncIndicator />);
    expect(html).toContain('1 sync failed');
    expect(html).toContain('MuiChip-colorError');
  });
});

describe('IntegrationRow', () => {
  it('shows a check and the count for a done dataset, A of B and a thin bar for one in progress', () => {
    const html = row({
      state: 'importing',
      datasets: [
        { label: 'Accounts', done: true, count: 1240, total: 1240 },
        { label: 'Orders', done: false, count: 50, total: 200 }
      ]
    });
    expect(html).toContain('aria-label="Done"');
    expect(html).toContain('1,240');
    expect(html).toContain('50 of 200');
    expect(html).toContain('role="progressbar"');
    expect(html).toContain('aria-valuenow="25"');
  });

  it('shows no bar while the total is unknown', () => {
    const html = row({ state: 'importing', datasets: [{ label: 'Customers', done: false, count: 7, total: null }] });
    expect(html).toContain('7 so far');
    expect(html).not.toContain('role="progressbar"');
  });

  it('says nothing is written yet and links to the report when an import waits for review', () => {
    const html = row({
      key: 'pos:c1',
      label: 'Shopify',
      state: 'review',
      retry: { kind: 'open', path: '/integrations/pos/runs/r1/report' }
    });
    expect(html).toContain('Your import is ready to review. Nothing has been written yet.');
    expect(html).toContain('href="/integrations/pos/runs/r1/report"');
    expect(html).toContain('>Open<');
    expect(html).not.toContain('role="progressbar"');
  });

  it('shows the error and a Retry button when failed', () => {
    const html = row({ state: 'failed', error: 'Shopify refused the token.', retry: { kind: 'pos_import', connectionId: 'c1' } });
    expect(html).toContain('Shopify refused the token.');
    expect(html).toContain('Retry');
  });

  it('shows one A of B row from the job when the source has no datasets', () => {
    const html = row({ progress: { done: 3, total: 10 } });
    expect(html).toContain('3 of 10');
    expect(html).toContain('aria-valuenow="30"');
  });

  it('says it can take a while when nothing is counted yet', () => {
    expect(row({ key: 'bank', label: 'Bank' })).toContain('This can take a few minutes.');
  });

  it('sends a bank first scan past the cutoff to Bank with an Open button', () => {
    const html = row({
      key: 'bank',
      label: 'Bank',
      state: 'failed',
      error: 'The first bank scan has not finished. Open Bank to retry.',
      retry: { kind: 'open', path: '/integrations/bank' }
    });
    expect(html).toContain('The first bank scan has not finished. Open Bank to retry.');
    expect(html).toContain('>Open<');
  });

  it('shows no badge, no bar and no Complete or Up to date text for a finished import', () => {
    const html = row({ state: 'complete', datasets: [{ label: 'Accounts', done: true, count: 4, total: 4 }] });
    expect(html).not.toContain('aria-label="Done"');
    expect(html).not.toContain('role="progressbar"');
    expect(html).not.toMatch(/Complete|Up to date|Importing/);
  });
});
