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
    expect(view?.rows.find((row) => row.key === 'runway')?.detail).toBe('Unavailable');
  });
  it('keeps the bar provisional when all components exist but source coverage is unverified', () => {
    expect(buildHealthView(payload({ provisional: false }))?.provisional).toBe(true);
  });
  it('keeps store runway omitted and labels operating scope', () => {
    const view = buildHealthView(payload({ components: {}, inputs: {} }, 'location'));
    expect(view?.label).toBe('Operating health');
    expect(view?.rows.find((row) => row.key === 'runway')?.detail).toBe('Unavailable');
  });
  it('does not fabricate projection or money from null or unknown labels', () => {
    for (const label of [null, 'unexpected']) {
      const view = buildHealthView(payload({ projection: { label, net_12: '9999', cash_end: '1111' } }));
      expect(view?.projection).toBe('12-month projection unavailable.');
      expect(JSON.stringify(view)).not.toMatch(/9999|1111|\$/);
    }
  });
  it('distinguishes a measured null runway from a missing runway', () => {
    expect(buildHealthView(payload({ inputs: { runway_days: null }, components: { runway: 100 } }))?.rows[2].detail).toBe(
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
