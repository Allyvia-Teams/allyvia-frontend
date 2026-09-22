import { describe, expect, it } from 'vitest';

import {
  ORIGIN_MAX_LENGTH,
  addMeasurementColumn,
  fitNotesText,
  gridFromMeasurements,
  gridSizeOrder,
  measurementsFromGrid,
  parseFitNotes,
  removeMeasurementColumn,
  serializeFitNotes,
  setMeasurementCell,
  styleDetailForm,
  styleDetailPayload,
  validateStyleDetail,
  type StyleDetailForm
} from './styleDetail';
import type { Product } from 'api/inventoryStock.api';

/**
 * A response literal, type-annotated on purpose.
 *
 * This is the guard the repo already uses for exactly this class of bug (see
 * store/slices/analytics.inventorySummary.test.ts, written after
 * InventorySummary declared six keys the server does not send): if Product and
 * the real payload ever disagree again, tsc fails here rather than a component
 * silently reading undefined. Do not rename these to suit the client.
 */
const SERVER_PRODUCT: Product = {
  id: '9f1c2f3a-0000-4000-8000-000000000001',
  name: 'Halden Linen Shirt',
  style_code: 'TOPS-HALD',
  category: 'Tops',
  description: 'Boxy poplin shirt',
  brand: 'Halden',
  season: 'SS26',
  status: 'active',
  variant_count: 3,
  total_on_hand: 7,
  sizes: ['S', 'M', 'L'],
  colors: ['Ecru'],
  created_at: '2026-08-01T10:00:00Z',
  variants: [],
  attributes: {},
  composition: '100% European linen',
  care: 'Dry clean, cool iron',
  origin: 'Made in Portugal',
  fit_notes: 'Runs small, size up\nModel is 5\'11"',
  measurements: { M: { Chest: '38"', Length: '27"' } }
};

const product = (over: Partial<Product> = {}): Product => ({ ...SERVER_PRODUCT, ...over });

const form = (over: Partial<StyleDetailForm> = {}): StyleDetailForm => ({ ...styleDetailForm(SERVER_PRODUCT), ...over });

describe('fit notes', () => {
  it('splits on NEWLINES ONLY, so a note containing a comma survives', () => {
    // The reason this is not matrix.ts::parseAxisInput or
    // sizeScales.ts::parseValuesText: both split on [,\n] because they parse
    // size and colour axes, and "Runs small, size up" is one instruction.
    expect(parseFitNotes('Runs small, size up\nModel is 5\'11"')).toEqual(['Runs small, size up', 'Model is 5\'11"']);
  });

  it('does not de-duplicate, unlike the axis parsers', () => {
    expect(parseFitNotes('Sheer\nSheer')).toEqual(['Sheer', 'Sheer']);
  });

  it('drops blank lines and trims, so trailing returns do not become empty notes', () => {
    expect(parseFitNotes('  Runs small  \n\n\n  Sheer\n')).toEqual(['Runs small', 'Sheer']);
    expect(parseFitNotes('')).toEqual([]);
    expect(parseFitNotes('   \n  ')).toEqual([]);
  });

  it('serializes back to the newline string the OS wire takes', () => {
    expect(serializeFitNotes(['Runs small', 'Sheer'])).toBe('Runs small\nSheer');
  });

  it('serializes an emptied list to NULL, not an empty string', () => {
    // null clears the field, which is what deleting every note means. '' would
    // leave the register rendering an empty list instead of its own
    // "not filled in yet" empty state.
    expect(serializeFitNotes([])).toBeNull();
    expect(serializeFitNotes(['  ', ''])).toBeNull();
  });

  it('round-trips through the editor without gaining or losing a note', () => {
    const stored = 'Runs small, size up\nModel is 5\'11"';
    expect(serializeFitNotes(parseFitNotes(fitNotesText(stored)))).toBe(stored);
  });

  it('normalises CRLF so a paste from a document does not add blank notes', () => {
    expect(parseFitNotes(fitNotesText('Runs small\r\nSheer'))).toEqual(['Runs small', 'Sheer']);
  });
});

