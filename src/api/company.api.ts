import axiosServices from 'utils/axios';
import { Company } from 'types/company';

class CompanyAPI {
  static async getCompany(companyId: string): Promise<Company> {
    const response = await axiosServices.get(`/company/${companyId}/`);
    return response.data;
  }

  static async updateCompany(companyId: string, updates: Partial<Company>): Promise<Company> {
    // Filter out undefined values
    const cleanUpdates = Object.fromEntries(Object.entries(updates).filter(([_, value]) => value !== undefined));
    const response = await axiosServices.put(`/company/${companyId}/`, cleanUpdates);
    return response.data;
  }
}

export default CompanyAPI;
