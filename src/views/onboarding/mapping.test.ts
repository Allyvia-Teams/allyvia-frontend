import { describe, expect, it } from 'vitest';

import type { FieldMappings, OnboardingRegistry, StagedTablePreview } from 'api/onboarding.api';
import {
  applyTargetChange,
  buildPatchPayload,
  buildRows,
  confidenceBand,
  missingRequiredFields,
  normalizeType,
  remapForEntity,
  sampleValues,
  targetOptions,
  transformLabel,
  validateMappings
} from './mapping';

const registry: OnboardingRegistry = {
  entities: {
    product: {
      name: 'product',
      description: 'A sellable product.',
      fields: [
        { name: 'sku', type: 'STRING', aliases: ['sku'], validator: 'non_empty', description: 'Stock-keeping unit', required: true },
        { name: 'name', type: 'STRING', aliases: ['name'], validator: 'non_empty', description: 'Product name', required: true },
        { name: 'price', type: 'NUMERIC', aliases: ['price'], validator: 'non_negative', description: 'Unit price', required: false }
      ]
    },
    sale: {
      name: 'sale',
      description: 'A completed sale.',
      fields: [
        { name: 'sale_id', type: 'STRING', aliases: [], validator: 'non_empty', description: 'Sale id', required: true },
        { name: 'total', type: 'NUMERIC', aliases: [], validator: 'non_negative', description: 'Sale total', required: false },
        { name: 'price', type: 'NUMERIC', aliases: [], validator: 'non_negative', description: 'Line price', required: false }
      ]
    }
  },
  sentinel_targets: ['extra', 'semantic_only'],
  transform_ops: ['strip_whitespace', 'currency_to_decimal', 'parse_date', 'parse_timestamp', 'safe_cast:NUMERIC'],
  legacy_type_map: { INTEGER: 'INT64', FLOAT: 'FLOAT64', BOOLEAN: 'BOOL' }
};

describe('normalizeType', () => {
  it('maps legacy names and passes unknowns through uppercased/trimmed', () => {
    expect(normalizeType('INTEGER', registry.legacy_type_map)).toBe('INT64');
    expect(normalizeType('FLOAT', registry.legacy_type_map)).toBe('FLOAT64');
    expect(normalizeType('BOOLEAN', registry.legacy_type_map)).toBe('BOOL');
    expect(normalizeType('STRING', registry.legacy_type_map)).toBe('STRING');
    expect(normalizeType(' integer ', registry.legacy_type_map)).toBe('INT64');
    expect(normalizeType('DATETIME', registry.legacy_type_map)).toBe('DATETIME');
  });
});

describe('confidenceBand', () => {
  it('bands per the design thresholds', () => {
    expect(confidenceBand(1.0)).toBe('high');
    expect(confidenceBand(0.95)).toBe('high');
    expect(confidenceBand(0.9)).toBe('high');
    expect(confidenceBand(0.89)).toBe('medium');
    expect(confidenceBand(0.6)).toBe('medium');
    expect(confidenceBand(0.59)).toBe('low');
    expect(confidenceBand(0.5)).toBe('low'); // Gemini gate cap lands in low
    expect(confidenceBand(0)).toBe('low');
  });

  it('null and undefined mean needs-review', () => {
    expect(confidenceBand(null)).toBe('review');
    expect(confidenceBand(undefined)).toBe('review');
  });
});

describe('sampleValues', () => {
  const rows = [
    { col: 'a', num: 0, flag: false },
    { col: 'a', num: 1, flag: true },
    { col: null, num: undefined, flag: '' },
    { col: 'b', num: 2, flag: false },
    { col: 'c', num: 3, flag: true }
  ];

  it('returns distinct values, skipping null/undefined/empty', () => {
    expect(sampleValues(rows, 'col')).toEqual(['a', 'b', 'c']);
  });

  it('keeps 0 and false, stringified', () => {
    expect(sampleValues(rows, 'num', 2)).toEqual(['0', '1']);
    expect(sampleValues(rows, 'flag', 2)).toEqual(['false', 'true']);
  });

  it('respects the limit', () => {
    expect(sampleValues(rows, 'col', 2)).toEqual(['a', 'b']);
  });

  it('truncates values longer than 60 chars with an ellipsis', () => {
    const long = 'x'.repeat(61);
    expect(sampleValues([{ v: long }], 'v')).toEqual([`${'x'.repeat(60)}…`]);
    expect(sampleValues([{ v: 'x'.repeat(60) }], 'v')).toEqual(['x'.repeat(60)]);
  });
});

