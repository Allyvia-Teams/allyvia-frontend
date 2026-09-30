import { describe, expect, it } from 'vitest';

import {
  ATTRIBUTE_KEYS,
  buildItemUpdatePayload,
  derivedVariantName,
  distinctColors,
  mintStyleCode,
  planItemSubmission,
  sanitizeAttributes,
  sizeControlFor
} from './itemForm';

const alpha = {
  id: 'scale-1',
  name: 'Womenswear alpha',
  kind: 'alpha' as const,
  axes: 1 as const,
  axis_labels: ['Size'],
  values: [['XS', 'S', 'M', 'L', 'XL']]
};

const composite = {
  id: 'scale-2',
  name: 'Denim W/L',
  kind: 'composite' as const,
  axes: 2 as const,
  axis_labels: ['Waist', 'Inseam'],
  values: [
    ['26', '28', '30'],
    ['30', '32', '34']
  ]
};

describe('sizeControlFor', () => {
  it('offers one select of the scale values in scale order', () => {
    const control = sizeControlFor(alpha);

    // Scale order, NOT alphabetical: sorting XS,S,M,L,XL gives L,M,S,XL,XS,
    // which is not a size run any boutique recognises.
    expect(control).toEqual({ kind: 'select', axes: [{ label: 'Size', values: ['XS', 'S', 'M', 'L', 'XL'] }] });
  });

  it('offers two selects labelled by the axis labels for a composite scale', () => {
    const control = sizeControlFor(composite);

    expect(control).toEqual({
      kind: 'composite',
      axes: [
        { label: 'Waist', values: ['26', '28', '30'] },
        { label: 'Inseam', values: ['30', '32', '34'] }
      ]
    });
  });

  it('falls back to free text with the Size Scales helper when no scale is bound', () => {
    const control = sizeControlFor(null);

    expect(control).toEqual({
      kind: 'text',
      helper: 'No size scale bound to this category — set one under Inventory › Size Scales'
    });
  });

  it('falls back to free text when a scale resolves with no values on its first axis', () => {
    // A bound scale whose every value has been deactivated resolves to a scale
    // with empty axes. A Select with nothing in it is a dead end, so the
    // operator gets the text box rather than an unusable dropdown.
    const control = sizeControlFor({ ...alpha, values: [[]] });

    expect(control.kind).toBe('text');
  });
});

describe('ATTRIBUTE_KEYS', () => {
  it('is the seven governed keys, in the order the form renders them', () => {
    // Closed set, mirroring backend inventory/attributes.py. An eighth key
    // typed into the payload is a 400 naming the allowed set, so the form
    // never offers one.
    expect(ATTRIBUTE_KEYS).toEqual(['material', 'fit', 'pattern', 'length', 'sleeve', 'neckline', 'occasion']);
  });
});

describe('sanitizeAttributes', () => {
  it('keeps allowlisted keys and trims their values', () => {
    expect(sanitizeAttributes({ material: '  linen ', fit: 'relaxed' })).toEqual({ material: 'linen', fit: 'relaxed' });
  });

  it('drops a key whose value is blank or only whitespace', () => {
    // Clearing an autocomplete leaves '' behind. The backend drops an
    // empty-string value; sending it would be asking the server to store a key
    // that means nothing.
    expect(sanitizeAttributes({ material: 'linen', fit: '', pattern: '   ' })).toEqual({ material: 'linen' });
  });

  it('drops a key that is not one of the seven', () => {
    expect(sanitizeAttributes({ material: 'linen', mood: 'breezy' } as Record<string, string>)).toEqual({ material: 'linen' });
  });

  it('clamps a value to the 50 characters the server accepts', () => {
    const pasted = 'x'.repeat(80);

    expect(sanitizeAttributes({ material: pasted }).material).toHaveLength(50);
  });

  it('returns an empty object when nothing was entered', () => {
    // {} not undefined: `attributes` is always an object on the wire, and {}
    // is how the form says "this style has no descriptors".
    expect(sanitizeAttributes({})).toEqual({});
    expect(sanitizeAttributes(undefined)).toEqual({});
  });
});

