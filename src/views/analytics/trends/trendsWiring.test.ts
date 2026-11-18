import { describe, expect, it } from 'vitest';

import { isNavItemSelected } from 'layout/MainLayout/MenuList/navMatch';
import { computeAllowedPrefixes, guardRedirect, matchesAny } from 'routes/guards/moduleAccess';
import { topLevelItems } from 'menu-items/pages';
import { NO_ANALYTICS_SENTENCE, canSeeSection } from '../analyticsPage';

const analyticsItem = () => {
  const item = topLevelItems.find((i) => i.id === 'analytics');
  expect(item).toBeDefined();
  return item as NonNullable<typeof item>;
};

describe('Trends is part of Analytics', () => {
  it('keeps the Analytics sidebar item lit on /analytics/trends', () => {
    expect(isNavItemSelected(analyticsItem(), '/analytics/trends')).toBe(true);
    expect(isNavItemSelected(analyticsItem(), '/analytics')).toBe(true);
  });

  it('is reached by the same module grant as Analytics', () => {
    expect(matchesAny('/analytics/trends', computeAllowedPrefixes({ analytics: true }))).toBe(true);
    expect(matchesAny('/analytics/trends', computeAllowedPrefixes({}))).toBe(false);
    expect(
      guardRedirect({
        pathname: '/analytics/trends',
        effectiveRoleType: 'member',
        modulePermissions: {},
        kioskActive: true,
        kioskDevice: false
      })
    ).toBe('/kiosk/clock');
  });

  it('shows the money panels only to a role that can see finance, and refuses with the same sentence', () => {
    expect(canSeeSection('finance', 'member', {})).toBe(false);
    expect(canSeeSection('finance', 'member', { finance: true })).toBe(true);
    expect(canSeeSection('finance', 'admin', undefined)).toBe(true);
    expect(NO_ANALYTICS_SENTENCE).toBe("Your role doesn't include any analytics. Ask an admin for access.");
  });
});
