// src/lib/session.ts
const API_BASE = 'http://localhost:8000/api/v1';

type Tokens = { access?: string; refresh?: string };

export function saveTokens(tokens: Tokens) {
  if (tokens.access) localStorage.setItem('accessToken', tokens.access);
  if (tokens.refresh) localStorage.setItem('refreshToken', tokens.refresh);
}

export function clearSession() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('activeRoleId');
}

export function getAccessToken(): string | null {
  return localStorage.getItem('accessToken') || localStorage.getItem('access') || null;
}

/**
 * Ensure activeRoleId exists in storage.
 * - Calls /account/details with the access token
 * - Prefers Member, otherwise first available role
 * - Returns the chosen role id (or empty string if none)
 */
export async function ensureActiveRole(): Promise<string> {
  const token = getAccessToken();
  if (!token) return '';

  // If already set, keep it
  const existing = localStorage.getItem('activeRoleId');
  if (existing) return existing;

  const res = await fetch(`${API_BASE}/account/details`, {
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`
    }
  });

  if (!res.ok) {
    // 401 → bad/expired token etc.
    if (res.status === 401) clearSession();
    return '';
  }

  const me = await res.json();
  const roles: any[] = me?.roles || [];
  const chosen = roles.find((r) => r.role_type === 'Member') || roles[0] || null;

  const roleId = chosen?.id ?? '';
  localStorage.setItem('activeRoleId', roleId);
  return roleId;
}

/** Call this once on app startup */
export async function bootstrapSession() {
  const token = getAccessToken();
  if (!token) return;
  // Only fetch if missing
  if (!localStorage.getItem('activeRoleId')) {
    await ensureActiveRole();
  }
}
