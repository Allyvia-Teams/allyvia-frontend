import axiosServices from 'utils/axios';
import { CompanyProfile, SupplierRiskAnalysis, OverstockAnalysis } from 'types/analytics';

class CompanyProfileAPI {
  static async getProfile(): Promise<CompanyProfile> {
    const response = await axiosServices.get('/analytics/company-profile/');
    return response.data;
  }

  static async refreshProfile(): Promise<CompanyProfile> {
    const response = await axiosServices.post('/analytics/company-profile/');
    return response.data.profile;
  }

  static async updateProfile(updates: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await axiosServices.patch('/analytics/company-profile/', updates);
    return response.data;
  }
}

class SupplierRiskAPI {
  static async getAnalysis(): Promise<SupplierRiskAnalysis> {
    const response = await axiosServices.get('/analytics/supplier-risk/');
    return response.data;
  }

  static async generateAnalysis(): Promise<SupplierRiskAnalysis> {
    const response = await axiosServices.post('/analytics/supplier-risk/');
    return response.data.data;
  }
}

class OverstockAPI {
  static async getAnalysis(): Promise<OverstockAnalysis> {
    const response = await axiosServices.get('/analytics/overstock-detection/');
    return response.data;
  }

  static async generateAnalysis(): Promise<OverstockAnalysis> {
    const response = await axiosServices.post('/analytics/overstock-detection/');
    return response.data.data;
  }
}

export class InsightsAPI {
  static readonly CompanyProfile = CompanyProfileAPI;
  static readonly SupplierRisk = SupplierRiskAPI;
  static readonly Overstock = OverstockAPI;
}
