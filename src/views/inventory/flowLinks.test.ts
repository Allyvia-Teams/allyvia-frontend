import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

import { INSIGHTS_TO_PLAN, PLAN_PATH, PLAN_TO_INSIGHTS, canOpenPlan } from './flowLinks';
import { DEFAULT_INSIGHTS_TAB_INDEX, RECOMMENDATIONS_TAB_INDEX } from './insights';

const routesSource = readFileSync(resolve(process.cwd(), 'src/routes/MainRoutes.tsx'), 'utf8');
const hasRoute = (path: string) => routesSource.includes(`path: '${path}'`);

describe('the two cross-links between Plan and inventory insights', () => {
  it('say what the owner agreed, word for word', () => {
    expect(INSIGHTS_TO_PLAN).toEqual({ lead: 'Planning a whole season?', label: 'Open Plan', href: '/inventory/plan' });
    expect(PLAN_TO_INSIGHTS).toEqual({
      lead: 'Something came up this week?',
      label: 'See what needs doing today',
      href: '/inventory?tab=today'
    });
  });

  it('point at routes that exist', () => {
    expect(hasRoute(PLAN_PATH)).toBe(true);
    expect(PLAN_TO_INSIGHTS.href).toBe('/inventory?tab=today');
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

describe('the insights page opens on the nudges', () => {
  it('defaults to the Recommendations tab', () => {
    expect(DEFAULT_INSIGHTS_TAB_INDEX).toBe(RECOMMENDATIONS_TAB_INDEX);
    expect(RECOMMENDATIONS_TAB_INDEX).toBe(0);
  });
});
