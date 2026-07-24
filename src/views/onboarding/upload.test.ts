import { describe, expect, it } from 'vitest';

import { contentTypeForFile, formatBytes, isAcceptedFilename, isTicketExpired } from './upload';

describe('isAcceptedFilename', () => {
  it('accepts csv, xlsx, ndjson, jsonl (case-insensitive)', () => {
    expect(isAcceptedFilename('sales.csv')).toBe(true);
    expect(isAcceptedFilename('Sales.XLSX')).toBe(true);
    expect(isAcceptedFilename('events.ndjson')).toBe(true);
    expect(isAcceptedFilename('events.JSONL')).toBe(true);
  });

  it('rejects other extensions and extension-less names', () => {
    expect(isAcceptedFilename('malware.exe')).toBe(false);
    expect(isAcceptedFilename('noextension')).toBe(false);
    expect(isAcceptedFilename('trailingdot.')).toBe(false);
  });
});

describe('contentTypeForFile', () => {
  it('prefers the browser-provided type when non-empty', () => {
    expect(contentTypeForFile('sales.csv', 'application/csv')).toBe('application/csv');
  });

  it('falls back per extension', () => {
    expect(contentTypeForFile('sales.csv', '')).toBe('text/csv');
    expect(contentTypeForFile('sales.xlsx', '')).toBe('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(contentTypeForFile('events.ndjson', '')).toBe('application/x-ndjson');
    expect(contentTypeForFile('events.jsonl', '')).toBe('application/x-ndjson');
  });

  it('is never empty — unknown extensions get octet-stream', () => {
    expect(contentTypeForFile('mystery.bin', '')).toBe('application/octet-stream');
    expect(contentTypeForFile('noextension', '')).toBe('application/octet-stream');
  });
});

describe('isTicketExpired', () => {
  const expiresAt = '2026-07-24T12:00:00Z';
  const expiry = Date.parse(expiresAt);

  it('false one minute before expiry', () => {
    expect(isTicketExpired(expiresAt, new Date(expiry - 60_000))).toBe(false);
  });

  it('true 10 seconds before expiry (inside the 30s safety margin)', () => {
    expect(isTicketExpired(expiresAt, new Date(expiry - 10_000))).toBe(true);
  });

  it('true after expiry', () => {
    expect(isTicketExpired(expiresAt, new Date(expiry + 1))).toBe(true);
  });

  it('honors a custom safety margin', () => {
    expect(isTicketExpired(expiresAt, new Date(expiry - 10_000), 5_000)).toBe(false);
  });

  it('treats an unparseable timestamp as expired', () => {
    expect(isTicketExpired('not-a-date', new Date())).toBe(true);
  });
});

describe('formatBytes', () => {
  it('formats representative sizes', () => {
    expect(formatBytes(0)).toBe('0 B');
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatBytes(104857600)).toBe('100 MB');
  });
});
