// views/inventory/flowLinks.ts
//
// U7 (2026-11-06): two flows the owner must never confuse, one line each way.
//
//   - Inventory › Buying › Plan (/inventory/plan) is for sitting down to order
//     a whole season: drop a line sheet, get a proposal.
//   - Inventory › Buying › Insights (/inventory/insights, Recommendations tab)
//     is the day-to-day, in-season nudges: reorder this now, an event next
//     week lifts a category, a style is about to run out.
//
// Each page carries one sentence pointing at the other. The words and the
// targets live here so the tests can pin them and the two pages cannot drift.

import { insightsTabIndex, type InsightsTabSlug } from './insights';

export interface FlowLink {
  /** The question, read as plain text before the link. */
  lead: string;
  /** The link's own words. */
  label: string;
  href: string;
}

export const PLAN_PATH = '/inventory/plan';
export const INVENTORY_INSIGHTS_PATH = '/inventory/insights';

const RECOMMENDATIONS_SLUG: InsightsTabSlug = 'recommendations';

/** On the inventory insights view, toward Plan. */
export const INSIGHTS_TO_PLAN: FlowLink = {
  lead: 'Planning a whole season?',
  label: 'Open Plan',
  href: PLAN_PATH
};

/**
 * On Plan, toward the in-season nudges. Names the tab explicitly rather than
 * leaning on the page's default, so a later change of default cannot send her
 * to a chart.
 */
export const PLAN_TO_INSIGHTS: FlowLink = {
  lead: 'Something came up this week?',
  label: 'See inventory insights',
  href: `${INVENTORY_INSIGHTS_PATH}?tab=${RECOMMENDATIONS_SLUG}`
};

// Evaluated at import so a slug that stops existing fails every test that loads this module.
if (insightsTabIndex(RECOMMENDATIONS_SLUG) < 0) throw new Error('flowLinks: the recommendations tab is gone');

/**
 * Whether this role can open Plan, by the menu's own rule: a `member` gets the
 * limited menu, which drops Plan (MenuList/adminOnly.ts) because every plan
 * route is admin-only on the backend and would answer 403. Every other role
 * sees the full menu, so the cross-link shows for exactly the roles the menu
 * shows Plan to. An unknown role (still loading) shows it, as the menu does.
 */
export const canOpenPlan = (roleType: string | null | undefined): boolean => (roleType || '').toLowerCase() !== 'member';
