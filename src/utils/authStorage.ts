// JWT Tokens
export const getAccessToken = () => localStorage.getItem('access');
export const getRefreshToken = () => localStorage.getItem('refresh');

export const setTokens = (access: string, refresh: string) => {
  localStorage.setItem('access', access);
  localStorage.setItem('refresh', refresh);
};

export const clearTokens = () => {
  localStorage.removeItem('access');
  localStorage.removeItem('refresh');
};

// Auth_url and state for QB integration
export const setQBUrlAndState = (url: string, state: string): void => {
  localStorage.setItem('url', url);
  localStorage.setItem('state', state);
};

export const getQBUrl = () => localStorage.getItem('url');
export const getQBState = () => localStorage.getItem('state');

export const clearQBUrlAndState = () => {
  localStorage.removeItem('url');
  localStorage.removeItem('state');
  localStorage.removeItem('company_id');
};

// Auth_url and state for Xero integration. Namespaced keys (unlike the QB
// pair above, which share the bare 'url'/'state' keys) so a Xero connect
// attempt cannot clobber an in-flight QB one, or vice versa.
export const setXeroUrlAndState = (url: string, state: string): void => {
  localStorage.setItem('xero_url', url);
  localStorage.setItem('xero_state', state);
};

export const getXeroUrl = () => localStorage.getItem('xero_url');
export const getXeroState = () => localStorage.getItem('xero_state');

export const clearXeroUrlAndState = () => {
  localStorage.removeItem('xero_url');
  localStorage.removeItem('xero_state');
};

// Company ID
export const getCompanyId = () => localStorage.getItem('company_id');
export const setCompanyId = (companyId: string) => localStorage.setItem('company_id', companyId);
export const clearCompanyId = () => localStorage.removeItem('company_id');

// Role ID
export const getRoleId = () => localStorage.getItem('currentRoleId') || localStorage.getItem('role_id');
export const setRoleId = (roleId: string | null) => {
  if (roleId) {
    localStorage.setItem('role_id', roleId);
    localStorage.setItem('currentRoleId', roleId);
  } else {
    localStorage.removeItem('role_id');
    localStorage.removeItem('currentRoleId');
  }
};
export const clearRoleId = () => setRoleId(null);

// Current Role ID (for multi-company support)
export const getCurrentRoleId = () => localStorage.getItem('currentRoleId');
export const setCurrentRoleId = (roleId: string) => localStorage.setItem('currentRoleId', roleId);
export const clearCurrentRoleId = () => localStorage.removeItem('currentRoleId');

// Clear all auth-related storage
export const clearAllAuthStorage = () => {
  clearTokens();
  clearQBUrlAndState();
  clearXeroUrlAndState();
  clearCompanyId();
  clearRoleId();
  clearCurrentRoleId();
  // Clear mock user ID as well
  localStorage.removeItem('mockCurrentUserId');
};
