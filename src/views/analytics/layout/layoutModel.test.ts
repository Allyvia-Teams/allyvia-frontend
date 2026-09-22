// @vitest-environment node
import { describe, expect, it } from 'vitest';
import type { WidgetSize } from '../registry/types';
import { normalizeLayout, reorder, resetLayout, resize, type LayoutV2, type WidgetRegistry } from './layoutModel';

const registry: WidgetRegistry = {
  'financial-kpis': { defaultSize: 'full' },
  'financial-trends-chart': { defaultSize: 'full' },
  'financial-analytics-card': { defaultSize: 'full' },
  'inventory-top-items': { defaultSize: 'third' },
  'inventory-alerts-panel': { defaultSize: 'third' },
  'overview-cash-flow': { defaultSize: 'half' }
};

const defaults = ['financial-kpis', 'financial-trends-chart', 'financial-analytics-card'];

describe('layoutModel (ALL-250)', () => {
  it('normalizeLayout migrates v1 string[] to v2 correctly', () => {
    const saved = ['financial-kpis', 'inventory-top-items', 'overview-cash-flow'];

    const result = normalizeLayout(saved, registry, defaults);

    expect(result.version).toBe(2);
    expect(result.widgets).toEqual([
      { id: 'financial-kpis', w: 'full' },
      { id: 'inventory-top-items', w: 'third' },
      { id: 'overview-cash-flow', w: 'half' }
    ]);
  });

  it('normalizeLayout drops ids not in registry (mutation-verify: if you comment out the filter, this test must fail)', () => {
    const saved = ['financial-kpis', 'retired-widget', 'financial-trends-chart'];

    const result = normalizeLayout(saved, registry, defaults);

    expect(result.widgets.map((entry) => entry.id)).toEqual(['financial-kpis', 'financial-trends-chart']);
    expect(result.widgets.some((entry) => entry.id === 'retired-widget')).toBe(false);
  });

  it("normalizeLayout fills missing 'w' from registry default", () => {
    const saved: LayoutV2 = {
      version: 2,
      widgets: [{ id: 'inventory-top-items' } as { id: string; w: WidgetSize }, { id: 'overview-cash-flow', w: 'full' }]
    };

    // Simulate a corrupted/partial entry missing w
    (saved.widgets[0] as { id: string; w?: WidgetSize }).w = undefined;

    const result = normalizeLayout(saved, registry, defaults);

    expect(result.widgets).toEqual([
      { id: 'inventory-top-items', w: 'third' },
      { id: 'overview-cash-flow', w: 'full' }
    ]);
  });

  it('normalizeLayout returns defaults when saved is null/empty', () => {
    expect(normalizeLayout(null, registry, defaults)).toEqual({
      version: 2,
      widgets: [
        { id: 'financial-kpis', w: 'full' },
        { id: 'financial-trends-chart', w: 'full' },
        { id: 'financial-analytics-card', w: 'full' }
      ]
    });

    expect(normalizeLayout([], registry, defaults)).toEqual(resetLayout(registry, defaults));

    expect(
      normalizeLayout(
        {
          version: 2,
          widgets: []
        },
        registry,
        defaults
      )
    ).toEqual(resetLayout(registry, defaults));
  });

  it('reorder moves widget to correct position, does not mutate original', () => {
    const layout: LayoutV2 = {
      version: 2,
      widgets: [
        { id: 'a', w: 'full' },
        { id: 'b', w: 'half' },
        { id: 'c', w: 'third' }
      ]
    };
    const snapshot = structuredClone(layout);

    const result = reorder(layout, 'c', 'a');

    expect(result.widgets.map((entry) => entry.id)).toEqual(['c', 'a', 'b']);
    expect(layout).toEqual(snapshot);
    expect(result).not.toBe(layout);
    expect(result.widgets).not.toBe(layout.widgets);
  });

  it("resize updates only the target widget's w, does not mutate original", () => {
    const layout: LayoutV2 = {
      version: 2,
      widgets: [
        { id: 'financial-kpis', w: 'full' },
        { id: 'overview-cash-flow', w: 'half' }
      ]
    };
    const snapshot = structuredClone(layout);

    const result = resize(layout, 'overview-cash-flow', 'full');

    expect(result.widgets).toEqual([
      { id: 'financial-kpis', w: 'full' },
      { id: 'overview-cash-flow', w: 'full' }
    ]);
    expect(layout).toEqual(snapshot);
    expect(result.widgets[1]).not.toBe(layout.widgets[1]);
  });

  it('resetLayout produces exact defaults with correct sizes', () => {
    const result = resetLayout(registry, defaults);

    expect(result).toEqual({
      version: 2,
      widgets: [
        { id: 'financial-kpis', w: 'full' },
        { id: 'financial-trends-chart', w: 'full' },
        { id: 'financial-analytics-card', w: 'full' }
      ]
    });
  });
});
