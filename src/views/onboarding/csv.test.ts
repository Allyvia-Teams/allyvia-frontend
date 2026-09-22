import { describe, expect, it } from 'vitest';

import { csvEscape, rejectedCsvFilename, rejectedRowsCsv, toCsv } from './csv';

describe('csvEscape', () => {
  it('passes plain values through', () => {
    expect(csvEscape('hello')).toBe('hello');
  });

  it('quotes values containing commas', () => {
    expect(csvEscape('a,b')).toBe('"a,b"');
  });

  it('doubles and wraps embedded double quotes', () => {
    expect(csvEscape('say "hi"')).toBe('"say ""hi"""');
  });

  it('quotes values containing newlines', () => {
    expect(csvEscape('line1\nline2')).toBe('"line1\nline2"');
    expect(csvEscape('line1\rline2')).toBe('"line1\rline2"');
  });

  it('renders null and undefined as empty', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });

  it('joins arrays with a semicolon-space (then quotes if needed)', () => {
    expect(csvEscape(['missing_required', 'bad_type'])).toBe('missing_required; bad_type');
  });

  it('stringifies nested objects as JSON', () => {
    expect(csvEscape({ a: 1 })).toBe('"{""a"":1}"');
  });

  it('preserves 0 and false', () => {
    expect(csvEscape(0)).toBe('0');
    expect(csvEscape(false)).toBe('false');
  });
});

describe('toCsv', () => {
  it('produces exact RFC4180 output with CRLF line endings', () => {
    const rows = [
      { a: 1, b: 'x,y' },
      { a: 2, b: 'z' }
    ];
    expect(toCsv(rows)).toBe('a,b\r\n1,"x,y"\r\n2,z');
  });

  it('unions headers in first-seen order when a later row adds a key', () => {
    const rows = [{ a: 1 }, { b: 2, a: 3 }];
    expect(toCsv(rows)).toBe('a,b\r\n1,\r\n3,2');
  });

  it('respects an explicit columnOrder', () => {
    const rows = [{ a: 1, b: 2 }];
    expect(toCsv(rows, ['b', 'a'])).toBe('b,a\r\n2,1');
  });

  it('returns empty string for zero rows', () => {
    expect(toCsv([])).toBe('');
  });
});

describe('rejectedRowsCsv', () => {
  it('puts reject_reasons first, then remaining keys first-seen', () => {
    const payload = {
      rows: [
        { sku: 'A-1', reject_reasons: ['missing_required'], price: '9.99' },
        { sku: 'B-2', reject_reasons: ['bad_type', 'missing_required'], price: '' }
      ]
    };
    expect(rejectedRowsCsv(payload)).toBe('reject_reasons,sku,price\r\nmissing_required,A-1,9.99\r\nbad_type; missing_required,B-2,');
  });

  it('returns empty string for zero rows', () => {
    expect(rejectedRowsCsv({ rows: [] })).toBe('');
  });
});

describe('rejectedCsvFilename', () => {
  it('uses the last dotted segment with non-alphanumerics collapsed to hyphens', () => {
    expect(rejectedCsvFilename('proj.ds.table_rejected')).toBe('rejected-rows-table-rejected.csv');
    expect(rejectedCsvFilename('raw_tenant__sales_2024')).toBe('rejected-rows-raw-tenant-sales-2024.csv');
  });

  it('falls back gracefully on empty input', () => {
    expect(rejectedCsvFilename('')).toBe('rejected-rows-table.csv');
  });
});
