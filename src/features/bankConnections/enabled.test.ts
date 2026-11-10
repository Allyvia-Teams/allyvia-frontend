import { describe, expect, it, vi } from 'vitest';

vi.mock('utils/axios', () => ({ default: { get: vi.fn(), post: vi.fn(), delete: vi.fn() } }));

import { bankConnectionsEnabled, bankScanUnavailableMessage, errorStatus } from './enabled';

describe('bank connections flag', () => {
  it('is on when the list loads, even when empty', () => {
    expect(bankConnectionsEnabled({ data: [] })).toBe(true);
  });

  it('is off when the server answers 404 (BANK_CONNECTIONS_ENABLED off)', () => {
    expect(bankConnectionsEnabled({ error: { response: { status: 404 } } })).toBe(false);
  });

  it('is on for a 403: the routes exist, this role just cannot use them', () => {
    expect(bankConnectionsEnabled({ error: { response: { status: 403 } } })).toBe(true);
  });

  it('is unknown while loading or after other failures', () => {
    expect(bankConnectionsEnabled({})).toBeUndefined();
    expect(bankConnectionsEnabled({ error: { response: { status: 500 } } })).toBeUndefined();
    expect(bankConnectionsEnabled({ error: new Error('Network Error') })).toBeUndefined();
  });

  it('reads axios and plain error statuses', () => {
    expect(errorStatus({ response: { status: 404 } })).toBe(404);
    expect(errorStatus({ status: 403 })).toBe(403);
    expect(errorStatus('nope')).toBeUndefined();
  });
});

describe('bankScanUnavailableMessage', () => {
  it('stops claiming bank connections are off once they are on', () => {
    const on = bankScanUnavailableMessage(true);
    expect(on).not.toMatch(/not enabled/i);
    expect(on).not.toMatch(/feed finance/);
  });

  it('keeps the original copy when off or not yet known', () => {
    const original = 'Bank connections are not enabled on this deployment yet.';
    expect(bankScanUnavailableMessage(false)).toBe(original);
    expect(bankScanUnavailableMessage(undefined)).toBe(original);
  });
});
