export const DESTINATIONS = ['this-week', 'customers', 'outreach', 'settings'] as const;
export type Destination = (typeof DESTINATIONS)[number];
export type CustomersView = 'leaderboard' | 'all' | 'prospects';
export type OutreachStatus = 'all' | 'draft' | 'live' | 'ended';
export type OutreachKind = 'discount' | 'event' | 'vote';
export type SettingsSection = 'setup' | 'tiers' | 'benefits';
export type PipelineView = 'leads' | 'deals';

export function parseDestination(v: string | null): Destination {
  return (DESTINATIONS as readonly string[]).includes(v ?? '') ? (v as Destination) : 'this-week';
}
export const parseCustomersView = (v: string | null): CustomersView => (v === 'all' || v === 'prospects' ? v : 'leaderboard');
export const parseOutreachStatus = (v: string | null): OutreachStatus => (v === 'draft' || v === 'live' || v === 'ended' ? v : 'all');
export const parseOutreachKind = (v: string | null): OutreachKind | null => (v === 'discount' || v === 'event' || v === 'vote' ? v : null);
export const parseSettingsSection = (v: string | null): SettingsSection => (v === 'tiers' || v === 'benefits' ? v : 'setup');
export const parsePipelineView = (v: string | null): PipelineView => (v === 'deals' ? 'deals' : 'leads');

const LEGACY: Record<string, Record<string, string>> = {
  setup: { tab: 'settings', section: 'setup' },
  members: { tab: 'customers' },
  pipeline: { tab: 'customers', view: 'prospects' },
  promotions: { tab: 'outreach', kind: 'discount' },
  perks: { tab: 'outreach', kind: 'event' },
  'style-vote': { tab: 'outreach', kind: 'vote' },
  approvals: { tab: 'outreach' },
  tiers: { tab: 'settings', section: 'tiers' },
  benefits: { tab: 'settings', section: 'benefits' }
};

/** The legacy `?tab=` values `legacyTabTarget` maps, derived from `LEGACY` so a row added or removed here shows up here too. */
export const LEGACY_TABS: readonly string[] = Object.keys(LEGACY);

/** Null when `tab` is already a destination (or absent); otherwise the params to replace with. */
export function legacyTabTarget(params: URLSearchParams): URLSearchParams | null {
  const tab = params.get('tab');
  if (!tab || (DESTINATIONS as readonly string[]).includes(tab)) return null;
  const mapped = LEGACY[tab];
  if (!mapped) return new URLSearchParams({ tab: 'this-week' });
  const out = new URLSearchParams(mapped);
  if (tab === 'pipeline' && params.get('view')) out.set('prospects', parsePipelineView(params.get('view')));
  const recordId = params.get('recordId');
  if (recordId) out.set('recordId', recordId);
  return out;
}

export function buildCrmRedirectTarget(params: URLSearchParams): string {
  const tab = params.get('tab');
  const recordId = params.get('recordId');
  if (tab === 'leads' || tab === 'deals') {
    const target = new URLSearchParams({ tab: 'customers', view: 'prospects', prospects: tab });
    if (recordId) target.set('recordId', recordId);
    return `/inner-circle?${target.toString()}`;
  }
  if (tab === 'contacts' && recordId) return `/inner-circle?${new URLSearchParams({ tab: 'customers', recordId }).toString()}`;
  return '/inner-circle?tab=customers';
}
