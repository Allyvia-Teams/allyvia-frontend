import { describe, expect, it } from 'vitest';
import { buildCRMFilterOptions } from './crmAnalyticsFilterOptions';

describe('CRMAnalyticsFilters (ALL-141 FIX 6)', () => {
  it('derives owners, stages, and sources from loaded CRM analytics data', () => {
    const options = buildCRMFilterOptions({
      pipeline: {
        stages: [
          { stage: 'Proposal', count: 3, value: '1000', median_age_days: 5 },
          { stage: 'Negotiation', count: 2, value: '2000', median_age_days: 8 }
        ]
      },
      sources: {
        sources: [
          { source: 'Website', leads: 10, deals: 4, won: 2, conversion_rate: 20, revenue: 5000 },
          { source: 'Referral', leads: 5, deals: 2, won: 1, conversion_rate: 20, revenue: 2500 }
        ]
      },
      reps: {
        reps: [
          { owner: 'Jane Doe', won_revenue: 1000, pipeline_value: 2000, deals_count: 3, avg_deal_size: 500, velocity: 10 },
          { owner: 'John Smith', won_revenue: 800, pipeline_value: 1500, deals_count: 2, avg_deal_size: 400, velocity: 12 }
        ]
      },
      companies: [{ id: 'company-1', name: 'Acme Corp' }]
    });

    expect(options.companies).toEqual([{ id: 'company-1', name: 'Acme Corp' }]);
    expect(options.owners.map((owner) => owner.name)).toEqual(['Jane Doe', 'John Smith']);
    expect(options.stages.map((stage) => stage.name)).toEqual(['Negotiation', 'Proposal']);
    expect(options.sources.map((source) => source.name)).toEqual(['Referral', 'Website']);
  });

  it('returns empty dropdown options instead of hardcoded mock values when CRM data is unavailable', () => {
    const options = buildCRMFilterOptions();

    expect(options.companies).toEqual([]);
    expect(options.owners).toEqual([]);
    expect(options.stages).toEqual([]);
    expect(options.sources).toEqual([]);
    expect(options.priorities).toEqual([]);
  });
});
