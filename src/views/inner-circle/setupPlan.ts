import type { EnrolmentFunnel, SaleLinkRate, SetupLadder, SetupPlan, SetupPlanStep, TierReadiness } from 'api/innerCircle.api';
import { formatMoney } from './onboardingDashboard';

// ==============================|| INNER CIRCLE — ONE-STEP SETUP ||============================== //
//
// The copy for GET/POST /api/inner-circle/setup/. The server rehearses the
// whole chain and rolls it back, so these lines describe what confirming
// WILL do, not an estimate. Kept out of the component because vitest runs
// in the `node` environment here: a rule in a .tsx file is a rule with no
// test.

/** The order the server runs the chain in. Load-bearing, not cosmetic:
 *  sales linked before tiering count toward the tier; duplicates merged
 *  before tiering are ranked as one whole person; nobody is enrolled before
 *  their tier is known, because a displayed tier is a promise. */
export const SETUP_STEP_ORDER = ['link_sales', 'merge_duplicates', 'ladder', 'tiers', 'enrol'] as const;

export interface SetupLine {
  key: SetupPlanStep['key'];
  severity: 'ok' | 'nothing' | 'blocked';
  title: string;
  detail: string;
}

const plural = (n: number, one: string, many = `${one}s`) => `${n.toLocaleString('en-US')} ${n === 1 ? one : many}`;

export function describeLinkRate(rate: SaleLinkRate | null | undefined, noun = 'sales'): string | null {
  if (!rate || !rate.sales || rate.rate === null) return null;
  return `${rate.linked.toLocaleString('en-US')} of ${rate.sales.toLocaleString('en-US')} ${noun} name a customer (${Math.round(rate.rate * 100)}%)`;
}

function describeLevels(ladder: SetupLadder, currency: string): string {
  return ladder.levels.map((level) => `${level.name} from ${formatMoney(level.threshold, currency)}`).join(' · ');
}

/** Whether the Setup card should lead the page: customers are in, and
 *  either there are no tiers of the owner's own or nobody is enrolled. */
export function needsSetup(funnel: EnrolmentFunnel, readiness: TierReadiness): boolean {
  if (funnel.customers === 0) return false;
  return readiness.engine !== 'ladder' || funnel.in_inner_circle === 0;
}

export function describeSetupPlan(plan: SetupPlan, currency = 'USD'): SetupLine[] {
  const byKey = new Map(plan.steps.map((step) => [step.key, step] as const));
  const lines: SetupLine[] = [];

  const link = byKey.get('link_sales');
  if (link && link.key === 'link_sales') {
    const after = describeLinkRate(link.link_rate_after);
    const afterSentence = after ? `Afterwards ${after.replace(' name ', ' will name ')}.` : 'No sales on file yet.';
    lines.push(
      link.would_link > 0
        ? {
            key: 'link_sales',
            severity: 'ok',
            title: `Link ${plural(link.would_link, 'imported sale')} to ${link.would_link === 1 ? 'a customer' : 'customers'} already on your list`,
            detail: `Matched on the email address the sale was recorded with — exact matches only. ${afterSentence}`
          }
        : {
            key: 'link_sales',
            severity: 'nothing',
            title: 'No more sales to link',
            detail: after ? `${after}. The rest carry no customer details, which is usual for walk-in sales.` : 'No sales on file yet.'
          }
    );
  }

  const merge = byKey.get('merge_duplicates');
  if (merge && merge.key === 'merge_duplicates') {
    const review =
      merge.review_groups > 0
        ? ` ${plural(merge.review_groups, 'possible duplicate')} (a shared phone, different names) stay separate for you to check.`
        : '';
    lines.push(
      merge.rows_folded > 0
        ? {
            key: 'merge_duplicates',
            severity: 'ok',
            title: `Merge ${plural(merge.rows_folded, 'duplicate record')}`,
            detail: `Only where the email or the source system's id matches, so each person's spend is counted whole before tiering.${review}`
          }
        : {
            key: 'merge_duplicates',
            severity: 'nothing',
            title: 'No duplicates to merge',
            detail: review.trim() || 'Every customer appears once.'
          }
    );
  }

  const ladder = byKey.get('ladder');
  if (ladder && ladder.key === 'ladder') {
    if (ladder.action === 'create' && ladder.proposal) {
      lines.push({
        key: 'ladder',
        severity: 'ok',
        title: 'Create your tiers',
        detail:
          `${describeLevels(ladder.proposal, currency)} — drawn from your own customers' lifetime spend. ` +
          'You can rename or change them later under Tiers.'
      });
    } else if (ladder.action === 'keep' && ladder.active_ladder) {
      lines.push({
        key: 'ladder',
        severity: 'nothing',
        title: 'Keep your tiers',
        detail: describeLevels(ladder.active_ladder, currency)
      });
    } else {
      lines.push({
        key: 'ladder',
        severity: 'nothing',
        title: 'No tiers can be drawn yet',
        detail: 'None of your customers has spend on file, so there is nothing to set thresholds from.'
      });
    }
  }

  const tiers = byKey.get('tiers');
  if (tiers && tiers.key === 'tiers') {
    lines.push(
      tiers.ready
        ? {
            key: 'tiers',
            severity: 'ok',
            title: 'Place every customer on their tier',
            detail: tiers.distribution?.length
              ? tiers.distribution.map((level) => `${level.customers.toLocaleString('en-US')} ${level.name}`).join(' · ')
              : tiers.reason
          }
        : { key: 'tiers', severity: 'blocked', title: 'Tiers cannot be set yet', detail: tiers.reason }
    );
  }

  const enrol = byKey.get('enrol');
  if (enrol && enrol.key === 'enrol' && plan.ready) {
    const ceiling =
      enrol.skipped_no_identity > 0
        ? ` ${enrol.skipped_no_identity.toLocaleString('en-US')} have no phone or email on file and can't be added.`
        : '';
    lines.push(
      enrol.would_enrol > 0
        ? {
            key: 'enrol',
            severity: 'ok',
            title: `Add ${plural(enrol.would_enrol, 'customer')} to Inner Circle`,
            detail:
              'Each gets a membership waiting for them in the app, with their tier already counted. ' +
              `Nothing is sent to anybody and no marketing consent is granted.${ceiling}`
          }
        : {
            key: 'enrol',
            severity: 'nothing',
            title: 'Everyone reachable is already in Inner Circle',
            detail: ceiling.trim() || 'No one is left to add.'
          }
    );
  } else {
    lines.push({
      key: 'enrol',
      severity: 'blocked',
      title: 'Nobody is added until tiers can be set',
      detail: 'A membership shows the customer their tier, so none is created before the tier is right.'
    });
  }

  return lines;
}

/** The ladder to send with the confirm: exactly the one on screen, so a
 *  proposal recomputed between preview and click cannot move a threshold
 *  the owner accepted. Undefined when the shop keeps its own ladder. */
export function setupLadderToSend(plan: SetupPlan): SetupLadder | undefined {
  const ladder = plan.steps.find((step) => step.key === 'ladder');
  if (!ladder || ladder.key !== 'ladder' || ladder.action !== 'create' || !ladder.proposal) return undefined;
  return {
    window: ladder.proposal.window,
    grace_days: ladder.proposal.grace_days,
    levels: ladder.proposal.levels.map((level) => ({ rank: level.rank, name: level.name, threshold: level.threshold }))
  };
}
