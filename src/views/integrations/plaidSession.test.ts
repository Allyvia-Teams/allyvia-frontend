import { describe, it, expect } from 'vitest';
import { readPlaidSession } from './plaidSession';

describe('Plaid OAuth session return', () => {
  const session = JSON.stringify({
    companyId: 'shop-1',
    roleId: 'owner-1',
    linkToken: 'link-test',
    sessionId: 'session-1',
    expiresAt: 200
  });
  it('resumes only the same company and role before expiry', () => {
    expect(readPlaidSession(session, 'shop-1', 'owner-1', 100)?.sessionId).toBe('session-1');
    expect(readPlaidSession(session, 'shop-2', 'owner-1', 100)).toBeNull();
    expect(readPlaidSession(session, 'shop-1', 'owner-2', 100)).toBeNull();
    expect(readPlaidSession(session, 'shop-1', 'owner-1', 201)).toBeNull();
  });
  it('handles missing, malformed and incomplete storage', () => {
    for (const raw of [null, 'bad json', '{}', 'null']) expect(readPlaidSession(raw, 'shop-1', 'owner-1', 100)).toBeNull();
  });
});
