export const SECTION_TABS = ['members', 'pipeline', 'promotions', 'approvals', 'perks', 'style-vote', 'benefits'] as const;
export type SectionTab = (typeof SECTION_TABS)[number];

export function parseSectionTab(value: string | null): SectionTab {
  return (SECTION_TABS as readonly string[]).includes(value ?? '') ? (value as SectionTab) : 'members';
}

export type PipelineView = 'leads' | 'deals';

export function parsePipelineView(value: string | null): PipelineView {
  return value === 'deals' ? 'deals' : 'leads';
}

// Legacy /crm?tab=&recordId= links → merged Inner Circle equivalents.
// tasks/notes drop recordId: legacy CRMMain never passed deepLinkRecordId to
// those tabs, and task/note ids cannot be resolved client-side (api/crm.ts
// has no getTask/getNote).
export function buildCrmRedirectTarget(params: URLSearchParams): string {
  const tab = params.get('tab');
  const recordId = params.get('recordId');

  if (tab === 'leads' || tab === 'deals') {
    const target = new URLSearchParams({ tab: 'pipeline', view: tab });
    if (recordId) target.set('recordId', recordId);
    return `/inner-circle?${target.toString()}`;
  }

  if (tab === 'contacts' && recordId) {
    return `/inner-circle?${new URLSearchParams({ tab: 'members', recordId }).toString()}`;
  }

  return '/inner-circle?tab=members';
}