describe('mintStyleCode', () => {
  // POST /inventory/products/ REQUIRES style_code — the backend's own
  // mint_style_code docstring says the merchant API takes it from the client
  // and that the register is the only door that mints. "New style from this
  // item" therefore mints here, in the shape the server's minter produces.
  it('is the brand and the name, upper-cased and punctuation-stripped', () => {
    expect(mintStyleCode({ brand: 'Everlane', name: 'Linen Camp Shirt', taken: [] })).toBe('EVER-LINENC');
  });

  it('is the name alone when the style has no brand', () => {
    expect(mintStyleCode({ brand: '', name: 'Linen Camp Shirt', taken: [] })).toBe('LINENC');
  });

  it('suffixes to step around a code the company already uses', () => {
    expect(mintStyleCode({ brand: 'Everlane', name: 'Linen Camp Shirt', taken: ['EVER-LINENC'] })).toBe('EVER-LINENC-2');
  });

  it('keeps counting past several collisions', () => {
    const taken = ['EVER-LINENC', 'EVER-LINENC-2', 'EVER-LINENC-3'];

    expect(mintStyleCode({ brand: 'Everlane', name: 'Linen Camp Shirt', taken })).toBe('EVER-LINENC-4');
  });

  it('compares against taken codes case-insensitively', () => {
    // The list comes off the products payload, which stores what the merchant
    // typed. A lowercase twin is still the collision the server would 400 on.
    expect(mintStyleCode({ brand: 'Everlane', name: 'Linen Camp Shirt', taken: ['ever-linenc'] })).toBe('EVER-LINENC-2');
  });

  it('falls back to ITEM when the name reduces to nothing', () => {
    expect(mintStyleCode({ brand: '', name: '—?!', taken: [] })).toBe('ITEM');
  });
});

const baseForm = {
  name: 'Linen Camp Shirt',
  sku: 'LIN-IVO-M',
  barcode: '',
  description: '',
  category: 'Shirts',
  unit_price: 128,
  cost_price: 54,
  opening_qty: 6,
  reorder_point: 2,
  max_stock_level: 12
};

const baseGarment = {
  styleId: null as string | null,
  brand: 'Everlane',
  season: 'SS26',
  composition: '100% linen',
  care: 'Cold wash',
  origin: 'Portugal',
  fitNotes: 'Boxy',
  attributes: { material: 'linen', fit: 'relaxed' },
  size: '',
  sizeValues: [] as string[],
  color: 'Ivory',
  takenStyleCodes: [] as string[]
};

