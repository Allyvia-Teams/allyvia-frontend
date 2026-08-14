import { describe, expect, it } from 'vitest';

import type { FieldMappings, OnboardingRegistry, StagedTablePreview } from 'api/onboarding.api';
import type { MappingRow } from './mapping';
import {
  applyTargetChange,
  buildPatchPayload,
  buildRows,
  compositeErrorMessage,
  combineChipLabel,
  compositePairs,
  compositePartners,
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
        {
          name: 'occurred_at',
          type: 'TIMESTAMP',
          aliases: [],
          validator: 'timestamp_like',
          description: 'When the sale happened',
          required: false
        },
        { name: 'total', type: 'NUMERIC', aliases: [], validator: 'non_negative', description: 'Sale total', required: false },
        { name: 'price', type: 'NUMERIC', aliases: [], validator: 'non_negative', description: 'Line price', required: false },
        {
          name: 'source_timezone',
          type: 'STRING',
          aliases: ['time_zone', 'timezone', 'tz'],
          validator: 'timezone_like',
          description: 'IANA timezone the local date/time was recorded in',
          required: false
        }
      ]
    }
  },
  sentinel_targets: ['extra', 'semantic_only', 'ignore'],
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
    expect(groups[1].options.map((o) => o.value)).toEqual(['extra', 'semantic_only', 'ignore']);
    // The three differ in kind: kept-and-usable, kept-for-retrieval, dropped.
    expect(groups[1].options[0].description).toBe('Keep as a searchable custom field');
    expect(groups[1].options[1].description).toBe('Keep for AI retrieval only (not filterable)');
    expect(groups[1].options[2].label).toBe('Ignore (drop)');
    expect(groups[1].options[2].description).toBe('Drop this column — it will not be imported');
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

  // Scoped, not removed: still true for every NON-composite duplicate.
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

// ---------------------------------------------------------------------------
// Composite mappings: date + time -> one TIMESTAMP field. Mirrors the backend
// matrix in app/tests/test_onboarding_mapping.py::CompositeValidationTests.
// ---------------------------------------------------------------------------

const row = (column: string, rawType: string, samples: string[], target: string): MappingRow => ({
  column,
  rawType,
  displayType: rawType,
  samples,
  target,
  confidence: 1.0,
  source: 'manual',
  transforms: []
});

const compositeRows = [
  row('Date', 'STRING', ['2026-03-02', '2026-03-03'], 'occurred_at'),
  row('Time', 'STRING', ['10:16:07', '13:05:22'], 'occurred_at'),
  row('Amt', 'STRING', ['5.00'], 'total')
];

const compositeMappings = (extra: FieldMappings = {}): FieldMappings => ({
  Date: { target: 'occurred_at', confidence: 1.0, source: 'deterministic' },
  Time: { target: 'occurred_at', confidence: 0.95, source: 'deterministic' },
  Amt: { target: 'total', confidence: 1.0, source: 'manual' },
  ...extra
});

