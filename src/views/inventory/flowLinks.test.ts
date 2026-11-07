import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { menuGroups } from 'menu-items/pages';
import type { NavItemType } from 'types';

import { INSIGHTS_TO_PLAN, INVENTORY_INSIGHTS_PATH, PLAN_PATH, PLAN_TO_INSIGHTS, canOpenPlan } from './flowLinks';
import { DEFAULT_INSIGHTS_TAB_INDEX, RECOMMENDATIONS_TAB_INDEX, insightsTabFromParam } from './insights';

const findById = (items: NavItemType[] | undefined, id: string): NavItemType | undefined => {
  for (const item of items ?? []) {
    if (item.id === id) return item;
    const found = findById(item.children, id);
    if (found) return found;
  }
  return undefined;
};

const routesSource = readFileSync(resolve(process.cwd(), 'src/routes/MainRoutes.tsx'), 'utf8');
const hasRoute = (path: string) => routesSource.includes(`path: '${path}'`);

describe('the two cross-links between Plan and inventory insights', () => {
  it('say what the owner agreed, word for word', () => {
    expect(INSIGHTS_TO_PLAN).toEqual({ lead: 'Planning a whole season?', label: 'Open Plan', href: '/inventory/plan' });
    expect(PLAN_TO_INSIGHTS).toEqual({
      lead: 'Something came up this week?',
      label: 'See inventory insights',
      href: '/inventory/insights?tab=recommendations'
    });
  });

  it('point at routes that exist', () => {
    expect(hasRoute(PLAN_PATH)).toBe(true);
    expect(hasRoute(INVENTORY_INSIGHTS_PATH)).toBe(true);
    expect(PLAN_TO_INSIGHTS.href.split('?')[0]).toBe(INVENTORY_INSIGHTS_PATH);
  });

  it("Plan's link names the Recommendations tab explicitly, not the page default", () => {
    const tab = new URLSearchParams(PLAN_TO_INSIGHTS.href.split('?')[1]).get('tab');
    expect(insightsTabFromParam(tab)).toBe(RECOMMENDATIONS_TAB_INDEX);
  });
});

describe('canOpenPlan follows the menu: only a member loses Plan', () => {
  it('is false for a member, whatever the case', () => {
    expect(canOpenPlan('member')).toBe(false);
    expect(canOpenPlan('Member')).toBe(false);
  });

  it('is true for every role that gets the full menu, and while the role is unknown', () => {
    ['owner', 'admin', 'manager', 'employee'].forEach((role) => expect(canOpenPlan(role)).toBe(true));
    expect(canOpenPlan(undefined)).toBe(true);
    expect(canOpenPlan(null)).toBe(true);
    expect(canOpenPlan('')).toBe(true);
  });
});

describe('Inventory › Buying holds Insights right beside Plan', () => {
  const buying = findById(menuGroups, 'inventory-buying');
  const ids = (buying?.children ?? []).map((child) => child.id);

  it('lists Insights immediately after Plan', () => {
    expect(ids).toContain('inventory-plan');
    expect(ids.indexOf('inventory-insights')).toBe(ids.indexOf('inventory-plan') + 1);
  });

  it('titles it Insights and keeps the page it always opened', () => {
    const item = findById(menuGroups, 'inventory-insights');
    expect(item?.title).toBe('Insights');
    expect(item?.url).toBe(INVENTORY_INSIGHTS_PATH);
  });

  it('is in the menu once: Reporting no longer carries it', () => {
    const reporting = findById(menuGroups, 'inventory-reporting');
    expect((reporting?.children ?? []).map((child) => child.id)).not.toContain('inventory-insights');
  });
});

describe('the insights page opens on the nudges', () => {
  it('defaults to the Recommendations tab', () => {
    expect(DEFAULT_INSIGHTS_TAB_INDEX).toBe(RECOMMENDATIONS_TAB_INDEX);
    expect(RECOMMENDATIONS_TAB_INDEX).toBe(0);
  });
});