describe('buildRows', () => {
  const schema = [
    { name: 'SKU', type: 'STRING' },
    { name: 'Qty', type: 'INTEGER' },
    { name: 'Extra Col', type: 'STRING' }
  ];
  const proposal = {
    field_mappings: {
      SKU: { target: 'sku', confidence: 1.0, source: 'deterministic' },
      Qty: { target: 'price', confidence: 0.5, source: 'gemini' }
    } as FieldMappings,
    transforms: { SKU: ['strip_whitespace'] }
  };
  const preview = {
    rows: [{ SKU: 'A-1', Qty: 5 }]
  } as unknown as StagedTablePreview;

  it('preserves schema order and joins mappings, transforms, and samples', () => {
    const built = buildRows(schema, proposal, preview, registry);
    expect(built.map((r) => r.column)).toEqual(['SKU', 'Qty', 'Extra Col']);
    expect(built[0]).toMatchObject({ target: 'sku', confidence: 1.0, source: 'deterministic', transforms: ['strip_whitespace'] });
    expect(built[0].samples).toEqual(['A-1']);
    expect(built[1]).toMatchObject({ target: 'price', displayType: 'INT64', rawType: 'INTEGER', transforms: [] });
  });

  it('renders a column absent from field_mappings as an unmapped manual row', () => {
    const built = buildRows(schema, proposal, preview, registry);
    expect(built[2]).toMatchObject({ target: '', confidence: null, source: 'manual' });
    expect(built[2].samples).toEqual([]); // absent from preview rows
  });

  it('tolerates a missing preview', () => {
    const built = buildRows(schema, proposal, undefined, registry);
    expect(built[0].samples).toEqual([]);
  });
});

describe('targetOptions', () => {
  it('returns the entity group then the sentinel group', () => {
    const groups = targetOptions(registry, 'product');
    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe('product');
    expect(groups[0].options.map((o) => o.value)).toEqual(['sku', 'name', 'price']);
    expect(groups[0].options[0].required).toBe(true);
    expect(groups[0].options[2].required).toBe(false);
    expect(groups[1].label).toBe('Keep unmapped');
    expect(groups[1].options.map((o) => o.value)).toEqual(['extra', 'semantic_only']);
    expect(groups[1].options[0].description).toBe('Preserve raw value in the extra JSON column');
    expect(groups[1].options[1].description).toBe('Keep for AI retrieval only');
  });

  it('unknown entity yields only the sentinel group', () => {
    const groups = targetOptions(registry, 'nope');
    expect(groups).toHaveLength(1);
    expect(groups[0].label).toBe('Keep unmapped');
  });
});

describe('applyTargetChange', () => {
  it('sets a definitive manual entry immutably', () => {
    const before: FieldMappings = { SKU: { target: 'sku', confidence: 0.7, source: 'gemini' } };
    const after = applyTargetChange(before, 'SKU', 'name');
    expect(after.SKU).toEqual({ target: 'name', confidence: 1.0, source: 'manual' });
    expect(before.SKU).toEqual({ target: 'sku', confidence: 0.7, source: 'gemini' }); // input untouched
  });

  it('preserves other columns', () => {
    const before: FieldMappings = {
      A: { target: 'sku', confidence: 1.0, source: 'deterministic' },
      B: { target: 'extra', confidence: null, source: 'manual' }
    };
    const after = applyTargetChange(before, 'B', 'price');
    expect(after.A).toBe(before.A);
    expect(after.B.target).toBe('price');
  });
});

describe('remapForEntity', () => {
  it('keeps targets valid for the new entity, resets invalid ones to extra', () => {
    const mappings: FieldMappings = {
      A: { target: 'sku', confidence: 1.0, source: 'deterministic' }, // invalid for sale
      B: { target: 'price', confidence: 0.9, source: 'gemini' }, // valid for both
      C: { target: 'extra', confidence: null, source: 'manual' } // sentinel: never reset
    };
    const { fieldMappings, resetColumns } = remapForEntity(mappings, registry, 'sale');
    expect(resetColumns).toEqual(['A']);
    expect(fieldMappings.A).toEqual({ target: 'extra', confidence: null, source: 'manual' });
    expect(fieldMappings.B).toBe(mappings.B);
    expect(fieldMappings.C).toBe(mappings.C);
  });

  it('empty mapping → empty result', () => {
    expect(remapForEntity({}, registry, 'sale')).toEqual({ fieldMappings: {}, resetColumns: [] });
  });
});

describe('buildPatchPayload', () => {
  it('includes every column, forcing missing/empty ones to extra, and omits transforms', () => {
    const mappings: FieldMappings = {
      A: { target: 'sku', confidence: 1.0, source: 'deterministic' },
      B: { target: '', confidence: null, source: 'manual' }
    };
    const patch = buildPatchPayload('product', mappings, ['A', 'B', 'C']);
    expect(patch.proposed_entity).toBe('product');
    expect(patch.field_mappings).toEqual({
      A: { target: 'sku', confidence: 1.0, source: 'deterministic' },
      B: { target: 'extra', confidence: null, source: 'manual' },
      C: { target: 'extra', confidence: null, source: 'manual' }
    });
    expect('transforms' in patch).toBe(false);
  });
});

