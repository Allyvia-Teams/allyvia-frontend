export interface PlaidSession {
  companyId: string;
  roleId: string;
  linkToken: string;
  sessionId: string;
  expiresAt: number;
}

export function readPlaidSession(raw: string | null, companyId: string, roleId: string, now = Date.now()): PlaidSession | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as PlaidSession;
    return value.companyId === companyId &&
      value.roleId === roleId &&
      value.expiresAt > now &&
      typeof value.linkToken === 'string' &&
      typeof value.sessionId === 'string'
      ? value
      : null;
  } catch {
    return null;
  }
}
