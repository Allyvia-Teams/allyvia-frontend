import { describe, expect, it } from 'vitest';
import { buildHealthView, healthQueryKey, visibleHealth, matchesHealthIdentity } from './buildHealthView';

const payload = (health: Record<string, unknown> = {}, scope = 'company') => ({
  company_id: 'c',
  role_id: 'r',
  scope,
  label: scope === 'company' ? 'Business health' : 'Operating health',
  location: null,
  health: {
    score: 62,
    tier: 'yellow',
    mode: 'save',
    provisional: true,
    components: { trajectory: 60 },
    inputs: {},
    reasons: [],
    projection: { label: null, net_12: null, cash_end: null },
    as_of: '2026-10-02',
    ...health
  },
  source: 'live',
  observed_at: '2026-10-02',
  coverage: {}
});
describe('buildHealthView', () => {
  it('says why the runway is unknown when the score names a cash reason', () => {
    const view = buildHealthView(payload({ inputs: { cash_unavailable_reason: 'no_bank_book_balance' } }));
    expect(view?.rows.find((row) => row.key === 'runway')?.fact).toBe('No QuickBooks bank balance is recorded, and takings are not cash.');
    const plain = buildHealthView(payload());
    expect(plain?.rows.find((row) => row.key === 'runway')?.fact).toBe('Unavailable');
  });
  it('says revenue change in words: up, down, level and missing', () => {
    const row = (inputs: Record<string, unknown>, reasons: string[] = []) =>
      buildHealthView(payload({ inputs, reasons, components: { trajectory: 80 } }))?.rows.find((r) => r.key === 'trajectory');
    expect(row({ trajectory_yoy: 0.0862 })?.fact).toBe('Revenue up 9% on the same 3 months last year');
    expect(row({ trajectory_yoy: -0.06 })?.fact).toBe('Revenue down 6% on the same 3 months last year');
    expect(row({ trajectory_yoy: 0.004 })?.fact).toBe('Revenue level with the same 3 months last year');
    expect(row({ trajectory_yoy: -0.004 })?.fact).toBe('Revenue level with the same 3 months last year');
    expect(row({})?.fact).toBe('Unavailable');
    expect(row({ trajectory_yoy: 'x' })?.fact).toBe('Unavailable');
    // Under 13 months the backend compares with the 91 days before, and the wording says so.
    expect(row({ trajectory_yoy: 0.1 }, ['trajectory_provisional_under_13_months'])?.fact).toBe('Revenue up 10% on the 3 months before');
  });
  it('leads every row with the fact and never prints a sub-score', () => {
    const view = buildHealthView(
      payload({
        components: { trajectory: 80, profitability: 40, runway: 55, customer_engine: 62, inventory: 70 },
        inputs: { trajectory_yoy: 0.086, expense_ratio_90d: 0.82, runway_days: 38, repeat_share: 0.31, aged_basis: 'cost' }
      })
    );
    expect(view?.rows.map((r) => r.fact)).toEqual([
      'Revenue up 9% on the same 3 months last year',
      'Expenses are 82% of revenue',
      'About 38 days of cash',
      "31% of the last 3 months' customers bought 2 or more times in the past year",
      'Aged inventory measured at cost'
    ]);
    expect(JSON.stringify(view?.rows)).not.toMatch(/\/100|nominal/);
    expect(view?.scoreText).toBe('62/100');
  });
  it('says a real zero runway and one day plainly', () => {
    const fact = (days: number) => buildHealthView(payload({ inputs: { runway_days: days } }))?.rows[2].fact;
    expect(fact(0)).toBe('About 0 days of cash');
    expect(fact(1)).toBe('About 1 day of cash');
  });
  it('exposes the raw mode only with a score', () => {
    expect(buildHealthView(payload({ mode: 'growth' }))?.modeKey).toBe('growth');
    expect(buildHealthView(payload({ mode: 'save' }))?.modeKey).toBe('save');
    expect(buildHealthView(payload({ score: null, mode: 'save' }))?.modeKey).toBeNull();
    expect(buildHealthView(payload({ mode: 'odd' }))?.modeKey).toBeNull();
  });
  it('rejects missing and unknown scopes', () => {
    expect(buildHealthView(null)).toBeNull();
    expect(buildHealthView(payload({}, 'other'))).toBeNull();
  });
  it('preserves missing score without inventing a tier or mode', () => {
    const view = buildHealthView(payload({ score: null }));
    expect(view?.scoreText).toBe('Not enough data');
    expect(view?.color).toBe('text.secondary');
    expect(view?.mode).toBe('');
  });
  it('shows provisional coverage and all five rows with gaps', () => {
    const view = buildHealthView(payload());
    expect(view?.provisional).toBe(true);
    expect(view?.rows).toHaveLength(5);
    expect(view?.coverage).toContain('Partial coverage');
    expect(view?.rows.find((row) => row.key === 'runway')?.fact).toBe('Unavailable');
  });
  it('keeps the bar provisional when all components exist but source coverage is unverified', () => {
    expect(buildHealthView(payload({ provisional: false }))?.provisional).toBe(true);
  });
  it('keeps store runway omitted and labels operating scope', () => {
    const view = buildHealthView(payload({ components: {}, inputs: {} }, 'location'));
    expect(view?.label).toBe('Operating health');
    expect(view?.rows.find((row) => row.key === 'runway')?.fact).toBe('Unavailable');
  });
  it('does not fabricate projection or money from null or unknown labels', () => {
    for (const label of [null, 'unexpected']) {
      const view = buildHealthView(payload({ projection: { label, net_12: '9999', cash_end: '1111' } }));
      expect(view?.projection).toBe('12-month projection unavailable.');
      expect(JSON.stringify(view)).not.toMatch(/9999|1111|\$/);
    }
  });
  it('distinguishes a measured null runway from a missing runway', () => {
    expect(buildHealthView(payload({ inputs: { runway_days: null }, components: { runway: 100 } }))?.rows[2].fact).toBe(
      'Not burning cash in the observed period'
    );
  });
  it('hides cached results during loading, errors, off/404 and absent identity', () => {
    expect(visibleHealth(payload(), true, true, undefined)).toBeNull();
    expect(visibleHealth(payload(), true, false, { status: 404 })).toBeNull();
    expect(visibleHealth(payload(), true, false, new Error('offline'))).toBeNull();
    expect(visibleHealth(payload(), false, false, undefined)).toBeNull();
  });
  it('explains actual store scope limits in readable copy', () => {
    const view = buildHealthView(
      payload(
        { reasons: ['runway_omitted_company_figure', 'profitability_discounted_allocation', 'green_capped_allocated_profitability'] },
        'location'
      )
    );
    expect(view?.gaps.join(' ')).toContain('allocated expenses');
    expect(view?.gaps.join(' ')).toContain('omitted');
  });
  it('rejects responses for a role or tenant changed during a request', () => {
    expect(matchesHealthIdentity(payload(), 'c', 'r')).toBe(true);
    expect(matchesHealthIdentity(payload(), 'other', 'r')).toBe(false);
    expect(matchesHealthIdentity(payload(), 'c', 'other')).toBe(false);
    expect(matchesHealthIdentity({}, 'c', 'r')).toBe(false);
  });
  it('scopes cache identity to user, tenant and role', () => {
    expect(healthQueryKey('u', 'c', 'r')).not.toEqual(healthQueryKey('u', 'other', 'r'));
    expect(healthQueryKey('u', 'c', 'r')).not.toEqual(healthQueryKey('u', 'c', 'other'));
  });
});
