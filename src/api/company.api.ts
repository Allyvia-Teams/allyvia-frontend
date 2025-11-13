import axiosServices from 'utils/axios';
import type { Company } from 'types/company';

/**
 * Update Company Data
 *
 * Based on API documentation: PUT /api/v1/company/{id}/
 * Currently documented as accepting only 'name', but extended to support
 * business information fields that should be stored in the company table.
 *
 * Note: If backend doesn't support these fields yet, they may be ignored
 * or return validation errors. Backend needs to be updated to support
 * these fields in the Company model and serializer.
 */
export interface UpdateCompanyData {
  // Documented field
  name?: string;

  // Business Information fields (needs backend support)
  company_url?: string;
  industry?: string;
  tax_id?: string;
  contact_email?: string;
  contact_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
  country?: string;
}

/**
 * Company API
 *
 * All endpoints are prefixed with /api/v1/company/
 * Authentication: Required (JWT Bearer token)
 *
 * See API documentation for details:
 * - GET /api/v1/company/ - List companies
 * - POST /api/v1/company/ - Create company
 * - GET /api/v1/company/{id}/ - Get company details
 * - PUT /api/v1/company/{id}/ - Update company (Admin only)
 * - DELETE /api/v1/company/{id}/ - Delete company (Admin only)
 */
export const companyAPI = {
  /**
   * List all companies the user has access to
   * GET /api/v1/company/
   */
  listCompanies: async (): Promise<Company[]> => {
    const response = await axiosServices.get(`/company/`);
    return response.data;
  },

  /**
   * Get company details by ID
   * GET /api/v1/company/{id}/
   *
   * User must have a role in the company to access.
   */
  getCompany: async (companyId: string): Promise<Company> => {
    const response = await axiosServices.get(`/company/${companyId}/`);
    return response.data;
  },

  /**
   * Create a new company
   * POST /api/v1/company/
   *
   * Automatically:
   * - Creates admin and member role definitions
   * - Assigns admin role to creator
   * - Creates viewer user account
   */
  createCompany: async (data: { name: string }): Promise<Company> => {
    const response = await axiosServices.post(`/company/`, data);
    return response.data;
  },

  /**
   * Update company details
   * PUT /api/v1/company/{id}/
   *
   * Admin only. Currently documented as accepting only 'name',
   * but extended to support business information fields.
   *
   * Note: Backend needs to support these fields in Company model.
   */
  updateCompany: async (companyId: string, data: UpdateCompanyData): Promise<Company> => {
    const response = await axiosServices.put(`/company/${companyId}/`, data);
    return response.data;
  },

  /**
   * Delete company
   * DELETE /api/v1/company/{id}/
   *
   * Admin only. Also deletes associated viewer user account.
   */
  deleteCompany: async (companyId: string): Promise<void> => {
    await axiosServices.delete(`/company/${companyId}/`);
  }
};
