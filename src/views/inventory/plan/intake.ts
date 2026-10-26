// What she drops onto a plan, read before it goes (Inventory › Plan, buy planner B9; design §2).
//
// - A file is told by its bytes, not its name (a PDF named .jpg is still a PDF). The drop zone carries no
//   `accept` filter: the sniff says what the page thinks a file is, and the server decides (buying/intake.py).
// - The limits are the server's, in its units: at most 20 files a drop, 20 MiB a file, 30 MiB a request.
// - A CSV preview mirrors the server's reading (inventory/linesheet.py's header aliases; buying/intake.py's one
//   line per style: by code and brand, else by name and brand) so she can see what a sheet holds and which rows
//   carry no retail price before she sends it. It is a preview: the server's reading is the one that counts.

export const MAX_FILES = 20;
export const MAX_FILE_BYTES = 20 * 1024 * 1024;
export const MAX_DROP_BYTES = 30 * 1024 * 1024;

export type FileKind = 'pdf' | 'image' | 'spreadsheet' | 'csv' | 'unknown';

const startsWith = (bytes: Uint8Array, signature: number[], offset = 0) =>
  bytes.length >= offset + signature.length && signature.every((b, i) => bytes[offset + i] === b);

const ascii = (s: string) => Array.from(s, (c) => c.charCodeAt(0));

const HEIF_BRANDS = ['heic', 'heix', 'hevc', 'hevx', 'heif', 'mif1', 'msf1', 'avif'];

/** What a file is, from its first bytes (a few dozen are enough); the name only tells a CSV from other text. */
export const sniff = (bytes: Uint8Array, name: string): FileKind => {
  if (startsWith(bytes, ascii('%PDF'))) return 'pdf';
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47])) return 'image';
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return 'image';
  if (startsWith(bytes, ascii('GIF8'))) return 'image';
  if (startsWith(bytes, ascii('RIFF')) && startsWith(bytes, ascii('WEBP'), 8)) return 'image';
  if (startsWith(bytes, ascii('ftyp'), 4) && HEIF_BRANDS.some((brand) => startsWith(bytes, ascii(brand), 8))) return 'image';
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) return 'spreadsheet';
  if (/\.csv$/i.test(name) && !bytes.slice(0, 4096).includes(0)) return 'csv';
  return 'unknown';
};

export const validateDrop = (files: { name: string; size: number }[]): { ok: boolean; sentences: string[] } => {
  if (files.length === 0) return { ok: false, sentences: ['Choose at least one file.'] };
  if (files.length > MAX_FILES) return { ok: false, sentences: [`Drop at most ${MAX_FILES} files at a time.`] };
  const sentences = files.filter((f) => f.size > MAX_FILE_BYTES).map((f) => `${f.name} is over 20 MB.`);
  if (files.reduce((sum, f) => sum + f.size, 0) > MAX_DROP_BYTES) sentences.push('One drop takes at most 30 MB.');
  return { ok: sentences.length === 0, sentences };
};

// --- The CSV preview -------------------------------------------------------------------------------------

/** inventory/linesheet.py ALIASES, the four fields the preview reads. */
const ALIASES: Record<'style_code' | 'style_name' | 'brand' | 'intended_price', string[]> = {
  style_code: [
    'style_code',
    'style_number',
    'style_no',
    'style_num',
    'style_id',
    'style_ref',
    'style',
    'article_number',
    'article_no',
    'article'
  ],
  style_name: ['style_name', 'product_name', 'item_name', 'name', 'title', 'product', 'item'],
  brand: ['brand', 'designer', 'label', 'maker'],
  intended_price: ['retail_price', 'retail', 'msrp', 'srp', 'rrp', 'unit_price', 'selling_price', 'sale_price', 'list_price']
};
const BARE_PRICE = ['price', 'price_each', 'unit_price_each'];
const UNIT_SUFFIXES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'nzd', 'each', 'ea', 'per_unit'];

/** onboarding.registry.normalize_header, then linesheet.normalise's unit suffixes. */
export const normaliseHeader = (header: string): string => {
  let text = header
    .replace(/﻿/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_\-.]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/^_+|_+$/g, '');
  let changed = true;
  while (changed && text) {
    changed = false;
    for (const suffix of UNIT_SUFFIXES) {
      if (text.endsWith(`_${suffix}`) && text.length > suffix.length + 1) {
        text = text.slice(0, -(suffix.length + 1));
        changed = true;
      }
    }
  }
  return text;
};

/** RFC 4180 rows: quoted fields, doubled quotes, CR LF. */
const parseCsv = (text: string): string[][] => {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i += 1;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field !== '' || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
};

const fold = (text: string) => text.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');

export interface CsvPreview {
  rows: number;
  styles: number;
  noPrice: number;
  groups: { key: string; rows: number }[];
}

export const previewCsv = (raw: string): CsvPreview => {
  const [header = [], ...body] = parseCsv(raw.replace(/^﻿/, ''));
  const column: Partial<Record<keyof typeof ALIASES, number>> = {};
  const rank: Partial<Record<keyof typeof ALIASES, number>> = {};
  let bare: number | undefined;
  header.forEach((h, index) => {
    const key = normaliseHeader(h);
    if (!key) return;
    if (BARE_PRICE.includes(key)) {
      if (bare === undefined) bare = index;
      return;
    }
    (Object.keys(ALIASES) as (keyof typeof ALIASES)[]).forEach((name) => {
      const at = ALIASES[name].indexOf(key);
      if (at >= 0 && (rank[name] === undefined || at < (rank[name] as number))) {
        rank[name] = at;
        column[name] = index;
      }
    });
  });
  const priceAt = column.intended_price ?? bare;
  const cell = (row: string[], index: number | undefined) => (index === undefined ? '' : (row[index] ?? '').trim());
  const rows = body.filter((r) => r.some((v) => v.trim()));
  const groups = new Map<string, number>();
  let noPrice = 0;
  rows.forEach((row) => {
    const code = cell(row, column.style_code);
    const name = cell(row, column.style_name);
    if (!code && !name) return;
    const brand = fold(cell(row, column.brand));
    const key = code ? `code:${fold(code)}|${brand}` : `name:${fold(name)}|${brand}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
    if (!cell(row, priceAt)) noPrice += 1;
  });
  return { rows: rows.length, styles: groups.size, noPrice, groups: Array.from(groups, ([key, n]) => ({ key, rows: n })) };
};
