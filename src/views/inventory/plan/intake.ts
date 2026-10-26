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

/** inventory/linesheet.py ALIASES, the fields the preview reads. */
const ALIASES: Record<'style_code' | 'style_name' | 'brand' | 'intended_price' | 'cost', string[]> = {
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
  intended_price: ['retail_price', 'retail', 'msrp', 'srp', 'rrp', 'unit_price', 'selling_price', 'sale_price', 'list_price'],
  cost: ['wholesale_price', 'wholesale_cost', 'wholesale', 'wsp', 'whsl', 'whs', 'ws', 'cost_price', 'unit_cost', 'cost']
};
type Field = keyof typeof ALIASES;
const BARE_PRICE = ['price', 'price_each', 'unit_price_each'];
const UNIT_SUFFIXES = ['usd', 'eur', 'gbp', 'cad', 'aud', 'nzd', 'each', 'ea', 'per_unit'];
const DELIMITERS = [',', ';', '\t', '|'];
/** linesheet.MAX_PREAMBLE_ROWS: rows above the header the reader skips. */
const MAX_PREAMBLE_ROWS = 10;

/** onboarding.registry.normalize_header, then linesheet.normalise's unit suffixes. */
export const normaliseHeader = (header: string): string => {
  let text = header
    .replace(/\ufeff/g, '')
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

/** RFC 4180 rows over one delimiter: quoted fields, doubled quotes, CR LF. */
const parseCsv = (text: string, delimiter: string): string[][] => {
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
    else if (c === delimiter) {
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
const blank = (row: string[]) => !row.some((v) => v.trim());

const CURRENCY = /us\$|usd|eur|gbp|cad|aud|nzd|[$€£¥]/gi;

/** linesheet.parse_money, step for step: the amount in a money cell, null when blank, NaN when unreadable. */
export const parseMoney = (cell: string): number | null => {
  const text = cell.replace(CURRENCY, '').replace(/\s/g, '');
  if (!text) return null;
  if (!/^[0-9.,]+$/.test(text)) return Number.NaN;
  const lastComma = text.lastIndexOf(',');
  const lastDot = text.lastIndexOf('.');
  let sep: ',' | '.' | null;
  if (lastComma >= 0 && lastDot >= 0) sep = lastComma > lastDot ? ',' : '.';
  else if (lastComma >= 0) {
    const tail = text.slice(lastComma + 1);
    sep = text.split(',').length === 2 && (tail.length === 1 || tail.length === 2) ? ',' : null;
  } else sep = lastDot >= 0 ? '.' : null;
  let plain: string;
  if (sep === ',') plain = text.replace(/\./g, '').replace(',', '.');
  else if (sep === '.') {
    if (text.split('.').length > 2) return Number.NaN;
    plain = text.replace(/,/g, '');
  } else {
    const groups = text.split(',');
    if (groups.length > 1 && !groups.slice(1).every((g) => g.length === 3)) return Number.NaN;
    plain = text.replace(/,/g, '');
  }
  // Python's Decimal reads "5." and ".5" but not "." or "".
  return /^(\d+\.?\d*|\.\d+)$/.test(plain) ? Number(plain) : Number.NaN;
};

/** Priced as the server prices a style: a readable amount above zero (intake.merge_group: `price > 0`). */
const priced = (cell: string) => {
  const amount = parseMoney(cell);
  return amount !== null && Number.isFinite(amount) && amount > 0;
};

interface HeaderMap {
  column: Partial<Record<Field, number>>;
  ambiguous: string | null;
  mapped: number;
}

/** linesheet.map_headers: the best alias per field; a bare price beside one named price is the other, alone it is
 * the question she is asked. */
const mapHeaders = (header: string[]): HeaderMap => {
  const column: Partial<Record<Field, number>> = {};
  const rank: Partial<Record<Field, number>> = {};
  const bare: number[] = [];
  header.forEach((h, index) => {
    const key = normaliseHeader(h);
    if (!key) return;
    if (BARE_PRICE.includes(key)) {
      bare.push(index);
      return;
    }
    (Object.keys(ALIASES) as Field[]).forEach((name) => {
      const at = ALIASES[name].indexOf(key);
      if (at >= 0 && (rank[name] === undefined || at < (rank[name] as number))) {
        rank[name] = at;
        column[name] = index;
      }
    });
  });
  let ambiguous: string | null = null;
  if (bare.length) {
    const hasRetail = column.intended_price !== undefined;
    const hasCost = column.cost !== undefined;
    if (hasRetail && !hasCost) column.cost = bare[0];
    else if (hasCost && !hasRetail) column.intended_price = bare[0];
    else if (!hasRetail && !hasCost) ambiguous = header[bare[0]].trim();
  }
  return { column, ambiguous, mapped: Object.keys(column).length };
};

const identifies = (m: HeaderMap) => m.column.style_code !== undefined || m.column.style_name !== undefined;

export interface CsvPreview {
  rows: number;
  styles: number;
  /** Rows naming a style with no readable retail price (every one while the price column is in question). */
  noPrice: number;
  /** A bare price column the server will ask about (retail or wholesale), or null. */
  ambiguousPrice: string | null;
  groups: { key: string; rows: number }[];
}

const EMPTY: CsvPreview = { rows: 0, styles: 0, noPrice: 0, ambiguousPrice: null, groups: [] };

/** The header row (the one near the top naming a style with the most columns) and the rows below it. */
const locate = (rows: string[][]): { map: HeaderMap; body: string[][] } | null => {
  const window: number[] = [];
  for (let i = 0; i < rows.length && window.length <= MAX_PREAMBLE_ROWS; i += 1) if (!blank(rows[i])) window.push(i);
  let best: { at: number; map: HeaderMap } | null = null;
  window.forEach((at) => {
    const map = mapHeaders(rows[at]);
    if (identifies(map) && (!best || map.mapped > best.map.mapped)) best = { at, map };
  });
  if (!best) return null;
  const found = best as { at: number; map: HeaderMap };
  return { map: found.map, body: rows.slice(found.at + 1) };
};

export const previewCsv = (raw: string): CsvPreview => {
  const text = raw.replace(/^\ufeff/, '');
  if (!text.trim()) return EMPTY;
  const sample = text.split('\n', 50).join('\n');
  const order = [...DELIMITERS].sort((a, b) => sample.split(b).length - sample.split(a).length);
  let located: { map: HeaderMap; body: string[][] } | null = null;
  for (const delimiter of order) {
    located = locate(parseCsv(text, delimiter));
    if (located) break;
  }
  if (!located) {
    const rows = parseCsv(text, order[0])
      .slice(1)
      .filter((r) => !blank(r)).length;
    return { ...EMPTY, rows };
  }
  const { map, body } = located;
  const cell = (row: string[], index: number | undefined) => (index === undefined ? '' : (row[index] ?? '').trim());
  const groups = new Map<string, number>();
  let noPrice = 0;
  // The server leaves out a row with no style code or name.
  const rows = body.filter((row) => cell(row, map.column.style_code) || cell(row, map.column.style_name));
  rows.forEach((row) => {
    const code = cell(row, map.column.style_code);
    const name = cell(row, map.column.style_name);
    const brand = fold(cell(row, map.column.brand));
    const key = code ? `code:${fold(code)}|${brand}` : `name:${fold(name)}|${brand}`;
    groups.set(key, (groups.get(key) ?? 0) + 1);
    if (!priced(cell(row, map.column.intended_price))) noPrice += 1;
  });
  return {
    rows: rows.length,
    styles: groups.size,
    noPrice,
    ambiguousPrice: map.ambiguous,
    groups: Array.from(groups, ([key, n]) => ({ key, rows: n }))
  };
};
