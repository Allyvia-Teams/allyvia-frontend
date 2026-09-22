import type {
  CRMAnalyticsDealAgingResponse,
  CRMAnalyticsOverviewResponse,
  CRMAnalyticsPipelineResponse,
  CRMAnalyticsRepsResponse,
  CRMAnalyticsSourcesResponse,
  CRMAnalyticsStalledResponse,
  CRMRepPerformanceResponse
} from 'types/analytics';

export interface CRMFilterOption {
  id: string;
  name: string;
}

export interface CRMFilterOptionsInput {
  pipeline?: CRMAnalyticsPipelineResponse | null;
  overview?: CRMAnalyticsOverviewResponse | null;
  sources?: CRMAnalyticsSourcesResponse | null;
  reps?: CRMAnalyticsRepsResponse | null;
  repPerformance?: CRMRepPerformanceResponse | null;
  stalled?: CRMAnalyticsStalledResponse | null;
  dealAging?: CRMAnalyticsDealAgingResponse | null;
  companies?: CRMFilterOption[];
}

export interface CRMFilterOptions {
  companies: CRMFilterOption[];
  owners: CRMFilterOption[];
  stages: CRMFilterOption[];
  priorities: CRMFilterOption[];
  sources: CRMFilterOption[];
}

function uniqueOptions(values: Array<string | undefined | null>): CRMFilterOption[] {
  const seen = new Set<string>();
  const options: CRMFilterOption[] = [];

  for (const value of values) {
    const trimmed = value?.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    options.push({ id: trimmed, name: trimmed });
  }

  return options.sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Derive CRM filter dropdown options from loaded analytics responses.
 *
 * Priority options are intentionally empty: CRM analytics has no priority
 * dimension endpoint today. When one is added, wire it here instead of
 * inventing placeholder values.
 */
export function buildCRMFilterOptions(input: CRMFilterOptionsInput = {}): CRMFilterOptions {
  const stageNames = [
    ...(input.pipeline?.stages?.map((stage) => stage.stage) ?? []),
    ...(input.overview?.series?.pipeline_by_stage?.map((stage) => stage.stage) ?? []),
    ...(input.dealAging?.matrix?.map((cell) => cell.stage) ?? [])
  ];

  const ownerNames = [
    ...(input.reps?.reps?.map((rep) => rep.owner) ?? []),
    ...(input.repPerformance?.leaderboard?.map((row) => row.owner) ?? []),
    ...(input.stalled?.deals?.map((deal) => deal.owner) ?? [])
  ];

  const sourceNames = input.sources?.sources?.map((source) => source.source) ?? [];

  return {
    companies: input.companies ?? [],
    owners: uniqueOptions(ownerNames),
    stages: uniqueOptions(stageNames),
    priorities: [],
    sources: uniqueOptions(sourceNames)
  };
}
