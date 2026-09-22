import { describe, expect, it } from 'vitest';
import { DEFAULT_LAYOUTS } from '../registry/defaultLayouts';
import { getLayoutWidgetRegistry, isWidgetAllowedOnTab, sanitizeLayout, sanitizeLayouts, widgetsForTab } from './analyticsLayoutRules';
import { resetLayout } from './layoutModel';

const registry = getLayoutWidgetRegistry();

function idsOf(layout: { widgets: { id: string }[] }) {
  return layout.widgets.map((entry) => entry.id);
}

describe('widgetsForTab', () => {
  it('offers only the widgets that belong to the tab', () => {
    expect(widgetsForTab('financial').every((w) => w.tab === 'financial')).toBe(true);
    expect(widgetsForTab('employee').map((w) => w.id)).toContain('employee-week-timeline');
    expect(widgetsForTab('financial').map((w) => w.id)).not.toContain('employee-week-timeline');
  });
});

describe('sanitizeLayout (ALL-143 cross-tab crash, ALL-144 stale ids, ALL-250 LayoutV2)', () => {
  // The employee widgets read a context mounted only by the Employee tab.
  // Letting one into another tab's layout throws when the grid renders it.
  it('drops a widget belonging to a different tab', () => {
    expect(idsOf(sanitizeLayout(['financial-kpis', 'employee-week-timeline'], 'financial'))).toEqual(['financial-kpis']);
  });

  it('drops an id that no longer exists in the registry', () => {
    expect(idsOf(sanitizeLayout(['financial-kpis', 'widget-deleted-last-release'], 'financial'))).toEqual(['financial-kpis']);
  });

  it('drops duplicates but keeps the caller order', () => {
    expect(idsOf(sanitizeLayout(['financial-analytics-card', 'financial-kpis', 'financial-analytics-card'], 'financial'))).toEqual([
      'financial-analytics-card',
      'financial-kpis'
    ]);
  });

  it('ignores non-string entries in a v1 list', () => {
    expect(idsOf(sanitizeLayout(['financial-kpis', 42, null, { id: 'financial-kpis' }], 'financial'))).toEqual(['financial-kpis']);
  });

  it('falls back to the default layout when the value is not a layout shape', () => {
    expect(sanitizeLayout(undefined, 'financial')).toEqual(resetLayout(registry, DEFAULT_LAYOUTS.financial));
    expect(sanitizeLayout('financial-kpis', 'financial')).toEqual(resetLayout(registry, DEFAULT_LAYOUTS.financial));
  });

  // An empty layout is a state the user can reach through the UI by removing
  // every widget, and the grid has a prompt for it. It must not be "repaired".
  it('preserves a deliberately emptied layout', () => {
    expect(sanitizeLayout([], 'financial')).toEqual({ version: 2, widgets: [] });
  });

  it('upgrades v1 string[] to LayoutV2 with registry default widths', () => {
    expect(sanitizeLayout(['financial-kpis'], 'financial')).toEqual({
      version: 2,
      widgets: [{ id: 'financial-kpis', w: 'full' }]
    });
  });

  it('preserves widths on an already-v2 layout', () => {
    expect(
      sanitizeLayout(
        {
          version: 2,
          widgets: [{ id: 'financial-kpis', w: 'half' }]
        },
        'financial'
      )
    ).toEqual({
      version: 2,
      widgets: [{ id: 'financial-kpis', w: 'half' }]
    });
  });
});

describe('sanitizeLayouts', () => {
  it('defaults tabs that are absent from the saved payload', () => {
    const result = sanitizeLayouts({ financial: ['financial-kpis'] });

    expect(idsOf(result.financial)).toEqual(['financial-kpis']);
    expect(result.employee).toEqual(resetLayout(registry, DEFAULT_LAYOUTS.employee));
    expect(result.crm).toEqual(resetLayout(registry, DEFAULT_LAYOUTS.crm));
  });

  it('returns every default layout for a null or malformed payload', () => {
    const defaults = sanitizeLayouts(null);
    expect(defaults).toEqual(sanitizeLayouts(DEFAULT_LAYOUTS));
    expect(sanitizeLayouts('nonsense')).toEqual(defaults);
  });

  it('keeps an emptied tab empty while defaulting the others', () => {
    const result = sanitizeLayouts({ financial: [] });

    expect(result.financial).toEqual({ version: 2, widgets: [] });
    expect(result.inventory).toEqual(resetLayout(registry, DEFAULT_LAYOUTS.inventory));
  });

  it('every default layout survives sanitization as LayoutV2', () => {
    const result = sanitizeLayouts(DEFAULT_LAYOUTS);
    expect(idsOf(result.financial)).toEqual(DEFAULT_LAYOUTS.financial);
    expect(result.financial.version).toBe(2);
  });
});

describe('isWidgetAllowedOnTab', () => {
  it('matches a widget to its own tab only', () => {
    expect(isWidgetAllowedOnTab('crm-pipeline-kpis', 'crm')).toBe(true);
    expect(isWidgetAllowedOnTab('crm-pipeline-kpis', 'financial')).toBe(false);
    expect(isWidgetAllowedOnTab('no-such-widget', 'crm')).toBe(false);
  });
});