describe('the measurement grid', () => {
  it('reads the stored table and seeds a row per size to type into', () => {
    const grid = gridFromMeasurements({ M: { Chest: '38"' } }, ['S', 'M', 'L']);
    expect(grid.columns).toEqual(['Chest']);
    expect(Object.keys(grid.rows).sort()).toEqual(['L', 'M', 'S']);
    expect(grid.rows.M.Chest).toBe('38"');
    expect(grid.rows.S).toEqual({});
  });

  it('takes columns from the UNION across sizes', () => {
    // Only M records an inseam. Without the union that value would be
    // invisible in the editor and impossible to correct.
    const grid = gridFromMeasurements({ S: { Chest: '36"' }, M: { Chest: '38"', Inseam: '30"' } }, ['S', 'M']);
    expect(grid.columns).toEqual(['Chest', 'Inseam']);
  });

  it('keeps a size present in the data but no longer in the style', () => {
    // A deactivated variant. Dropping the row would silently delete its
    // measurements on the very next save.
    const grid = gridFromMeasurements({ XXL: { Chest: '46"' } }, ['S', 'M']);
    expect(grid.rows.XXL).toEqual({ Chest: '46"' });
    expect(gridSizeOrder(grid, ['S', 'M'])).toEqual(['S', 'M', 'XXL']);
  });

  it('survives null, undefined and a numeric cell value', () => {
    expect(gridFromMeasurements(null, ['S'])).toEqual({ columns: [], rows: { S: {} } });
    expect(gridFromMeasurements(undefined, [])).toEqual({ columns: [], rows: {} });
    // A number in the stored JSON is legal and must stay editable as text.
    const numeric = gridFromMeasurements({ M: { Chest: 38 as unknown as string } }, ['M']);
    expect(numeric.rows.M.Chest).toBe('38');
  });

  it('survives a NON-OBJECT where a table was expected', () => {
    // The column is a JSONField, so a string or an array can be in there from
    // an import or a hand-written fixture. The editor must open rather than
    // throw on render, and it must not present rubbish as data.
    expect(gridFromMeasurements('38 chest' as unknown as Record<string, Record<string, string>>, ['S'])).toEqual({
      columns: [],
      rows: { S: {} }
    });
    const arrayish = gridFromMeasurements(['S', 'M'] as unknown as Record<string, Record<string, string>>, ['S']);
    expect(arrayish.columns).toEqual([]);
    // A per-size cell that is a string rather than a dict is skipped, not spread
    // into one column per character.
    const badCell = gridFromMeasurements({ M: 'chest 38' as unknown as Record<string, string> }, ['M']);
    expect(badCell.columns).toEqual([]);
    expect(badCell.rows.M).toEqual({});
  });

  it('orders rows by the style sizes, not alphabetically', () => {
    // XS < S < M < L sorts wrong alphabetically; the style's own order is the
    // only one that reads as a size run.
    const grid = gridFromMeasurements({}, ['XS', 'S', 'M', 'L']);
    expect(gridSizeOrder(grid, ['XS', 'S', 'M', 'L'])).toEqual(['XS', 'S', 'M', 'L']);
  });

  it('serializes back, dropping empty cells and empty rows', () => {
    let grid = gridFromMeasurements({}, ['S', 'M']);
    grid = addMeasurementColumn(grid, 'Chest');
    grid = setMeasurementCell(grid, 'M', 'Chest', ' 38" ');
    // S is left blank: it must not serialize as {"S": {}}, which the register
    // would render as an empty table for that size.
    expect(measurementsFromGrid(grid)).toEqual({ M: { Chest: '38"' } });
  });

  it('serializes an entirely empty grid to null so the field is cleared', () => {
    const grid = addMeasurementColumn(gridFromMeasurements({}, ['S', 'M']), 'Chest');
    expect(measurementsFromGrid(grid)).toBeNull();
  });

  it('ignores a value under a column that has been removed', () => {
    let grid = gridFromMeasurements({ M: { Chest: '38"', Length: '27"' } }, ['M']);
    grid = removeMeasurementColumn(grid, 'Length');
    expect(grid.columns).toEqual(['Chest']);
    expect(measurementsFromGrid(grid)).toEqual({ M: { Chest: '38"' } });
  });

  it('refuses a duplicate or blank column, case-insensitively', () => {
    let grid = gridFromMeasurements({ M: { Chest: '38"' } }, ['M']);
    grid = addMeasurementColumn(grid, 'chest');
    grid = addMeasurementColumn(grid, '  ');
    grid = addMeasurementColumn(grid, 'CHEST');
    expect(grid.columns).toEqual(['Chest']);
    grid = addMeasurementColumn(grid, '  Waist  ');
    expect(grid.columns).toEqual(['Chest', 'Waist']);
  });

  it('round-trips a real table unchanged', () => {
    const stored = { S: { Chest: '36"' }, M: { Chest: '38"', Length: '27"' } };
    expect(measurementsFromGrid(gridFromMeasurements(stored, ['S', 'M']))).toEqual(stored);
  });
});

