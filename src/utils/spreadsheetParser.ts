import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export interface ParsedSpreadsheet {
  headers: string[];
  rows: Record<string, string>[];
}

const BOM_REGEX = new RegExp('^\\uFEFF');

const cleanHeader = (header: unknown): string =>
  typeof header === 'string' ? header.replace(BOM_REGEX, '').trim() : String(header ?? '').trim();

const parseCsvFile = (file: File): Promise<ParsedSpreadsheet> =>
  new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
      // Normalize headers at parse time (BOM/whitespace) so row keys match the cleaned headers
      transformHeader: (h) => cleanHeader(h),
      transform: (v) => (typeof v === 'string' ? v.trim() : v),
      complete: (res) => {
        const rows = (res.data as Record<string, string>[]).filter(Boolean);
        const rawHeaders = (res.meta.fields || Object.keys(rows[0] || {})) as string[];
        const headers = rawHeaders.filter((h) => !!h && h.length > 0);

        if (headers.length === 0) {
          reject(new Error('The CSV file is empty or has no header row.'));
          return;
        }

        resolve({ headers, rows });
      },
      error: (err) => {
        reject(new Error(`Failed to parse CSV file: ${err.message}`));
      }
    });
  });

const parseExcelFile = async (file: File): Promise<ParsedSpreadsheet> => {
  const buf = await file.arrayBuffer();
  const workbook = XLSX.read(buf, { type: 'array' });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('The Excel file contains no sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, raw: false, defval: '' });

  if (!matrix.length) {
    throw new Error('The Excel sheet is empty.');
  }

  const headerRow = matrix[0] || [];
  // Trim headers and drop columns with empty headers (keep original column indexes)
  const headerEntries = headerRow.map((h, index) => ({ header: cleanHeader(h), index })).filter((entry) => entry.header.length > 0);

  if (headerEntries.length === 0) {
    throw new Error('The Excel sheet has no header row.');
  }

  const headers = headerEntries.map((entry) => entry.header);

  const rows: Record<string, string>[] = matrix
    .slice(1)
    .map((rawRow) => {
      const row: Record<string, string> = {};
      headerEntries.forEach(({ header, index }) => {
        const cell = rawRow?.[index];
        row[header] = typeof cell === 'string' ? cell.trim() : String(cell ?? '').trim();
      });
      return row;
    })
    // Skip fully-empty rows
    .filter((row) => Object.values(row).some((value) => value !== ''));

  return { headers, rows };
};

// Parse a CSV (.csv) or Excel (.xlsx/.xls) file into headers + row objects
export const parseSpreadsheetFile = async (file: File): Promise<ParsedSpreadsheet> => {
  const fileName = (file.name || '').toLowerCase();

  if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
    return parseExcelFile(file);
  }

  return parseCsvFile(file);
};
