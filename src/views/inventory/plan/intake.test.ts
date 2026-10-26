import { describe, expect, it } from 'vitest';

import { MAX_DROP_BYTES, MAX_FILE_BYTES, MAX_FILES, previewCsv, sniff, validateDrop } from './intake';

const bytes = (...values: number[]) => new Uint8Array(values);
const text = (s: string) => new TextEncoder().encode(s);

describe('sniff: by the bytes, not the name', () => {
  it('reads a PDF by its magic bytes, whatever it is called', () => {
    expect(sniff(text('%PDF-1.7\n...'), 'linesheet.csv')).toBe('pdf');
    expect(sniff(text('%PDF-1.4'), 'whatever')).toBe('pdf');
  });

  it('reads pictures by their signatures', () => {
    expect(sniff(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a), 'a.pdf')).toBe('image');
    expect(sniff(bytes(0xff, 0xd8, 0xff, 0xe0), 'a.txt')).toBe('image');
    expect(sniff(text('GIF89a'), 'a')).toBe('image');
    expect(sniff(new Uint8Array([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP')]), 'a')).toBe('image');
    expect(sniff(new Uint8Array([0, 0, 0, 24, ...text('ftypheic')]), 'IMG_1.HEIC')).toBe('image');
  });

  it('a zip is a workbook; text with commas named .csv is a sheet; a PDF named .jpg is still a PDF', () => {
    expect(sniff(bytes(0x50, 0x4b, 0x03, 0x04, 1, 2), 'lines.xlsx')).toBe('spreadsheet');
    expect(sniff(text('Style,Name,Retail\nA1,Dress,120\n'), 'lines.csv')).toBe('csv');
    expect(sniff(text('%PDF-1.5'), 'photo.jpg')).toBe('pdf');
    expect(sniff(bytes(0x00, 0x01, 0x02), 'blob.bin')).toBe('unknown');
  });
});

describe("validateDrop: the server's limits, in its units (MiB)", () => {
  it('passes a drop inside every limit', () => {
    expect(validateDrop([{ name: 'a.csv', size: 1000 }])).toEqual({ ok: true, sentences: [] });
  });

  it('refuses more than 20 files, a file over 20 MB, a drop over 30 MB, and an empty drop', () => {
    expect(MAX_FILES).toBe(20);
    expect(MAX_FILE_BYTES).toBe(20 * 1024 * 1024);
    expect(MAX_DROP_BYTES).toBe(30 * 1024 * 1024);
    expect(validateDrop(Array.from({ length: 21 }, (_, i) => ({ name: `f${i}.csv`, size: 10 })))).toEqual({
      ok: false,
      sentences: ['Drop at most 20 files at a time.']
    });
    expect(validateDrop([{ name: 'big.pdf', size: MAX_FILE_BYTES + 1 }]).sentences).toContain('big.pdf is over 20 MB.');
    expect(
      validateDrop([
        { name: 'a.pdf', size: 16 * 1024 * 1024 },
        { name: 'b.pdf', size: 16 * 1024 * 1024 }
      ]).sentences
    ).toContain('One drop takes at most 30 MB.');
    expect(validateDrop([])).toEqual({ ok: false, sentences: ['Choose at least one file.'] });
  });
});

describe('previewCsv: what a sheet holds, before the server reads it', () => {
  it('groups rows as the server does: by style code and brand, else by name and brand, and flags a row with no price', () => {
    const csv = [
      'Style #,Style Name,Brand,Size,Retail Price USD,Wholesale',
      'MR-101,Poppy Dress,Meadow,S,120,48',
      'MR-101,Poppy Dress,Meadow,M,120,48',
      ',Linen Shirt,Lune,M,,30',
      ',Linen Shirt,Lune,L,,30',
      ',Linen Shirt,Meadow,M,90,30',
      'MR-202,,Meadow,M,,'
    ].join('\n');
    const p = previewCsv(csv);
    expect(p.rows).toBe(6);
    expect(p.styles).toBe(4);
    expect(p.noPrice).toBe(3);
    expect(p.groups.map((g) => [g.key, g.rows])).toEqual([
      ['code:mr-101|meadow', 2],
      ['name:linen shirt|lune', 2],
      ['name:linen shirt|meadow', 1],
      ['code:mr-202|meadow', 1]
    ]);
  });

  it('a bare Price alone is the question the server will ask (retail or wholesale), never read as retail', () => {
    expect(previewCsv('Name,Price\nDress,120\nTop,\n')).toMatchObject({ rows: 2, styles: 2, noPrice: 2, ambiguousPrice: 'Price' });
    // Beside a named wholesale column it is the retail price; beside a named retail column it is the cost.
    expect(previewCsv('Name,Wholesale,Price\nDress,48,120\nTop,30,\n')).toMatchObject({ noPrice: 1, ambiguousPrice: null });
    expect(previewCsv('Name,Retail,Price\nDress,120,48\nTop,,30\n')).toMatchObject({ noPrice: 1, ambiguousPrice: null });
  });

  it('reads a semicolon or tab sheet, finds the header below a title row, and counts an unreadable price as none', () => {
    expect(previewCsv('Spring line sheet;;\nStyle Name;Retail\nDress;120\nTop;TBD\n')).toMatchObject({ rows: 2, styles: 2, noPrice: 1 });
    expect(previewCsv('Style Name\tRetail\nDress\t$1,120.00\n')).toMatchObject({ rows: 1, styles: 1, noPrice: 0 });
  });

  it('says nothing when no column names a style', () => {
    expect(previewCsv('Colour,Qty\nRed,3\n')).toMatchObject({ rows: 1, styles: 0 });
    expect(previewCsv('')).toMatchObject({ rows: 0, styles: 0, noPrice: 0 });
  });

  it('copes with a BOM, quoted commas and blank rows', () => {
    const p = previewCsv('﻿Style Name,Retail\n"Dress, long",120\n\n,\n');
    expect(p).toMatchObject({ rows: 1, styles: 1, noPrice: 0 });
  });
});