describe('validateMappings', () => {
  const columns = ['A', 'B', 'C'];
  const valid: FieldMappings = {
    A: { target: 'sku', confidence: 1.0, source: 'deterministic' },
    B: { target: 'name', confidence: 1.0, source: 'manual' },
    C: { target: 'extra', confidence: null, source: 'manual' }
  };

  it('valid full mapping → {}', () => {
    expect(validateMappings('product', valid, columns, registry)).toEqual({});
  });

  it('an unknown mapped column → field_mappings error', () => {
    const mappings = { ...valid, Ghost: { target: 'price', confidence: null, source: 'manual' as const } };
    expect(validateMappings('product', mappings, columns, registry).field_mappings).toContain('Ghost');
  });

  it('a missing column → field_mappings error mentioning extra', () => {
    const { C: _dropped, ...partial } = valid;
    const errors = validateMappings('product', partial, columns, registry);
    expect(errors.field_mappings).toContain('C');
    expect(errors.field_mappings).toContain('extra');
  });

  it('duplicate non-sentinel target errors on BOTH claimant columns', () => {
    const mappings: FieldMappings = {
      A: { target: 'sku', confidence: 1.0, source: 'manual' },
      B: { target: 'sku', confidence: 1.0, source: 'manual' },
      C: { target: 'extra', confidence: null, source: 'manual' }
    };
    const errors = validateMappings('product', mappings, columns, registry);
    expect(errors.A).toBeDefined();
    expect(errors.B).toBeDefined();
    expect(errors.C).toBeUndefined();
  });

  it('duplicate sentinels are fine', () => {
    const mappings: FieldMappings = {
      A: { target: 'extra', confidence: null, source: 'manual' },
      B: { target: 'extra', confidence: null, source: 'manual' },
      C: { target: 'semantic_only', confidence: null, source: 'manual' }
    };
    expect(validateMappings('product', mappings, columns, registry)).toEqual({});
  });

  it('a target not in the entity → per-column error', () => {
    const mappings = { ...valid, A: { target: 'total', confidence: 1.0, source: 'manual' as const } };
    expect(validateMappings('product', mappings, columns, registry).A).toContain('total');
  });

  it('unknown entity → proposed_entity error', () => {
    expect(validateMappings('spaceship', valid, columns, registry).proposed_entity).toContain('spaceship');
  });

  it('empty entity allowed only when every target is sentinel', () => {
    const allSentinel: FieldMappings = {
      A: { target: 'extra', confidence: null, source: 'manual' },
      B: { target: 'semantic_only', confidence: null, source: 'manual' },
      C: { target: 'extra', confidence: null, source: 'manual' }
    };
    expect(validateMappings('', allSentinel, columns, registry)).toEqual({});
    expect(validateMappings('', valid, columns, registry).proposed_entity).toBeDefined();
  });
});

describe('missingRequiredFields', () => {
  it('all required mapped → []', () => {
    const mappings: FieldMappings = {
      A: { target: 'sku', confidence: 1.0, source: 'manual' },
      B: { target: 'name', confidence: 1.0, source: 'manual' }
    };
    expect(missingRequiredFields('product', mappings, registry)).toEqual([]);
  });

  it('one missing → its name', () => {
    const mappings: FieldMappings = { A: { target: 'sku', confidence: 1.0, source: 'manual' } };
    expect(missingRequiredFields('product', mappings, registry)).toEqual(['name']);
  });

  it('unknown entity → [] (confirm handles it server-side)', () => {
    expect(missingRequiredFields('spaceship', {}, registry)).toEqual([]);
  });
});

describe('transformLabel', () => {
  it('labels the closed vocabulary', () => {
    expect(transformLabel('strip_whitespace')).toBe('Trim whitespace');
    expect(transformLabel('currency_to_decimal')).toBe('Currency → decimal');
    expect(transformLabel('parse_date')).toBe('Parse date');
    expect(transformLabel('parse_timestamp')).toBe('Parse timestamp');
  });

  it('labels safe_cast with its type', () => {
    expect(transformLabel('safe_cast:NUMERIC')).toBe('Cast to NUMERIC');
    expect(transformLabel('safe_cast:DATE')).toBe('Cast to DATE');
  });

  it('unknown ops pass through verbatim', () => {
    expect(transformLabel('future_op')).toBe('future_op');
  });
});
