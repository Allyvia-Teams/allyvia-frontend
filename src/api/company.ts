import axiosServices from 'utils/axios';
import { Company, CompanyWithRole, CreateCompanyRequest, UpdateCompanyRequest } from 'types/company';

const COMPANY_BASE_URL = '/company/';

export const companyApi = {
  getCompanies: async (): Promise<Company[]> => {
    const response = await axiosServices.get(COMPANY_BASE_URL);
    return response.data;
  },

  getCompany: async (id: string): Promise<Company> => {
    const response = await axiosServices.get(`${COMPANY_BASE_URL}${id}/`);
    return response.data;
  },

  createCompany: async (data: CreateCompanyRequest): Promise<Company> => {
    const response = await axiosServices.post(COMPANY_BASE_URL, data);
    return response.data;
  },

  updateCompany: async (id: string, data: UpdateCompanyRequest): Promise<Company> => {
    const response = await axiosServices.put(`${COMPANY_BASE_URL}${id}/`, data);
    return response.data;
  },

  deleteCompany: async (id: string): Promise<void> => {
    await axiosServices.delete(`${COMPANY_BASE_URL}${id}/`);
  }
};

export default companyApi;
