import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { isWidgetAllowedOnTab, sanitizeLayout, sanitizeLayouts, widgetsForTab } from './analyticsLayoutRules';

describe('widgetsForTab', () => {
  it('offers only the widgets that belong to the tab', () => {
    expect(widgetsForTab('financial').every((w) => w.tab === 'financial')).toBe(true);
    expect(widgetsForTab('employee').map((w) => w.id)).toContain('employee-week-timeline');
    expect(widgetsForTab('financial').map((w) => w.id)).not.toContain('employee-week-timeline');
  });
});

describe('sanitizeLayout (ALL-143 cross-tab crash, ALL-144 stale ids)', () => {
  // The employee widgets read a context mounted only by the Employee tab.
  // Letting one into another tab's layout throws when the grid renders it.
  it('drops a widget belonging to a different tab', () => {
    expect(sanitizeLayout(['financial-kpis', 'employee-week-timeline'], 'financial')).toEqual(['financial-kpis']);
  });

  it('drops an id that no longer exists in the registry', () => {
    expect(sanitizeLayout(['financial-kpis', 'widget-deleted-last-release'], 'financial')).toEqual(['financial-kpis']);
  });

  it('drops duplicates but keeps the caller order', () => {
    expect(sanitizeLayout(['financial-analytics-card', 'financial-kpis', 'financial-analytics-card'], 'financial')).toEqual([
      'financial-analytics-card',
      'financial-kpis'
    ]);
  });

  it('ignores non-string entries', () => {
    expect(sanitizeLayout(['financial-kpis', 42, null, { id: 'financial-kpis' }], 'financial')).toEqual(['financial-kpis']);
  });

  it('falls back to the default layout when the value is not an array', () => {
    expect(sanitizeLayout(undefined, 'financial')).toEqual(DEFAULT_LAYOUTS.financial);
    expect(sanitizeLayout('financial-kpis', 'financial')).toEqual(DEFAULT_LAYOUTS.financial);
  });

  // An empty layout is a state the user can reach through the UI by removing
  // every widget, and the grid has a prompt for it. It must not be "repaired".
  it('preserves a deliberately emptied layout', () => {
    expect(sanitizeLayout([], 'financial')).toEqual([]);
  });
});

describe('sanitizeLayouts', () => {
  it('defaults tabs that are absent from the saved payload', () => {
    const result = sanitizeLayouts({ financial: ['financial-kpis'] });

    expect(result.financial).toEqual(['financial-kpis']);
    expect(result.employee).toEqual(DEFAULT_LAYOUTS.employee);
    expect(result.crm).toEqual(DEFAULT_LAYOUTS.crm);
  });

  it('returns every default layout for a null or malformed payload', () => {
    expect(sanitizeLayouts(null)).toEqual(DEFAULT_LAYOUTS);
    expect(sanitizeLayouts('nonsense')).toEqual(DEFAULT_LAYOUTS);
  });

  it('keeps an emptied tab empty while defaulting the others', () => {
    const result = sanitizeLayouts({ financial: [] });

    expect(result.financial).toEqual([]);
    expect(result.inventory).toEqual(DEFAULT_LAYOUTS.inventory);
  });

  it('every default layout survives sanitization unchanged', () => {
    expect(sanitizeLayouts(DEFAULT_LAYOUTS)).toEqual(DEFAULT_LAYOUTS);
  });
});

describe('isWidgetAllowedOnTab', () => {
  it('matches a widget to its own tab only', () => {
    expect(isWidgetAllowedOnTab('crm-pipeline-kpis', 'crm')).toBe(true);
    expect(isWidgetAllowedOnTab('crm-pipeline-kpis', 'financial')).toBe(false);
    expect(isWidgetAllowedOnTab('no-such-widget', 'crm')).toBe(false);
  });
});
