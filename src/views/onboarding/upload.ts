// Pure upload helpers — mirrors backend/app/onboarding/gcs.py constraints.

export const ACCEPTED_EXTENSIONS = ['csv', 'xlsx', 'ndjson', 'jsonl'] as const;

// Mirrors ONBOARDING_MAX_UPLOAD_BYTES default; oversize is rejected client-side pre-ticket.
export const MAX_UPLOAD_BYTES = 100 * 1024 * 1024;

export function isAcceptedFilename(name: string): boolean {
  const dot = name.lastIndexOf('.');
  if (dot < 0 || dot === name.length - 1) return false;
  const ext = name.slice(dot + 1).toLowerCase();
  return (ACCEPTED_EXTENSIONS as readonly string[]).includes(ext);
}

const EXTENSION_CONTENT_TYPES: Record<string, string> = {
  csv: 'text/csv',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ndjson: 'application/x-ndjson',
  jsonl: 'application/x-ndjson'
};

// browserType wins when non-empty; else by extension; fallback octet-stream.
// ALWAYS non-empty so Content-Type is always signed into required_headers.
export function contentTypeForFile(name: string, browserType: string): string {
  if (browserType) return browserType;
  const dot = name.lastIndexOf('.');
  const ext = dot >= 0 ? name.slice(dot + 1).toLowerCase() : '';
  return EXTENSION_CONTENT_TYPES[ext] || 'application/octet-stream';
}

// Default 30s safety margin: treat a ticket as expired slightly early so the
// PUT never races the signature expiry.
export function isTicketExpired(expiresAt: string, now: Date, safetyMs: number = 30_000): boolean {
  const expires = Date.parse(expiresAt);
  if (Number.isNaN(expires)) return true;
  return now.getTime() >= expires - safetyMs;
}

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const rounded = Math.round(value * 10) / 10;
  const text = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${text} ${units[unit]}`;
}