describe('origin', () => {
  it('caps at the length the serializer accepts', () => {
    expect(ORIGIN_MAX_LENGTH).toBe(120);
    expect(validateStyleDetail(form({ origin: 'x'.repeat(120) }))).toEqual({});
    expect(validateStyleDetail(form({ origin: 'x'.repeat(121) })).origin).toBe('Origin must be 120 characters or fewer.');
  });

  it('truncates from the FRONT in the payload, so one long field cannot lose the whole save', () => {
    // The serializer answers 400 past 120 and the PATCH is all-or-nothing:
    // without this, an over-long origin would also discard the composition,
    // care, fit notes and measurements typed in the same sitting.
    //
    // The prefix is asserted, not just the length -- a slice(-120) or a
    // repeat-fill would satisfy a length-only check while silently keeping the
    // wrong end of what the owner typed.
    const long = `Made in Portugal ${'y'.repeat(200)}`;
    const payload = styleDetailPayload(form({ origin: long }), form({ origin: '' }));
    expect(payload.origin).toHaveLength(120);
    expect(payload.origin).toBe(long.slice(0, 120));
    expect(payload.origin?.startsWith('Made in Portugal')).toBe(true);
  });

  it('does not count surrounding whitespace toward the cap', () => {
    expect(validateStyleDetail(form({ origin: `  ${'x'.repeat(120)}  ` }))).toEqual({});
  });
});

describe('styleDetailPayload', () => {
  const loaded = () => styleDetailForm(SERVER_PRODUCT);

  it('sends NOTHING when nothing was touched', () => {
    expect(styleDetailPayload(loaded(), loaded())).toEqual({});
  });

  it('sends only the field that changed', () => {
    const next = { ...loaded(), care: 'Hand wash cold' };
    expect(styleDetailPayload(next, loaded())).toEqual({ care: 'Hand wash cold' });
  });

  it('DOES NOT carry measurements when only a text field changed', () => {
    // THE lost-update guard. A payload that always sent all five would let
    // admin A, who opened the style before admin B filled in the size chart,
    // delete that chart by saving a care instruction -- with no conflict, no
    // warning, and a success toast.
    const chartless = styleDetailForm(product({ measurements: null }));
    const typed = { ...chartless, care: 'Dry clean only' };
    const payload = styleDetailPayload(typed, chartless);
    expect(payload).toEqual({ care: 'Dry clean only' });
    expect('measurements' in payload).toBe(false);
  });

  it('sends null for a field that was loaded and then cleared', () => {
    // The other half: clearing must be distinguishable from not touching, and
    // null is what clears it server-side.
    const cleared = { ...loaded(), composition: '   ' };
    expect(styleDetailPayload(cleared, loaded())).toEqual({ composition: null });
  });

  it('omits a field that was already empty and stayed empty', () => {
    const bare = styleDetailForm(product({ composition: null, care: null, origin: null, fit_notes: null, measurements: null }));
    expect(styleDetailPayload(bare, bare)).toEqual({});
    // ...and does not read a whitespace edit of an empty field as a change.
    expect(styleDetailPayload({ ...bare, care: '  ' }, bare)).toEqual({});
  });

  it('compares the measurement table BY VALUE', () => {
    // The grid is rebuilt on every keystroke, so a reference comparison would
    // send the table on every save and reintroduce the wipe above.
    const before = loaded();
    const rebuilt = styleDetailForm(SERVER_PRODUCT);
    expect(styleDetailPayload(rebuilt, before)).toEqual({});
    // A real edit is still detected.
    const edited = { ...before, grid: setMeasurementCell(before.grid, 'M', 'Chest', '40"') };
    expect(styleDetailPayload(edited, before).measurements).toEqual({ M: { Chest: '40"', Length: '27"' } });
  });

  it('sends measurements: null when the last value is deleted', () => {
    const before = loaded();
    let grid = setMeasurementCell(before.grid, 'M', 'Chest', '');
    grid = setMeasurementCell(grid, 'M', 'Length', '');
    expect(styleDetailPayload({ ...before, grid }, before)).toEqual({ measurements: null });
  });

  it('detects a fit-note edit but not a re-typed identical one', () => {
    const before = loaded();
    expect(styleDetailPayload({ ...before, fitNotesText: `${before.fitNotesText}\n` }, before)).toEqual({});
    expect(styleDetailPayload({ ...before, fitNotesText: 'Runs small, size up' }, before)).toEqual({
      fit_notes: 'Runs small, size up'
    });
  });
});

describe('styleDetailForm', () => {
  it('reads all five fields off the product', () => {
    const loaded = styleDetailForm(SERVER_PRODUCT);
    expect(loaded.composition).toBe('100% European linen');
    expect(loaded.fitNotesText).toContain('Runs small');
    expect(loaded.grid.columns).toEqual(['Chest', 'Length']);
    // A row per size, even though only M has data.
    expect(gridSizeOrder(loaded.grid, SERVER_PRODUCT.sizes)).toEqual(['S', 'M', 'L']);
  });
});
