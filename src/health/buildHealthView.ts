import type { OutreachHealth } from '../api/innerCircle.api';

export interface HealthResponse {
  company_id: string;
  role_id: string;
  scope: 'company' | 'location';
  label: 'Business health' | 'Operating health';
  location: { id: string; name: string } | null;
  health: OutreachHealth;
  source: 'live' | 'snapshot';
  observed_at: string;
  coverage: {
    full_business_coverage_verified: boolean;
    health_finance_source_alignment_verified: boolean;
    signal_coverage?: unknown;
  };
}
export const healthQueryKey = (user: string, company: string, role: string) => ['health', user, company, role, 'company'] as const;
export function matchesHealthIdentity(payload: unknown, company: string, role: string): payload is HealthResponse {
  if (!payload || typeof payload !== 'object') return false;
  const data = payload as HealthResponse;
  return data.company_id === company && data.role_id === role;
}
export function visibleHealth(data: unknown, enabled: boolean, loading: boolean, error: unknown) {
  return enabled && !loading && !error ? buildHealthView(data) : null;
}
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const tierColors: Record<string, string> = { red: 'error.main', yellow: 'warning.main', green: 'success.main' };
const projectionLabels: Record<string, string> = {
  grow: 'At this pace: growth projected over 12 months.',
  stagnate: 'At this pace: limited growth projected over 12 months.',
  fail: 'At this pace: financial pressure projected over 12 months.'
};
const names = {
  trajectory: 'Revenue trajectory',
  profitability: 'Profitability',
  runway: 'Cash runway',
  customer_engine: 'Customer engine',
  inventory: 'Inventory'
};
const reasons: Record<string, string> = {
  no_prior_revenue: 'Prior revenue is unavailable.',
  trajectory_provisional_under_13_months: 'Revenue history covers less than 13 months.',
  expenses_unobserved: 'Expenses are unobserved.',
  quickbooks_withheld: 'QuickBooks expenses are withheld for the selected financial source.',
  profitability_unavailable: 'Profitability cannot be measured from the observed revenue.',
  cash_unobserved: 'Cash balance is unobserved.',
  customer_engine_unavailable: 'Customer activity coverage is incomplete.',
  inventory_unavailable: 'Inventory coverage is incomplete.',
  green_capped_no_profitability: 'The tier is capped because profitability is unobserved.',
  growth_capped_runway_unknown: 'Growth mode is capped because cash runway is unknown.',
  projection_unavailable_expenses: 'The projection is unavailable because expenses are unobserved.',
  runway_omitted_company_figure: 'Company cash runway is omitted from store health.',
  profitability_discounted_allocation: 'Store profitability uses allocated expenses and is discounted.',
  green_capped_allocated_profitability: 'The tier is capped because store profitability uses allocated expenses.'
};

/** Supported evidence only. Unknown fields never become a fabricated metric. */
export function buildHealthView(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null;
  const response = payload as HealthResponse;
  if (!['company', 'location'].includes(response.scope) || !response.health || typeof response.health !== 'object') return null;
  const health = response.health;
  const inputs = health.inputs ?? {};
  const components = health.components ?? {};
  const score = finite(health.score) && health.score >= 0 && health.score <= 100 ? health.score : null;
  const percent = (key: string) => (finite(inputs[key]) ? `${Math.round((inputs[key] as number) * 100)}%` : null);
  const details: Record<string, string | null> = {
    trajectory: percent('trajectory_yoy') === null ? null : `Revenue change: ${percent('trajectory_yoy')} (nominal)`,
    profitability: percent('expense_ratio_90d') === null ? null : `Expenses / revenue: ${percent('expense_ratio_90d')}`,
    runway: finite(inputs.runway_days)
      ? `${inputs.runway_days} days`
      : Object.hasOwn(inputs, 'runway_days') && inputs.runway_days === null && finite(components.runway)
        ? 'Not burning cash in the observed period'
        : null,
    customer_engine: percent('repeat_share') === null ? null : `Repeat customer share: ${percent('repeat_share')}`,
    inventory: inputs.aged_basis === 'cost' ? 'Aged inventory measured at cost' : null
  };
  return {
    label: response.scope === 'location' ? 'Operating health' : 'Business health',
    location: response.scope === 'location' ? response.location?.name : null,
    score,
    scoreText: score === null ? 'Not enough data' : `${score}/100`,
    color: score === null ? 'text.secondary' : (tierColors[health.tier ?? ''] ?? 'text.secondary'),
    mode: score !== null && ['save', 'growth'].includes(health.mode ?? '') ? `${health.mode === 'save' ? 'Save' : 'Growth'} mode` : '',
    provisional:
      health.provisional === true ||
      response.coverage?.full_business_coverage_verified !== true ||
      response.coverage?.health_finance_source_alignment_verified !== true,
    rows: Object.entries(names).map(([key, label]) => ({
      key,
      label,
      score: finite(components[key]) ? `${components[key]}/100` : 'Unavailable',
      detail: details[key] ?? 'Unavailable'
    })),
    gaps: (Array.isArray(health.reasons) ? health.reasons : []).map(
      (reason) => reasons[reason] ?? 'An additional coverage limitation was reported.'
    ),
    projection: projectionLabels[health.projection?.label ?? ''] ?? '12-month projection unavailable.',
    coverage:
      'Partial coverage: some business data is missing or unverified. This assessment may change as more information becomes available.',
    asOf: health.as_of,
    source: response.source,
    observedAt: response.observed_at
  };
}
export type HealthView = NonNullable<ReturnType<typeof buildHealthView>>;
