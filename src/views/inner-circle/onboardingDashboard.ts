/**
 * Pure derivations for the Inner Circle onboarding dashboard.
 *
 * Everything the screen decides lives here rather than in the component,
 * because vitest runs in the `node` environment in this repo -- there is no
 * jsdom and no testing-library, so nothing rendered can be asserted on. A
 * rule that lives in JSX is a rule with no test.
 */

import type {
  DashboardDataQuality,
  DashboardTiers,
  DuplicateGroup,
  EnrolmentFunnel,
  LadderProposal,
  TierReadiness,
  TopSpender
} from 'api/innerCircle.api';

export interface FunnelStage {
  key: string;
  label: string;
  value: number;
  /** Share of the customer base, 0-100, rounded to one decimal. */
  percent: number;
  tone: 'default' | 'success' | 'warning' | 'alert' | 'gold';
  hint: string;
}

/**
 * Percent of a base, guarding the zero denominator.
 *
 * A brand-new shop has zero customers, and `0/0` renders as "NaN%" -- which
 * is the first thing an owner would see on the first screen they open.
 */
export function share(value: number, base: number): number {
  if (!base || base <= 0) return 0;
  return Math.round((value / base) * 1000) / 10;
}

/**
 * The funnel, as tiles.
 *
 * `unreachable` is deliberately its own stage rather than folded into
 * "not enrolled". A customer with neither a phone nor a real email is not a
 * to-do the owner can work: they can hold a tier and top the leaderboard and
 * still never receive anything. Showing it separately is what stops
 * "333 of 379 enrolled" reading as a failure rather than as a ceiling.
 */
export function buildFunnelStages(funnel: EnrolmentFunnel): FunnelStage[] {
  const base = funnel.customers;
  return [
    {
      key: 'customers',
      label: 'Customers',
      value: funnel.customers,
      percent: 100,
      tone: 'default',
      hint: 'Everyone in your customer list, after duplicates are merged.'
    },
    {
      key: 'in_inner_circle',
      label: 'In Inner Circle',
      value: funnel.in_inner_circle,
      percent: share(funnel.in_inner_circle, base),
      tone: 'success',
      hint: 'Has a membership. Spend and tier are accruing for them already.'
    },
    {
      key: 'claimed',
      label: 'Using the app',
      value: funnel.claimed,
      percent: share(funnel.claimed, base),
      tone: 'gold',
      hint: 'Signed in and confirmed their membership on their own device.'
    },
    {
      key: 'not_in_inner_circle',
      label: 'Not enrolled',
      value: funnel.not_in_inner_circle,
      percent: share(funnel.not_in_inner_circle, base),
      tone: funnel.not_in_inner_circle > 0 ? 'warning' : 'default',
      hint: 'No membership yet. Pre-fill creates one for anyone reachable.'
    },
    {
      key: 'unreachable',
      label: 'No way to reach',
      value: funnel.unreachable,
      percent: share(funnel.unreachable, base),
      tone: funnel.unreachable > 0 ? 'alert' : 'default',
      hint: 'No phone and no real email on file, so they cannot be enrolled at all.'
    }
  ];
}

/**
 * How many customers pre-fill could still enrol.
 *
 * NOT `not_in_inner_circle`: that count includes the unreachable, and
 * offering to enrol somebody the server will skip is a button that lies.
 */
export function enrollableCount(funnel: EnrolmentFunnel): number {
  return Math.max(0, funnel.not_in_inner_circle - funnel.unreachable);
}

export interface TierBarSegment {
  name: string;
  customers: number;
  percent: number;
  threshold: string | null;
  color: string | null;
}

/**
 * The tier distribution as bar segments, highest rung first.
 *
 * Sorted by rank descending because an owner reads a tier list top-down:
 * Vault is the answer to "who are my best customers", and burying it under
 * three other rungs is the wrong emphasis.
 */
export function buildTierSegments(tiers: DashboardTiers): TierBarSegment[] {
  const total = tiers.levels.reduce((sum, level) => sum + level.customers, 0) + tiers.untiered;
  const segments = [...tiers.levels]
    .sort((a, b) => b.rank - a.rank)
    .map((level) => ({
      name: level.name,
      customers: level.customers,
      percent: share(level.customers, total),
      threshold: level.threshold ?? null,
      color: level.color || null
    }));
  if (tiers.untiered > 0) {
    segments.push({
      name: 'Not tiered',
      customers: tiers.untiered,
      percent: share(tiers.untiered, total),
      threshold: null,
      color: null
    });
  }
  return segments;
}

export interface DashboardAction {
  key: string;
  severity: 'blocked' | 'todo' | 'done';
  title: string;
  detail: string;
  /** Which control on the page resolves it, so the card can link. */
  cta: 'review-duplicates' | 'create-ladder' | 'prefill' | 'collect-details' | null;
}

/**
 * The ordered to-do list. ORDER IS THE POINT, and it is not cosmetic:
 *
 *   1. Merge duplicates. A duplicate splits a person's spend, so tiering
 *      first assigns the wrong tier to precisely the top customers.
 *   2. Set thresholds. Without a ladder a shop with deep history is tiered
 *      by the fallback engine, which measures the last 90 days from the
 *      IMPORT date -- so the whole base reads as recent whales and then
 *      demotes together.
 *   3. Enrol. A membership made before tiering shows the customer a tile
 *      with the wrong tier on it, and a displayed tier is a promise.
 *
 * Anything out of that order produces a confidently wrong screen, which is
 * worse than an empty one.
 */
