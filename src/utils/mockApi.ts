import { AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { handlePOSRequest } from 'features/pos/mocks/posHandlers';

interface MockUser {
  id: string;
  email: string;
  password: string;
  first_name: string;
  last_name: string;
}

interface MockCompany {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid: boolean;
  qb_realm_id: string | null;
}

interface MockRole {
  id: string;
  user_id: string;
  company_id: string;
  company_name: string;
  role_type: 'admin' | 'manager' | 'member' | 'viewer';
  role_display: string;
  permissions?: string[];
}

const MOCK_USERS: MockUser[] = [
  {
    id: '7fbed89c-8f90-4433-81d1-a352534533c0',
    email: 'admin@allyvia.com',
    password: 'admin123',
    first_name: 'Admin',
    last_name: 'User'
  },
  {
    id: '8abc90de-1234-5678-90ab-cdef12345678',
    email: 'manager@allyvia.com',
    password: 'manager123',
    first_name: 'Manager',
    last_name: 'User'
  },
  {
    id: '9def0123-4567-89ab-cdef-0123456789ab',
    email: 'member@allyvia.com',
    password: 'member123',
    first_name: 'Member',
    last_name: 'User'
  },
  {
    id: 'aef12345-6789-0abc-def0-123456789abc',
    email: 'viewer@allyvia.com',
    password: 'viewer123',
    first_name: 'Viewer',
    last_name: 'User'
  },
  {
    id: 'bcd23456-7890-abcd-ef01-23456789abcd',
    email: 'multi@allyvia.com',
    password: 'multi123',
    first_name: 'Multi',
    last_name: 'Role User'
  }
];

const MOCK_COMPANIES: MockCompany[] = [
  {
    id: '1ba408fb-f129-4289-9ed1-51c6bec5a798',
    name: 'Acme Corporation',
    created_at: '2025-08-09T21:20:15.939407Z',
    updated_at: '2025-08-09T21:20:15.939452Z',
    is_connected_to_quickbooks: true,
    is_qb_access_token_valid: true,
    qb_realm_id: '9341454973808270'
  },
  {
    id: '2cb519gb-g239-5389-8fe2-62d7cfd6b8a9',
    name: 'Tech Solutions Inc',
    created_at: '2025-08-10T10:15:00.000000Z',
    updated_at: '2025-08-10T10:15:00.000000Z',
    is_connected_to_quickbooks: false,
    is_qb_access_token_valid: false,
    qb_realm_id: null
  },
  {
    id: '3dc630hc-h340-6490-9gf3-73e8dge7c9b0',
    name: 'StartUp LLC',
    created_at: '2025-08-11T14:30:00.000000Z',
    updated_at: '2025-08-11T14:30:00.000000Z',
    is_connected_to_quickbooks: true,
    is_qb_access_token_valid: true,
    qb_realm_id: '7563476085920482'
  }
];

const MOCK_ROLES: MockRole[] = [
  {
    id: '9bd509a8-11b9-4cd5-bb0b-21cad6e115dc',
    user_id: '7fbed89c-8f90-4433-81d1-a352534533c0',
    company_id: '1ba408fb-f129-4289-9ed1-51c6bec5a798',
    company_name: 'Acme Corporation',
    role_type: 'admin',
    role_display: 'Administrator',
    permissions: ['all']
  },
  {
    id: 'abc123de-4567-89ab-cdef-0123456789ab',
    user_id: '8abc90de-1234-5678-90ab-cdef12345678',
    company_id: '1ba408fb-f129-4289-9ed1-51c6bec5a798',
    company_name: 'Acme Corporation',
    role_type: 'manager',
    role_display: 'Manager',
    permissions: ['read', 'write', 'delete']
  },
  {
    id: 'bcd234ef-5678-9abc-def0-123456789abc',
    user_id: '9def0123-4567-89ab-cdef-0123456789ab',
    company_id: '2cb519gb-g239-5389-8fe2-62d7cfd6b8a9',
    company_name: 'Tech Solutions Inc',
    role_type: 'member',
    role_display: 'Member',
    permissions: ['read', 'write']
  },
  {
    id: 'cde345fg-6789-abcd-ef01-23456789abcd',
    user_id: 'aef12345-6789-0abc-def0-123456789abc',
    company_id: '2cb519gb-g239-5389-8fe2-62d7cfd6b8a9',
    company_name: 'Tech Solutions Inc',
    role_type: 'viewer',
    role_display: 'Viewer',
    permissions: ['read']
  },
  {
    id: 'def456gh-7890-bcde-f012-3456789abcde',
    user_id: 'bcd23456-7890-abcd-ef01-23456789abcd',
    company_id: '1ba408fb-f129-4289-9ed1-51c6bec5a798',
    company_name: 'Acme Corporation',
    role_type: 'admin',
    role_display: 'Administrator',
    permissions: ['all']
  },
  {
    id: 'efg567hi-8901-cdef-0123-456789abcdef',
    user_id: 'bcd23456-7890-abcd-ef01-23456789abcd',
    company_id: '2cb519gb-g239-5389-8fe2-62d7cfd6b8a9',
    company_name: 'Tech Solutions Inc',
    role_type: 'viewer',
    role_display: 'Viewer',
    permissions: ['read']
  }
];

const MOCK_TOKENS = {
  access:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjo5OTk5OTk5OTk5LCJpYXQiOjE3NTU2NTI3ODgsImp0aSI6IjJjNzAxMzE3ZTZiMDQyYWRiZmYyM2E5ZjZhN2YxMWNjIiwidXNlcl9pZCI6IjdmYmVkODljLThmOTAtNDQzMy04MWQxLWEzNTI1MzQ1MzNjMCJ9.mock-signature',
  refresh:
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6OTk5OTk5OTk5OSwiaWF0IjoxNzU1NjUyNzg4LCJqdGkiOiIxZmNkOWUzNGMzODI0ZTQ0YWYzNjMxZTE3ZjczYTg4OCIsInVzZXJfaWQiOiI3ZmJlZDg5Yy04ZjkwLTQ0MzMtODFkMS1hMzUyNTM0NTMzYzAifQ.mock-refresh-signature'
};

const MOCK_PROFIT_LOSS = {
  report_period: {
    start_date: '2025-01-01',
    end_date: '2025-08-20'
  },
  revenue: {
    total: 150000,
    categories: [
      { name: 'Product Sales', amount: 100000 },
      { name: 'Service Revenue', amount: 50000 }
    ]
  },
  expenses: {
    total: 80000,
    categories: [
      { name: 'Salaries', amount: 45000 },
      { name: 'Rent', amount: 15000 },
      { name: 'Utilities', amount: 5000 },
      { name: 'Marketing', amount: 10000 },
      { name: 'Other', amount: 5000 }
    ]
  },
  net_income: 70000
};

const MOCK_EXPENSES = {
  summary: {
    total: 80000,
    monthly_average: 10000,
    year_over_year_change: 15.5
  },
  by_category: [
    { category: 'Salaries', amount: 45000, percentage: 56.25 },
    { category: 'Rent', amount: 15000, percentage: 18.75 },
    { category: 'Marketing', amount: 10000, percentage: 12.5 },
    { category: 'Utilities', amount: 5000, percentage: 6.25 },
    { category: 'Other', amount: 5000, percentage: 6.25 }
  ],
  top_expenses: [
    { vendor: 'Payroll Inc', amount: 45000, category: 'Salaries' },
    { vendor: 'Building Management', amount: 15000, category: 'Rent' },
    { vendor: 'Google Ads', amount: 7000, category: 'Marketing' }
  ]
};

const MOCK_INVOICES = [
  {
    id: 'inv-001',
    invoice_number: 'INV-2025-001',
    customer_name: 'Client ABC',
    amount: 5000,
    status: 'paid',
    due_date: '2025-01-15',
    created_at: '2025-01-01'
  },
  {
    id: 'inv-002',
    invoice_number: 'INV-2025-002',
    customer_name: 'Client XYZ',
    amount: 7500,
    status: 'pending',
    due_date: '2025-08-25',
    created_at: '2025-08-10'
  }
];

class MockApiHandler {
  private currentUser: MockUser | null = null;
  private authToken: string | null = null;
  private currentUserId: string | null = null;

  constructor() {
    // Restore current user ID from localStorage on initialization
    this.currentUserId = localStorage.getItem('mockCurrentUserId');
    this.authToken = localStorage.getItem('access');
    // Interceptor is now handled in axios.ts, no need to set up here
  }

  private shouldIntercept(config: AxiosRequestConfig): boolean {
    if (!isMockApiEnabled()) return false;

    const url = config.url || '';
    const apiEndpoints = [
      '/auth/login/',
      '/auth/register/',
      '/auth/refresh/',
      '/auth/me/',
      '/user/profile/',
      '/role/',
      '/company/',
      '/profit/',
      '/expense/',
      '/invoice/',
      '/account/',
      '/payment/'
    ];

    return apiEndpoints.some((endpoint) => url.includes(endpoint));
  }

  public async handleRequest(config: AxiosRequestConfig): Promise<AxiosResponse | null> {
    await this.delay(300);

    const url = config.url || '';
    const method = config.method?.toUpperCase() || 'GET';
    const authHeader = config.headers?.Authorization as string;

    if (url.includes('/auth/login/') && method === 'POST') {
      return this.handleLogin(config);
    }

    if (url.includes('/auth/me/') && method === 'GET') {
      return this.handleGetMe(authHeader);
    }

    if (url.includes('/auth/refresh/') && method === 'POST') {
      return this.handleRefresh(config);
    }

    if (url.includes('/role/') && method === 'GET') {
      return this.handleGetRoles(authHeader);
    }

    if (url.includes('/user/profile/') && method === 'GET') {
      return this.handleGetUserProfile(authHeader);
    }

    if (url.includes('/user/profile/') && method === 'POST') {
      return this.handlePatchUserProfile(authHeader, config);
    }

    if (url.includes('/company/') && method === 'GET') {
      return this.handleGetCompanies(authHeader);
    }

    if (url.includes('/profit/profit_and_loss/') && method === 'GET') {
      return this.handleGetProfitLoss(authHeader);
    }

    if (url.includes('/expense/summary/') && method === 'GET') {
      return this.handleGetExpenseSummary(authHeader);
    }

    if (url.includes('/expense/by_category/') && method === 'GET') {
      return this.handleGetExpenseByCategory(authHeader);
    }

    if (url.includes('/expense/top/') && method === 'GET') {
      return this.handleGetTopExpenses(authHeader);
    }

    if (url.includes('/invoice/list/') && method === 'GET') {
      return this.handleGetInvoices(authHeader);
    }

    if (url.includes('/account/details/') && method === 'GET') {
      return this.handleGetAccountDetails(authHeader);
    }

    // ============================
    // POS endpoints (products/orders)
    // ============================
    const posResult = handlePOSRequest({ ...(config as any), url, method } as any);
    if (posResult) {
      if (posResult.status !== 200) {
        const message = (posResult.data && posResult.data.error) || 'POS request failed';
        return this.errorResponse(posResult.status, message, config);
      }
      return this.successResponse(posResult.data, config);
    }

    if (url.includes('/company/') && url.split('/').length === 4 && method === 'DELETE') {
      return this.handleDeleteCompany(authHeader, config);
    }

    if (url.includes('/company/') && url.split('/').length === 4 && method === 'PUT') {
      return this.handleUpdateCompany(authHeader, config);
    }

    if (url.includes('/company/') && url.split('/').length === 4 && method === 'GET') {
      return this.handleGetCompany(authHeader, config);
    }

    if (url.includes('/company/') && method === 'POST') {
      return this.handleCreateCompany(authHeader, config);
    }

    if (url.includes('/company/') && method === 'GET') {
      return this.handleGetCompanies(authHeader);
    }

    return null;
  }

  private async handleLogin(config: AxiosRequestConfig): Promise<AxiosResponse> {
    const { email, password } = config.data;

    // Find user with exact email and password match
    const user = MOCK_USERS.find((u) => u.email === email && u.password === password);

    if (!user) {
      return this.errorResponse(401, 'Invalid credentials', config);
    }

    this.currentUser = user;
    this.currentUserId = user.id;
    this.authToken = MOCK_TOKENS.access;

    // Persist current user ID for page reloads
    localStorage.setItem('mockCurrentUserId', user.id);

    // Match the exact backend response format for login
    const responseData = {
      access: MOCK_TOKENS.access,
      refresh: MOCK_TOKENS.refresh,
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name
      }
    };

    return this.successResponse(responseData, config);
  }

  private async handleGetMe(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    // Always use the current user if set, otherwise default to admin
    const userId = this.currentUserId || '7fbed89c-8f90-4433-81d1-a352534533c0';
    const user = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
    const userRoles = MOCK_ROLES.filter((r) => r.user_id === user.id);

    return this.successResponse({
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      roles: userRoles
    });
  }

  private buildUserProfile(userId: string) {
    const user = MOCK_USERS.find((u) => u.id === userId) || MOCK_USERS[0];
    const roles = MOCK_ROLES.filter((r) => r.user_id === user.id);
    const profile = {
      id: user.id,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      avatar: null,
      phone: '',
      work_email: user.email,
      personal_email: '',
      work_phone: '',
      personal_phone: '',
      preferences: {
        language: 'en',
        theme: 'system',
        notifications_email: true,
        notifications_push: true
      },
      role: roles[0]?.role_display || 'Member'
    };
    return profile;
  }

  private async handleGetUserProfile(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const userId = this.currentUserId || '7fbed89c-8f90-4433-81d1-a352534533c0';
    const stored = localStorage.getItem(`mock_profile_${userId}`);
    if (stored) {
      return this.successResponse(JSON.parse(stored));
    }
    const profile = this.buildUserProfile(userId);
    localStorage.setItem(`mock_profile_${userId}`, JSON.stringify(profile));
    return this.successResponse(profile);
  }

  private async handlePatchUserProfile(authHeader: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const userId = this.currentUserId || '7fbed89c-8f90-4433-81d1-a352534533c0';
    const key = `mock_profile_${userId}`;
    const existing = localStorage.getItem(key);
    const current = existing ? JSON.parse(existing) : this.buildUserProfile(userId);

    // Reject attempts to modify restricted fields
    const forbidden = ['role', 'id'];
    const data = config.data instanceof FormData ? Object.fromEntries((config.data as FormData).entries()) : config.data || {};

    for (const k of Object.keys(data)) {
      if (forbidden.includes(k)) {
        return this.errorResponse(403, 'Forbidden field edit');
      }
    }

    let updated = { ...current, ...data };

    // Handle avatar upload if multipart
    if (config.data instanceof FormData) {
      updated.avatar = 'data:image/png;base64,iVBORmockavatar';
    }

    localStorage.setItem(key, JSON.stringify(updated));
    return this.successResponse(updated);
  }

  private async handleRefresh(config: AxiosRequestConfig): Promise<AxiosResponse> {
    const { refresh } = config.data;

    if (!refresh) {
      return this.errorResponse(400, 'Refresh token required', config);
    }

    return this.successResponse(
      {
        access: MOCK_TOKENS.access,
        refresh: MOCK_TOKENS.refresh
      },
      config
    );
  }

  private async handleGetRoles(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const userId = this.getUserIdFromToken(authHeader);
    const userRoles = MOCK_ROLES.filter((r) => r.user_id === userId);

    return this.successResponse(userRoles);
  }

  private async handleGetCompanies(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_COMPANIES);
  }

  private async handleGetProfitLoss(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_PROFIT_LOSS);
  }

  private async handleGetExpenseSummary(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_EXPENSES.summary);
  }

  private async handleGetExpenseByCategory(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_EXPENSES.by_category);
  }

  private async handleGetTopExpenses(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_EXPENSES.top_expenses);
  }

  private async handleGetInvoices(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse(MOCK_INVOICES);
  }

  private async handleGetAccountDetails(authHeader: string): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    return this.successResponse({
      id: '1',
      name: 'Main Business Account',
      account_number: '1234567890',
      balance: 50000.0,
      available_balance: 45000.0,
      currency: 'USD',
      type: 'Business Checking',
      status: 'Active',
      last_updated: new Date().toISOString(),
      quickbooks_account_id: 'QB123456',
      bank_name: 'First National Bank'
    });
  }

  private async handleGetCompany(authHeader: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const urlParts = config.url?.split('/') || [];
    const companyId = urlParts[urlParts.length - 2];
    const company = MOCK_COMPANIES.find((c) => c.id === companyId);

    if (!company) {
      return this.errorResponse(404, 'Company not found');
    }

    const userId = this.getUserIdFromToken(authHeader);
    const userRole = MOCK_ROLES.find((r) => r.user_id === userId && r.company_id === companyId);

    if (!userRole) {
      return this.errorResponse(403, 'You do not have access to this company');
    }

    return this.successResponse(company);
  }

  private async handleCreateCompany(authHeader: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const { name } = config.data;
    if (!name) {
      return this.errorResponse(400, 'Company name is required');
    }

    const newCompany: MockCompany = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_connected_to_quickbooks: false,
      is_qb_access_token_valid: false,
      qb_realm_id: null
    };

    MOCK_COMPANIES.push(newCompany);

    const userId = this.getUserIdFromToken(authHeader);
    const newRole: MockRole = {
      id: `role-${Date.now()}`,
      user_id: userId,
      company_id: newCompany.id,
      company_name: newCompany.name,
      role_type: 'admin',
      role_display: 'Administrator',
      permissions: ['all']
    };

    MOCK_ROLES.push(newRole);

    return this.successResponse(newCompany);
  }

  private async handleUpdateCompany(authHeader: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const urlParts = config.url?.split('/') || [];
    const companyId = urlParts[urlParts.length - 2];
    const company = MOCK_COMPANIES.find((c) => c.id === companyId);

    if (!company) {
      return this.errorResponse(404, 'Company not found');
    }

    const userId = this.getUserIdFromToken(authHeader);
    const userRole = MOCK_ROLES.find((r) => r.user_id === userId && r.company_id === companyId);

    if (!userRole || (userRole.role_type !== 'admin' && userRole.role_type !== 'manager')) {
      return this.errorResponse(403, 'Only admins can update company details');
    }

    const { name } = config.data;
    if (name) {
      company.name = name;
      company.updated_at = new Date().toISOString();
    }

    return this.successResponse(company);
  }

  private async handleDeleteCompany(authHeader: string, config: AxiosRequestConfig): Promise<AxiosResponse> {
    if (!this.isAuthenticated(authHeader)) {
      return this.errorResponse(401, 'Unauthorized');
    }

    const urlParts = config.url?.split('/') || [];
    const companyId = urlParts[urlParts.length - 2];
    const companyIndex = MOCK_COMPANIES.findIndex((c) => c.id === companyId);

    if (companyIndex === -1) {
      return this.errorResponse(404, 'Company not found');
    }

    const userId = this.getUserIdFromToken(authHeader);
    const userRole = MOCK_ROLES.find((r) => r.user_id === userId && r.company_id === companyId);

    if (!userRole || (userRole.role_type !== 'admin' && userRole.role_type !== 'manager')) {
      return this.errorResponse(403, 'Only admins can delete a company');
    }

    MOCK_COMPANIES.splice(companyIndex, 1);
    const roleIndices = MOCK_ROLES.map((r, i) => (r.company_id === companyId ? i : -1)).filter((i) => i !== -1);
    for (let i = roleIndices.length - 1; i >= 0; i--) {
      MOCK_ROLES.splice(roleIndices[i], 1);
    }

    return {
      data: null,
      status: 204,
      statusText: 'No Content',
      headers: {},
      config: config as InternalAxiosRequestConfig
    };
  }

  private isAuthenticated(authHeader: string): boolean {
    // For mock API, any Bearer token is considered valid
    return !!authHeader && authHeader.startsWith('Bearer ');
  }

  private getUserIdFromToken(authHeader: string): string {
    // Try to get user ID from stored state first
    if (this.currentUserId) {
      return this.currentUserId;
    }

    // Otherwise return the default admin user for mock
    return '7fbed89c-8f90-4433-81d1-a352534533c0';
  }

  private async delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private successResponse(data: any, config?: AxiosRequestConfig): AxiosResponse {
    return {
      data,
      status: 200,
      statusText: 'OK',
      headers: {},
      config: (config || {}) as InternalAxiosRequestConfig
    };
  }

  private errorResponse(status: number, message: string, config?: AxiosRequestConfig): AxiosResponse {
    return {
      data: {
        error: {
          message,
          code: status === 401 ? 'UNAUTHORIZED' : 'ERROR'
        }
      },
      status,
      statusText: message,
      headers: {},
      config: (config || {}) as InternalAxiosRequestConfig
    };
  }
}

export const mockApiHandler = new MockApiHandler();

export function isMockApiEnabled(): boolean {
  return import.meta.env.VITE_USE_MOCK_API === 'true';
}