describe('planItemSubmission', () => {
  it('creates a style when no style was chosen', () => {
    const plan = planItemSubmission(baseForm, { ...baseGarment, size: 'M' });

    expect(plan.door).toBe('create_style');
    if (plan.door !== 'create_style') throw new Error('expected create_style');
    expect(plan.payload.name).toBe('Linen Camp Shirt');
    expect(plan.payload.style_code).toBe('EVER-LINENC');
    expect(plan.payload.category).toBe('Shirts');
    expect(plan.payload.variants).toHaveLength(1);
    expect(plan.payload.variants[0]).toMatchObject({ sku: 'LIN-IVO-M', color: 'Ivory', size: 'M', opening_qty: 6 });
  });

  it('adds a variant to the style that was chosen', () => {
    const plan = planItemSubmission(baseForm, { ...baseGarment, styleId: 'style-7', size: 'M' });

    expect(plan.door).toBe('add_variant');
    if (plan.door !== 'add_variant') throw new Error('expected add_variant');
    expect(plan.productId).toBe('style-7');
    expect(plan.payload).toMatchObject({ sku: 'LIN-IVO-M', color: 'Ivory', size: 'M', opening_qty: 6 });
  });

  it('sends size_values and not size when the scale bound the sizes', () => {
    // Values picked off a scale BIND to it; a plain string does not, and would
    // turn up in the Unmatched panel instead.
    const plan = planItemSubmission(baseForm, { ...baseGarment, styleId: 'style-7', sizeValues: ['30', '32'] });

    if (plan.door !== 'add_variant') throw new Error('expected add_variant');
    expect(plan.payload.size_values).toEqual(['30', '32']);
    expect(plan.payload.size).toBeUndefined();
  });

  it('sends free-text size and no size_values when nothing governs the category', () => {
    const plan = planItemSubmission(baseForm, { ...baseGarment, styleId: 'style-7', size: 'One size' });

    if (plan.door !== 'add_variant') throw new Error('expected add_variant');
    expect(plan.payload.size).toBe('One size');
    expect(plan.payload.size_values).toBeUndefined();
  });

  it('carries the garment details and attributes onto a new style', () => {
    const plan = planItemSubmission(baseForm, baseGarment);

    if (plan.door !== 'create_style') throw new Error('expected create_style');
    expect(plan.payload).toMatchObject({
      brand: 'Everlane',
      season: 'SS26',
      composition: '100% linen',
      care: 'Cold wash',
      origin: 'Portugal',
      fit_notes: 'Boxy'
    });
    expect(plan.payload.attributes).toEqual({ material: 'linen', fit: 'relaxed' });
  });

  it('submits attributes as {key: value} with only allowlisted keys', () => {
    const attributes = { material: ' linen ', mood: 'breezy' } as Record<string, string>;

    const plan = planItemSubmission(baseForm, { ...baseGarment, attributes });

    if (plan.door !== 'create_style') throw new Error('expected create_style');
    expect(plan.payload.attributes).toEqual({ material: 'linen' });
  });

  it('sends no style-level fields when adding to an existing style', () => {
    // The Garment details block is read-only on an existing style — the
    // catalogue edits it. The add-variant body has nowhere to put them and
    // would 400 on an unexpected key.
    const plan = planItemSubmission(baseForm, { ...baseGarment, styleId: 'style-7', size: 'M' });

    if (plan.door !== 'add_variant') throw new Error('expected add_variant');
    expect(plan.payload).not.toHaveProperty('attributes');
    expect(plan.payload).not.toHaveProperty('brand');
    expect(plan.payload).not.toHaveProperty('composition');
  });

  it('never sends quantity_on_hand through either door', () => {
    // The flat column write is what ALL-81 exists to stop. The opening count
    // travels as opening_qty, which lands as a ledger movement.
    const created = planItemSubmission(baseForm, { ...baseGarment, size: 'M' });
    const added = planItemSubmission(baseForm, { ...baseGarment, styleId: 'style-7', size: 'M' });

    if (created.door !== 'create_style') throw new Error('expected create_style');
    if (added.door !== 'add_variant') throw new Error('expected add_variant');
    expect(JSON.stringify(created.payload)).not.toContain('quantity_on_hand');
    expect(JSON.stringify(added.payload)).not.toContain('quantity_on_hand');
  });

  it('sends no location, because the form field is free text and the API wants a Location id', () => {
    // AddVariantSerializer.location is a UUID and 400s on anything else; the
    // form's "Location" is the legacy free-text column ("Warehouse A"). Omitted
    // means the company default, which stock.set_on_hand resolves itself.
    const plan = planItemSubmission({ ...baseForm, location: 'Warehouse A' } as typeof baseForm, {
      ...baseGarment,
      styleId: 'style-7',
      size: 'M'
    });

    if (plan.door !== 'add_variant') throw new Error('expected add_variant');
    expect(plan.payload.location).toBeUndefined();
  });

  it('steps a minted style code around the codes already in use', () => {
    const plan = planItemSubmission(baseForm, { ...baseGarment, size: 'M', takenStyleCodes: ['EVER-LINENC'] });

    if (plan.door !== 'create_style') throw new Error('expected create_style');
    expect(plan.payload.style_code).toBe('EVER-LINENC-2');
  });
});