describe('compositePairs', () => {
  it('pairs a date-like and a time-like column on a TIMESTAMP target', () => {
    const pairs = compositePairs('sale', compositeMappings(), compositeRows, registry);
    expect(pairs.get('occurred_at')).toEqual({ dateCol: 'Date', timeCol: 'Time' });
  });

  it('prefers the persisted composite_role over sample shape', () => {
    // No usable samples: only the server-stamped roles can settle it. This is
    // the case the renderer depends on.
    const rows = [row('A', 'STRING', [], 'occurred_at'), row('B', 'STRING', [], 'occurred_at')];
    const mappings: FieldMappings = {
      A: { target: 'occurred_at', confidence: 1.0, source: 'manual', composite_role: 'time' },
      B: { target: 'occurred_at', confidence: 1.0, source: 'manual', composite_role: 'date' }
    };
    expect(compositePairs('sale', mappings, rows, registry).get('occurred_at')).toEqual({
      dateCol: 'B',
      timeCol: 'A'
    });
  });

  it('classifies by schema type when the columns are typed DATE/TIME', () => {
    const rows = [row('D', 'DATE', [], 'occurred_at'), row('T', 'TIME', [], 'occurred_at')];
    const mappings: FieldMappings = {
      D: { target: 'occurred_at', confidence: 1.0, source: 'manual' },
      T: { target: 'occurred_at', confidence: 1.0, source: 'manual' }
    };
    expect(compositePairs('sale', mappings, rows, registry).get('occurred_at')).toEqual({
      dateCol: 'D',
      timeCol: 'T'
    });
  });

  it('is not a composite on a non-TIMESTAMP target, or with two dates', () => {
    const twoDates = [row('D1', 'DATE', [], 'occurred_at'), row('D2', 'DATE', [], 'occurred_at')];
    expect(
      compositePairs(
        'sale',
        { D1: { target: 'occurred_at', confidence: 1, source: 'manual' }, D2: { target: 'occurred_at', confidence: 1, source: 'manual' } },
        twoDates,
        registry
      ).size
    ).toBe(0);

    const ontoNumeric = [row('D', 'DATE', [], 'total'), row('T', 'TIME', [], 'total')];
    expect(
      compositePairs(
        'sale',
        { D: { target: 'total', confidence: 1, source: 'manual' }, T: { target: 'total', confidence: 1, source: 'manual' } },
        ontoNumeric,
        registry
      ).size
    ).toBe(0);
  });

  it('compositePartners names the partner from either side', () => {
    const partners = compositePartners(compositePairs('sale', compositeMappings(), compositeRows, registry));
    expect(partners.get('Date')).toBe('Time');
    expect(partners.get('Time')).toBe('Date');
    expect(partners.has('Amt')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// The timezone member. A zone column does not CLAIM occurred_at (it has its
// own canonical home, source_timezone) but it does participate in the combine,
// so the wizard has to show it as part of the group rather than as an
// unrelated field. Mirrors app/onboarding/mapping.py::zone_column.
// ---------------------------------------------------------------------------

const zoneRows = [
  ...compositeRows,
  row('Time Zone', 'STRING', ['Central Time (US & Canada)'], 'source_timezone')
];

const zoneMappings = (): FieldMappings =>
  compositeMappings({
    'Time Zone': { target: 'source_timezone', confidence: 1.0, source: 'deterministic', composite_role: 'timezone' }
  });

describe('timezone combine member', () => {
  it('attaches the zone column to the pair', () => {
    const pairs = compositePairs('sale', zoneMappings(), zoneRows, registry);
    expect(pairs.get('occurred_at')).toEqual({ dateCol: 'Date', timeCol: 'Time', zoneCol: 'Time Zone' });
  });

  it('names every other member from each side', () => {
    const partners = compositePartners(compositePairs('sale', zoneMappings(), zoneRows, registry));
    expect(partners.get('Date')).toBe('Time, Time Zone');
    expect(partners.get('Time')).toBe('Date, Time Zone');
    expect(partners.get('Time Zone')).toBe('Date, Time');
  });

  it('leaves a zone column out when there is no combine to join', () => {
    // occurred_at mapped from one column: nothing to combine, so the zone
    // column is an ordinary field and must not render a combine chip.
    const rows = [row('When', 'TIMESTAMP', [], 'occurred_at'), row('Time Zone', 'STRING', [], 'source_timezone')];
    const mappings: FieldMappings = {
      When: { target: 'occurred_at', confidence: 1, source: 'manual' },
      'Time Zone': { target: 'source_timezone', confidence: 1, source: 'manual' }
    };
    const partners = compositePartners(compositePairs('sale', mappings, rows, registry));
    expect(partners.has('Time Zone')).toBe(false);
  });

  it('drops the zone member when it is overridden to extra', () => {
    const mappings = compositeMappings({
      'Time Zone': { target: 'extra', confidence: null, source: 'manual' }
    });
    const partners = compositePartners(compositePairs('sale', mappings, zoneRows, registry));
    expect(partners.has('Time Zone')).toBe(false);
    // The date/time pair survives on its own.
    expect(partners.get('Date')).toBe('Time');
  });
});

describe('validateMappings — composites', () => {
  const cols = ['Date', 'Time', 'Amt'];

  it('a legal composite is not an error', () => {
    expect(validateMappings('sale', compositeMappings(), cols, registry, compositeRows)).toEqual({});
  });

  it('near-misses use the backend message verbatim', () => {
    const twoDates = [
      row('Date', 'STRING', ['2026-03-02'], 'occurred_at'),
      row('Time', 'STRING', ['2026-03-03'], 'occurred_at'),
      row('Amt', 'STRING', ['5.00'], 'total')
    ];
    const errors = validateMappings('sale', compositeMappings(), cols, registry, twoDates);
    expect(errors.Date).toBe(compositeErrorMessage('occurred_at'));
    expect(errors.Time).toBe(compositeErrorMessage('occurred_at'));
    expect(compositeErrorMessage('occurred_at')).toBe('occurred_at can combine exactly one date column and one time column.');
  });

  it('without rows a composite is unrecognisable and still rejected (safe default)', () => {
    const errors = validateMappings('sale', compositeMappings(), cols, registry);
    expect(errors.Date).toBeDefined();
  });

  it('retargeting one member dissolves the composite and leaves the partner alone', () => {
    const dissolved = applyTargetChange(compositeMappings(), 'Time', 'extra');
    const rows = [compositeRows[0], row('Time', 'STRING', ['10:16:07'], 'extra'), compositeRows[2]];
    expect(validateMappings('sale', dissolved, cols, registry, rows)).toEqual({});
    expect(compositePairs('sale', dissolved, rows, registry).size).toBe(0);
  });

  it('buildPatchPayload preserves composite_role so the server can still render', () => {
    const mappings = compositeMappings({
      Date: { target: 'occurred_at', confidence: 1.0, source: 'deterministic', composite_role: 'date' },
      Time: { target: 'occurred_at', confidence: 0.95, source: 'deterministic', composite_role: 'time' }
    });
    const payload = buildPatchPayload('sale', mappings, cols).field_mappings!;
    expect(payload.Date.composite_role).toBe('date');
    expect(payload.Time.composite_role).toBe('time');
  });

  it('switching entity dissolves the composite cleanly', () => {
    const remapped = remapForEntity(compositeMappings(), registry, 'product');
    // occurred_at/total are not product targets, so both reset to extra.
    expect(remapped.fieldMappings.Date.target).toBe('extra');
    expect(remapped.fieldMappings.Time.target).toBe('extra');
    expect(compositePairs('product', remapped.fieldMappings, compositeRows, registry).size).toBe(0);
  });
});

describe('combineChipLabel', () => {
  const pairs = () => compositePairs('sale', zoneMappings(), zoneRows, registry);

  it('says TIMESTAMP for the date and time members', () => {
    expect(combineChipLabel('Date', pairs())).toBe('Combine → TIMESTAMP');
    expect(combineChipLabel('Time', pairs())).toBe('Combine → TIMESTAMP');
  });

  it('says what the zone column actually does', () => {
    // The zone column feeds the combine but does not become a TIMESTAMP —
    // labelling it "Combine → TIMESTAMP" misdescribes its target.
    expect(combineChipLabel('Time Zone', pairs())).toBe('Supplies timezone');
  });

  it('is null for a column outside any combine', () => {
    expect(combineChipLabel('Amt', pairs())).toBeNull();
  });
});
