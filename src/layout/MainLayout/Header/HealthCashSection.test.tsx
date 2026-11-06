import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildCashContextView } from 'health/buildCashContextView';
import { HealthCashSectionView } from './HealthCashSection';

const observed = buildCashContextView({
  basis: 'health_cash_context/1',
  status: 'observed',
  cash: { amount: '3000.00', currency: 'USD', unavailable_reason: null, verified: false },
  payables: { USD: { recorded: '580.00', due_buckets: { overdue: '80.00', '8_through_30_days': '500.00' } } },
  payables_complete: true,
  reservations: { allocation_overlap: 'within_supplied_projection', not_submitted_by_currency: { USD: '100.00' } },
  possibly_paid_by_bank: { status: 'unavailable' }
});

describe('health drawer cash section', () => {
  it('renders nothing when the context was not requested or is unknown', () => {
    expect(renderToStaticMarkup(<HealthCashSectionView view={null} loading={false} failed={false} />)).toBe('');
  });

  it('labels the section and says what is happening while it loads or after a failure', () => {
    const loading = renderToStaticMarkup(<HealthCashSectionView view={null} loading failed={false} />);
    expect(loading).toContain('aria-labelledby="health-cash-title"');
    expect(loading).toContain('Loading cash and bills');
    expect(loading).toContain('role="status"');
    expect(loading).toContain('aria-live="polite"');
    expect(renderToStaticMarkup(<HealthCashSectionView view={null} loading={false} failed />)).toContain(
      'Cash and bills could not be read right now.'
    );
  });

  it('shows the book balance, the bills by bucket and the scheduled payments as part of them', () => {
    const html = renderToStaticMarkup(<HealthCashSectionView view={observed} loading={false} failed={false} />);
    expect(html).toContain('$3,000.00 in QuickBooks bank accounts, as recorded (not a verified balance)');
    expect(html).toContain('$580.00 in recorded bills');
    expect(html).toContain('Overdue: $80.00');
    expect(html).toContain('Due in 8 to 30 days: $500.00');
    expect(html).toContain('$100.00 scheduled to pay bills but not yet sent (already counted in the bills above)');
    expect(html).toContain('<ul');
    expect(html).toContain('Context only: the score does not use these figures.');
  });

  it('shows a permission message instead of figures', () => {
    const view = buildCashContextView({ basis: 'health_cash_context/1', status: 'not_permitted' });
    const html = renderToStaticMarkup(<HealthCashSectionView view={view} loading={false} failed={false} />);
    expect(html).toContain('Cash and bills are shown to roles with finance access.');
    expect(html).not.toContain('recorded bills');
  });
});
