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

// Company ID
export const getCompanyId = () => localStorage.getItem('company_id');
export const setCompanyId = (companyId: string) => localStorage.setItem('company_id', companyId);
export const clearCompanyId = () => localStorage.removeItem('company_id');

// Role ID
export const getRoleId = () => localStorage.getItem('role_id');
export const setRoleId = (roleId: string) => localStorage.setItem('role_id', roleId);
export const clearRoleId = () => localStorage.removeItem('role_id');

// Current Role ID (for multi-company support)
export const getCurrentRoleId = () => localStorage.getItem('currentRoleId');
export const setCurrentRoleId = (roleId: string) => localStorage.setItem('currentRoleId', roleId);
export const clearCurrentRoleId = () => localStorage.removeItem('currentRoleId');

// Clear all auth-related storage
export const clearAllAuthStorage = () => {
  clearTokens();
  clearQBUrlAndState();
  clearCompanyId();
  clearRoleId();
  clearCurrentRoleId();
  // Clear mock user ID as well
  localStorage.removeItem('mockCurrentUserId');
};
