import { afterEach, describe, expect, it, vi } from 'vitest';

import { newIdempotencyKey } from './idempotency';

const realCrypto = globalThis.crypto;

afterEach(() => {
  Object.defineProperty(globalThis, 'crypto', { value: realCrypto, configurable: true });
  vi.restoreAllMocks();
});

function withoutRandomUUID() {
  Object.defineProperty(globalThis, 'crypto', { value: {}, configurable: true });
}

describe('newIdempotencyKey', () => {
  it('gives every call a distinct key', () => {
    // Two opens of the same form are two different writes. A key that repeated
    // would make the server answer the second one with the first one's sale.
    const keys = new Set(Array.from({ length: 200 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(200);
  });

  it('still mints a key where crypto.randomUUID is missing', () => {
    // A plain-http dev server has no secure context and therefore no
    // randomUUID. Returning nothing here would silently drop idempotency on
    // exactly the builds people poke at by hand.
    withoutRandomUUID();
    expect(newIdempotencyKey()).toMatch(/^pos-[a-z0-9]+-[a-z0-9]+$/);
  });

  it('keeps the fallback distinct within the same millisecond', () => {
    withoutRandomUUID();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    const keys = new Set(Array.from({ length: 200 }, () => newIdempotencyKey()));
    expect(keys.size).toBe(200);
  });

  it('labels the fallback with the caller’s prefix', () => {
    // Only cosmetic — the key is opaque to the server — but a key in a log
    // that says which form minted it is worth the one argument.
    withoutRandomUUID();
    expect(newIdempotencyKey('po-receive')).toMatch(/^po-receive-/);
  });
});