export function buildActions(funnel: EnrolmentFunnel, quality: DashboardDataQuality, readiness: TierReadiness): DashboardAction[] {
  const actions: DashboardAction[] = [];

  const dupes = quality.duplicates;
  if (dupes.groups > 0) {
    actions.push({
      key: 'duplicates',
      severity: 'todo',
      title: `${dupes.groups} customer${dupes.groups === 1 ? '' : 's'} on the list twice`,
      detail:
        `${dupes.contacts_removable} extra record${dupes.contacts_removable === 1 ? '' : 's'} to fold away. ` +
        'Until they are merged, those customers’ spend is split across two rows, ' +
        'so your best customers are ranked and tiered too low.',
      cta: 'review-duplicates'
    });
  } else {
    actions.push({
      key: 'duplicates',
      severity: 'done',
      title: 'No duplicate customers found',
      detail: 'Every customer appears once, so spend and tiers are counted whole.',
      cta: null
    });
  }

  if (!readiness.ready) {
    actions.push({
      key: 'ladder',
      severity: 'blocked',
      title: 'Set your tiers before anyone is categorised',
      detail: readiness.reason,
      cta: 'create-ladder'
    });
  } else if (readiness.engine === 'ladder') {
    actions.push({
      key: 'ladder',
      severity: 'done',
      title: 'Tiers are set',
      detail: readiness.reason,
      cta: null
    });
  } else {
    actions.push({
      key: 'ladder',
      severity: 'todo',
      title: 'Using the default ranking, not your own thresholds',
      detail: readiness.reason,
      cta: 'create-ladder'
    });
  }

  const enrollable = enrollableCount(funnel);
  if (enrollable > 0) {
    actions.push({
      key: 'prefill',
      severity: 'todo',
      title: `${enrollable} customer${enrollable === 1 ? '' : 's'} ready to add to Inner Circle`,
      detail:
        'Each one gets a membership that is waiting for them the first time they open the app. ' +
        'Nothing is sent to anybody, and no marketing consent is granted.',
      cta: 'prefill'
    });
  } else if (funnel.in_inner_circle > 0) {
    actions.push({
      key: 'prefill',
      severity: 'done',
      title: 'Everyone reachable is in Inner Circle',
      detail: `${funnel.in_inner_circle} membership${funnel.in_inner_circle === 1 ? '' : 's'}, accruing spend and tier.`,
      cta: null
    });
  }

  if (funnel.unreachable > 0) {
    actions.push({
      key: 'unreachable',
      severity: 'todo',
      title: `${funnel.unreachable} customer${funnel.unreachable === 1 ? '' : 's'} with no phone or email`,
      detail:
        'They can be tiered but never enrolled or contacted. Collecting a phone number ' +
        'at the till is the only thing that changes this.',
      cta: 'collect-details'
    });
  }

  return actions;
}

/** Money the wire sends as a decimal STRING. Never parsed into a float for display. */
export function formatMoney(value: string | number | null | undefined, currency = 'USD'): string {
  if (value === null || value === undefined || value === '') return '—';
  const numeric = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(numeric)) return '—';
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 0
    }).format(numeric);
  } catch {
    // Intl throws RangeError on a currency code that is not three letters,
    // and this runs inside render -- a settings typo must not blank the page.
    return `${Math.round(numeric)}`;
  }
}

/** Plain-language reason a duplicate group was proposed. */
export const MATCH_REASON_COPY: Record<string, string> = {
  email: 'same email address',
  phone_and_name: 'same phone number and name',
  phone: 'same phone number',
  external_id: 'same record id in the same system',
  name_and_contact: 'same name, and contact details that line up'
};

export function describeReasons(reasons: string[]): string {
  if (!reasons.length) return 'looks like the same person';
  return reasons.map((r) => MATCH_REASON_COPY[r] ?? r.replace(/_/g, ' ')).join(', ');
}

/**
 * What merging a group would change, for the confirm copy.
 *
 * The spend delta is the number that makes the case: it is what the customer
 * has really spent and what nothing on the old screen showed.
 */
export function describeMergeEffect(group: DuplicateGroup, currency = 'USD'): string {
  const primarySpend = Number(group.primary.net_spend || 0);
  const combined = Number(group.combined_spend || 0);
  const extra = group.duplicates.length;
  const rows = `${extra} duplicate record${extra === 1 ? '' : 's'}`;
  if (combined > primarySpend) {
    return (
      `Folds ${rows} into ${group.primary.name}, whose spend becomes ` +
      `${formatMoney(combined, currency)} instead of ${formatMoney(primarySpend, currency)}.`
    );
  }
  return `Folds ${rows} into ${group.primary.name}. Combined spend ${formatMoney(combined, currency)}.`;
}

/** A ladder proposal read back as sentences an owner can check. */
export function describeProposal(proposal: LadderProposal, currency = 'USD'): string[] {
  return proposal.levels
    .filter((level) => level.rank > 0)
    .map(
      (level) =>
        `${level.name} at ${formatMoney(level.threshold, currency)} and above — ` +
        `${level.customers_at_this_level} customer${level.customers_at_this_level === 1 ? '' : 's'} here today.`
    );
}

/** Why a spend figure is what it is, shown beside it so the claim is legible. */
export function describeBasis(basis: TopSpender['basis']): string {
  if (basis === 'imported') return 'from an imported summary';
  if (basis === 'pos') return 'from sales on file';
  return 'no spend recorded';
}

export function membershipLabel(status: TopSpender['membership_status']): string {
  if (status === 'claimed') return 'Using the app';
  if (status === 'provisional') return 'Membership waiting';
  if (status === 'declined') return 'Declined';
  return 'Not enrolled';
}
