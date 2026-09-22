// Pure RFC4180 CSV serialization for the rejected-rows sample download.
// The Blob/anchor download itself lives in JobHealthCard.tsx (DOM code).

import type { RejectedRowsResponse } from 'api/onboarding.api';

export function csvEscape(value: unknown): string {
  let text: string;
  if (value === null || value === undefined) {
    text = '';
  } else if (Array.isArray(value)) {
    text = value.map((item) => String(item)).join('; ');
  } else if (typeof value === 'object') {
    text = JSON.stringify(value);
  } else {
    text = String(value);
  }
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

// Header = columnOrder ?? union of keys in first-seen order; rows joined with
// \r\n per RFC4180; returns '' for zero rows.
export function toCsv(rows: Array<Record<string, unknown>>, columnOrder?: string[]): string {
  if (rows.length === 0) return '';
  let columns: string[];
  if (columnOrder) {
    columns = columnOrder;
  } else {
    columns = [];
    const seen = new Set<string>();
    for (const row of rows) {
      for (const key of Object.keys(row)) {
        if (!seen.has(key)) {
          seen.add(key);
          columns.push(key);
        }
      }
    }
  }
  const lines = [columns.map(csvEscape).join(',')];
  for (const row of rows) {
    lines.push(columns.map((col) => csvEscape(row[col])).join(','));
  }
  return lines.join('\r\n');
}

// Column order: reject_reasons first, then remaining keys first-seen.
export function rejectedRowsCsv(payload: Pick<RejectedRowsResponse, 'rows'>): string {
  const { rows } = payload;
  if (rows.length === 0) return '';
  const columns = ['reject_reasons'];
  const seen = new Set<string>(columns);
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (!seen.has(key)) {
        seen.add(key);
        columns.push(key);
      }
    }
  }
  return toCsv(rows, columns);
}

// Last dotted segment of the BQ table id, non-alphanumerics collapsed to '-'.
export function rejectedCsvFilename(bqTableId: string): string {
  const segments = bqTableId.split('.');
  const last = segments[segments.length - 1] || 'table';
  const sanitized = last.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'table';
  return `rejected-rows-${sanitized}.csv`;
}