describe('buildItemUpdatePayload', () => {
  const editForm = {
    name: 'Linen Camp Shirt',
    sku: 'LIN-IVO-M',
    description: 'Boxy linen shirt',
    quantity_on_hand: 41,
    unit_price: 128,
    cost_price: 54,
    category: 'Shirts',
    reorder_point: 2,
    barcode: '0123456789012',
    max_stock_level: 12,
    item_type: 'Inventory' as const,
    status: 'active' as const,
    is_taxable: true,
    weight: 0.4,
    location: 'Warehouse A',
    bin_location: 'A1-5'
  };

  it('never sends quantity_on_hand, whatever the form is holding', () => {
    // ALL-81: this path PATCHing a stale quantity is what pushed a
    // company-wide total onto the default location. Stock moves through
    // "Adjust stock", which records a ledger movement with a reason. The
    // omission is unconditional — BarcodeScannerModal opens this modal in edit
    // mode WITHOUT metadataOnly, so a conditional omission leaves that door
    // writing the column.
    const payload = buildItemUpdatePayload(editForm, { size: 'M', sizeValues: [], color: 'Ivory' });

    expect(payload).not.toHaveProperty('quantity_on_hand');
    expect(JSON.stringify(payload)).not.toContain('quantity_on_hand');
  });

  it('sends the edited size and colour', () => {
    const payload = buildItemUpdatePayload(editForm, { size: 'L', sizeValues: [], color: 'Clay' });

    expect(payload.size).toBe('L');
    expect(payload.color).toBe('Clay');
  });

  it('sends size_values instead of size when the values came off a scale', () => {
    const payload = buildItemUpdatePayload(editForm, { size: '', sizeValues: ['30', '32'], color: 'Indigo' });

    expect(payload.size_values).toEqual(['30', '32']);
    expect(payload).not.toHaveProperty('size');
  });

  it('keeps the flat metadata the form still owns', () => {
    const payload = buildItemUpdatePayload(editForm, { size: 'M', sizeValues: [], color: 'Ivory' });

    expect(payload).toMatchObject({
      name: 'Linen Camp Shirt',
      sku: 'LIN-IVO-M',
      unit_price: 128,
      reorder_point: 2,
      bin_location: 'A1-5'
    });
  });

  it('never sends product: moving a variant to another style is out of scope', () => {
    // InventoryItemUpdateSerializer refuses it, and a writable field would
    // look like it re-derived the SKU, category and display name.
    const payload = buildItemUpdatePayload(editForm, { size: 'M', sizeValues: [], color: 'Ivory' });

    expect(payload).not.toHaveProperty('product');
  });

  it('clears a colour the operator emptied, rather than dropping the edit', () => {
    // '' is accepted (allow_blank) and means "no colour". Omitting the key
    // would silently keep the old one.
    const payload = buildItemUpdatePayload(editForm, { size: 'M', sizeValues: [], color: '' });

    expect(payload.color).toBe('');
  });
});

describe('distinctColors', () => {
  it('is every colour the company already uses, deduped and sorted', () => {
    const products = [{ colors: ['Ivory', 'Clay'] }, { colors: ['Clay', 'Indigo'] }];

    expect(distinctColors(products)).toEqual(['Clay', 'Indigo', 'Ivory']);
  });

  it('dedupes case-insensitively, keeping the first spelling seen', () => {
    // "ivory" and "Ivory" are one colour to a merchant; offering both invites
    // two spellings of the same rail.
    expect(distinctColors([{ colors: ['Ivory'] }, { colors: ['ivory'] }])).toEqual(['Ivory']);
  });

  it('ignores blanks and styles with no colours', () => {
    expect(distinctColors([{ colors: ['', '  '] }, {}, { colors: undefined }])).toEqual([]);
  });
});

describe('derivedVariantName', () => {
  it('is the style name, the colour and the size, as the server builds it', () => {
    // _create_variant names the item itself: " ".join(name, color, size). The
    // form shows this so the operator is not typing a name that gets replaced.
    expect(derivedVariantName('Camp Shirt', 'Ivory', 'M')).toBe('Camp Shirt Ivory M');
  });

  it('omits the parts that are empty', () => {
    expect(derivedVariantName('Camp Shirt', '', '')).toBe('Camp Shirt');
    expect(derivedVariantName('Camp Shirt', 'Ivory', '')).toBe('Camp Shirt Ivory');
  });
});
