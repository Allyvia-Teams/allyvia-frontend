import type { WidgetSize } from '../registry/types';

export type LayoutWidth = WidgetSize;

export interface LayoutEntry {
  id: string;
  w: LayoutWidth;
}

export interface LayoutV2 {
  version: 2;
  widgets: LayoutEntry[];
}

/** Minimal registry surface needed by the layout model (test-friendly). */
export type WidgetRegistry = Record<
  string,
  {
    defaultSize: WidgetSize;
  }
>;

const VALID_WIDTHS = new Set<LayoutWidth>(['third', 'half', 'full']);

function isLayoutWidth(value: unknown): value is LayoutWidth {
  return typeof value === 'string' && VALID_WIDTHS.has(value as LayoutWidth);
}

function isV2Shape(saved: unknown): saved is { version: 2; widgets: unknown } {
  return (
    typeof saved === 'object' &&
    saved !== null &&
    !Array.isArray(saved) &&
    (saved as { version?: unknown }).version === 2 &&
    Array.isArray((saved as { widgets?: unknown }).widgets)
  );
}

function entryFromId(id: string, registry: WidgetRegistry): LayoutEntry | null {
  const definition = registry[id];
  if (!definition) {
    return null;
  }
  return { id, w: definition.defaultSize };
}

function normalizeEntry(raw: unknown, registry: WidgetRegistry): LayoutEntry | null {
  if (typeof raw === 'string') {
    return entryFromId(raw, registry);
  }

  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return null;
  }

  const id = (raw as { id?: unknown }).id;
  if (typeof id !== 'string' || !registry[id]) {
    return null;
  }

  const width = (raw as { w?: unknown }).w;
  return {
    id,
    w: isLayoutWidth(width) ? width : registry[id].defaultSize
  };
}

/**
 * Coerce any saved layout (v1 string[], legacy, or v2) into a sanitized LayoutV2.
 * Drops unknown ids. Does not invent widgets beyond saved/defaults.
 */
export function normalizeLayout(saved: unknown, registry: WidgetRegistry, defaults: string[]): LayoutV2 {
  const isEmpty =
    saved === null ||
    saved === undefined ||
    (Array.isArray(saved) && saved.length === 0) ||
    (isV2Shape(saved) && saved.widgets.length === 0);

  if (isEmpty) {
    return resetLayout(registry, defaults);
  }

  let candidates: unknown[];

  if (Array.isArray(saved)) {
    // v1 / legacy: ordered widget ids (or mixed entries)
    candidates = saved;
  } else if (isV2Shape(saved)) {
    candidates = saved.widgets;
  } else if (typeof saved === 'object' && saved !== null && Array.isArray((saved as { widgets?: unknown }).widgets)) {
    // Legacy object with widgets array but wrong/missing version
    candidates = (saved as { widgets: unknown[] }).widgets;
  } else {
    return resetLayout(registry, defaults);
  }

  const widgets: LayoutEntry[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const entry = normalizeEntry(candidate, registry);
    if (!entry || seen.has(entry.id)) {
      continue;
    }
    seen.add(entry.id);
    widgets.push(entry);
  }

  return {
    version: 2,
    widgets
  };
}

/** Move the widget with fromId to the index of toId. Pure. */
export function reorder(layout: LayoutV2, fromId: string, toId: string): LayoutV2 {
  if (fromId === toId) {
    return {
      version: 2,
      widgets: layout.widgets.map((entry) => ({ ...entry }))
    };
  }

  const widgets = layout.widgets.map((entry) => ({ ...entry }));
  const fromIndex = widgets.findIndex((entry) => entry.id === fromId);
  const toIndex = widgets.findIndex((entry) => entry.id === toId);

  if (fromIndex < 0 || toIndex < 0) {
    return { version: 2, widgets };
  }

  const [moved] = widgets.splice(fromIndex, 1);
  widgets.splice(toIndex, 0, moved);

  return {
    version: 2,
    widgets
  };
}

/** Update width for a single widget. Pure. */
export function resize(layout: LayoutV2, id: string, w: WidgetSize): LayoutV2 {
  return {
    version: 2,
    widgets: layout.widgets.map((entry) => (entry.id === id ? { ...entry, w } : { ...entry }))
  };
}

/** Build a fresh LayoutV2 from default id order + registry sizes. */
export function resetLayout(registry: WidgetRegistry, defaults: string[]): LayoutV2 {
  const widgets: LayoutEntry[] = [];
  const seen = new Set<string>();

  for (const id of defaults) {
    if (seen.has(id)) {
      continue;
    }
    const entry = entryFromId(id, registry);
    if (!entry) {
      continue;
    }
    seen.add(id);
    widgets.push(entry);
  }

  return {
    version: 2,
    widgets
  };
}
