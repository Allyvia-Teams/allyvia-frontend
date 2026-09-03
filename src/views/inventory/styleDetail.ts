import type { Product } from 'api/inventoryStock.api';

/**
 * Parse, serialize and validate the style-detail fields the register renders on
 * its Lookup sheet (design 3.5): composition, care, origin, fit notes and the
 * per-size measurement table.
 *
 * Everything is a plain function because vitest runs in the `node` environment
 * here -- no jsdom, no testing-library -- so the dialog itself cannot be
 * asserted. Same reason matrix.ts and sizeScales.ts exist beside their dialogs.
 */

/** The serializer's cap. Past this it answers 400 and the whole save is lost. */
export const ORIGIN_MAX_LENGTH = 120;

// ---------------------------------------------------------------------------
// Fit notes
// ---------------------------------------------------------------------------

/**
 * One note per LINE. Splits on newlines only, and does not de-duplicate.
 *
 * Deliberately not matrix.ts::parseAxisInput or sizeScales.ts::parseValuesText,
 * which both split on `[,\n]` because they parse size and colour axes. A fit
 * note is a sentence: "Runs small, size up" would become two useless fragments,
 * and two garments legitimately share a note.
 */
export const parseFitNotes = (text: string): string[] =>
  (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

/**
 * Back to the newline-separated string the OS serializer takes.
 *
 * Returns null for an empty list, not '': null CLEARS the field (the server
 * treats an explicit null as "unset"), which is what an owner who deleted every
 * note means. An empty string would leave the register rendering an empty list
 * instead of its "not filled in yet" state.
 */
export const serializeFitNotes = (lines: string[]): string | null => {
  const kept = lines.map((line) => line.trim()).filter(Boolean);
  return kept.length ? kept.join('\n') : null;
};

/** The stored string as editable text. */
export const fitNotesText = (stored: string | null | undefined): string => (stored ?? '').replace(/\r\n/g, '\n');

// ---------------------------------------------------------------------------
// Measurements
// ---------------------------------------------------------------------------

export interface MeasurementGrid {
  /** Dimension names, in the order they are shown: Chest, Waist, Length… */
  columns: string[];
  /** rows[size][dimension] = value. Sparse: a missing cell is simply absent. */
  rows: Record<string, Record<string, string>>;
}

/**
 * The stored object as a grid to edit.
 *
 * Columns are the UNION of dimensions across every size, so a table where only
 * one size happens to record an inseam still shows that column for the others
 * -- otherwise the value would be invisible and un-editable.
 *
 * `sizes` seeds the rows so a style with no measurements yet still gets a row
 * per size to type into. A size present in the data but not in `sizes` (a
 * variant since deactivated) is kept, because dropping it would silently delete
 * that data on the next save.
 */
export const gridFromMeasurements = (
  measurements: Record<string, Record<string, string>> | null | undefined,
  sizes: string[]
): MeasurementGrid => {
  const stored = measurements && typeof measurements === 'object' ? measurements : {};
  const columns: string[] = [];
  const rows: Record<string, Record<string, string>> = {};

  const addColumn = (name: string) => {
    if (name && !columns.includes(name)) columns.push(name);
  };

  Object.keys(stored).forEach((size) => {
    const cells = stored[size];
    rows[size] = {};
    if (cells && typeof cells === 'object') {
      Object.keys(cells).forEach((dimension) => {
        addColumn(dimension);
        // Coerced: a number in the stored JSON is legal and must stay editable.
        rows[size][dimension] = cells[dimension] == null ? '' : String(cells[dimension]);
      });
    }
  });

  sizes.forEach((size) => {
    if (!rows[size]) rows[size] = {};
  });

  return { columns, rows };
};

/** Row order: the style's own sizes first, then anything left over from the data. */
export const gridSizeOrder = (grid: MeasurementGrid, sizes: string[]): string[] => {
  const ordered = sizes.filter((size) => size in grid.rows);
  const extra = Object.keys(grid.rows).filter((size) => !sizes.includes(size));
  return [...ordered, ...extra];
};

/**
 * The grid back to the stored shape.
 *
 * Empty cells are dropped and a size with no values at all is dropped, so an
 * owner who clears a row does not leave `{"M": {}}` behind for the register to
 * render as an empty table. An entirely empty grid becomes null, which clears
 * the field.
 */
export const measurementsFromGrid = (grid: MeasurementGrid): Record<string, Record<string, string>> | null => {
  const out: Record<string, Record<string, string>> = {};
  Object.keys(grid.rows).forEach((size) => {
    const cells: Record<string, string> = {};
    grid.columns.forEach((dimension) => {
      const value = (grid.rows[size]?.[dimension] ?? '').trim();
      if (value) cells[dimension] = value;
    });
    if (Object.keys(cells).length) out[size] = cells;
  });
  return Object.keys(out).length ? out : null;
};

/** Add a dimension column. Case-insensitively de-duplicated; trimmed. */
export const addMeasurementColumn = (grid: MeasurementGrid, name: string): MeasurementGrid => {
  const trimmed = (name ?? '').trim();
  if (!trimmed) return grid;
  const clash = grid.columns.some((column) => column.toLowerCase() === trimmed.toLowerCase());
  if (clash) return grid;
  return { ...grid, columns: [...grid.columns, trimmed] };
};

/** Remove a dimension column and every value under it. */
export const removeMeasurementColumn = (grid: MeasurementGrid, name: string): MeasurementGrid => {
  const rows: Record<string, Record<string, string>> = {};
  Object.keys(grid.rows).forEach((size) => {
    const { [name]: _dropped, ...rest } = grid.rows[size] || {};
    rows[size] = rest;
  });
  return { columns: grid.columns.filter((column) => column !== name), rows };
};

export const setMeasurementCell = (grid: MeasurementGrid, size: string, dimension: string, value: string): MeasurementGrid => ({
  ...grid,
  rows: { ...grid.rows, [size]: { ...(grid.rows[size] || {}), [dimension]: value } }
});

// ---------------------------------------------------------------------------
// The form as a whole
// ---------------------------------------------------------------------------

export interface StyleDetailForm {
  composition: string;
  care: string;
  origin: string;
  fitNotesText: string;
  grid: MeasurementGrid;
}

export const styleDetailForm = (product: Product): StyleDetailForm => ({
  composition: product.composition ?? '',
  care: product.care ?? '',
  origin: product.origin ?? '',
  fitNotesText: fitNotesText(product.fit_notes),
  grid: gridFromMeasurements(product.measurements, product.sizes || [])
});

export type StyleDetailErrors = Partial<Record<'origin', string>>;

export const validateStyleDetail = (form: StyleDetailForm): StyleDetailErrors => {
  const errors: StyleDetailErrors = {};
  if (form.origin.trim().length > ORIGIN_MAX_LENGTH) {
    errors.origin = `Origin must be ${ORIGIN_MAX_LENGTH} characters or fewer.`;
  }
  return errors;
};

export interface StyleDetailPayload {
  composition: string | null;
  care: string | null;
  origin: string | null;
  fit_notes: string | null;
  measurements: Record<string, Record<string, string>> | null;
}

/**
 * The PATCH body: ONLY the fields this editing session actually changed.
 *
 * Diffed against the product as it was loaded, and that is a correctness
 * requirement rather than a bandwidth one. The server treats an explicit null
 * as "clear this", so a payload that always carries all five is a guaranteed
 * lost update:
 *
 *   A opens the shirt at 10:00 (no measurements recorded). B fills in the whole
 *   S/M/L size chart at 10:02. A types a care instruction and saves at 10:05 ->
 *   an all-fields payload carries measurements: null -> B's chart is deleted,
 *   the register's Sizing & fit tab goes blank, and A is told "saved".
 *
 * The form holds the loaded value, so "cleared" and "never touched" are
 * perfectly distinguishable: blank where something was loaded means null
 * (clear it); blank where nothing was loaded means omit.
 *
 * Origin is capped here as well as on the input, the belt-and-braces
 * ReorderInbox.tsx uses: past 120 the serializer 400s and the whole save is
 * lost, including the four fields that were fine.
 */
export const styleDetailPayload = (form: StyleDetailForm, loaded: StyleDetailForm): Partial<StyleDetailPayload> => {
  const text = (value: string): string | null => {
    const trimmed = (value ?? '').trim();
    return trimmed ? trimmed : null;
  };
  const payload: Partial<StyleDetailPayload> = {};

  const origin = text(form.origin);
  const capped = origin ? origin.slice(0, ORIGIN_MAX_LENGTH) : null;
  const before = {
    composition: text(loaded.composition),
    care: text(loaded.care),
    origin: text(loaded.origin),
    fit_notes: serializeFitNotes(parseFitNotes(loaded.fitNotesText)),
    measurements: measurementsFromGrid(loaded.grid)
  };

  if (text(form.composition) !== before.composition) payload.composition = text(form.composition);
  if (text(form.care) !== before.care) payload.care = text(form.care);
  if (capped !== before.origin) payload.origin = capped;

  const notes = serializeFitNotes(parseFitNotes(form.fitNotesText));
  if (notes !== before.fit_notes) payload.fit_notes = notes;

  const measurements = measurementsFromGrid(form.grid);
  // Compared by value: the grid is rebuilt on every keystroke, so a reference
  // check would send the table every time and reintroduce the wipe above.
  if (JSON.stringify(measurements) !== JSON.stringify(before.measurements)) payload.measurements = measurements;

  return payload;
};
