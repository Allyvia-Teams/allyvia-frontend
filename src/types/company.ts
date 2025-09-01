export type CompanyRole = 'admin' | 'member';

export interface Company {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  is_connected_to_quickbooks: boolean;
  is_qb_access_token_valid?: boolean;
  qb_realm_id: string | null;
}

export interface CompanyWithRole extends Company {
  user_role: CompanyRole;
}

export interface CreateCompanyRequest {
  name: string;
}

export interface UpdateCompanyRequest {
  name: string;
}

export interface CompanyResponse {
  data: Company;
  message?: string;
}

export interface CompaniesListResponse {
  data: CompanyWithRole[];
  count?: number;
}
