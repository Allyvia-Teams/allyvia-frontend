import { describe, expect, it } from 'vitest';
import { canOfferWidgetModule } from './widgetModuleAccess';

describe('canOfferWidgetModule', () => {
  it('offers ungated widgets to everyone', () => {
    expect(canOfferWidgetModule(undefined, 'member', {})).toBe(true);
  });

  it('offers gated widgets to admins regardless of grants', () => {
    expect(canOfferWidgetModule('finance', 'admin', {})).toBe(true);
  });

  it('hides finance widgets from members without finance', () => {
    expect(canOfferWidgetModule('finance', 'member', { inventory: true })).toBe(false);
  });

  it('shows inventory widgets to members via baseline grant', () => {
    expect(canOfferWidgetModule('inventory', 'member', undefined)).toBe(true);
  });

  it('uses roster rule for employees module', () => {
    expect(canOfferWidgetModule('employees', 'member', { 'employees.approve': true })).toBe(false);
    expect(canOfferWidgetModule('employees', 'member', { employees: true })).toBe(true);
  });
});
