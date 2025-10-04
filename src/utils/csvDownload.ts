// src/utils/csvDownload.ts
export function downloadCSV(filename: string, rows: any[], headers?: string[]) {
  if (!rows?.length) {
    if (headers?.length) {
      const blob = new Blob([headers.join(',') + '\n'], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    }
    return;
  }
  const cols = headers?.length ? headers : Object.keys(rows[0]);
  const escape = (v: any) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const body = rows.map((r) => cols.map((h) => escape((r as any)[h])).join(',')).join('\n');
  const csv = `${cols.join(',')}\n${body}`;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
