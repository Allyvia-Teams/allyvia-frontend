import axiosServices from 'utils/axios';
import { CompanyProfile, SupplierRiskAnalysis, OverstockAnalysis, SalesTrendsAnalysis } from 'types/analytics';

class CompanyProfileAPI {
  static async getProfile(): Promise<CompanyProfile> {
    const response = await axiosServices.get('/insights/company-profile/');
    return response.data;
  }

  static async refreshProfile(): Promise<CompanyProfile> {
    const response = await axiosServices.post('/insights/company-profile/');
    return response.data.profile;
  }

  static async updateProfile(updates: Partial<CompanyProfile>): Promise<CompanyProfile> {
    const response = await axiosServices.patch('/insights/company-profile/', updates);
    return response.data;
  }
}

class SupplierRiskAPI {
  static async getAnalysis(): Promise<SupplierRiskAnalysis> {
    const response = await axiosServices.get('/insights/supplier-risk/');
    return response.data;
  }

  static async generateAnalysis(): Promise<SupplierRiskAnalysis> {
    const response = await axiosServices.post('/insights/supplier-risk/');
    return response.data.data;
  }
}

class OverstockAPI {
  static async getAnalysis(): Promise<OverstockAnalysis> {
    const response = await axiosServices.get('/insights/overstock-detection/');
    return response.data;
  }

  static async generateAnalysis(): Promise<OverstockAnalysis> {
    const response = await axiosServices.post('/insights/overstock-detection/');
    return response.data.data;
  }
}

class SalesTrendsAPI {
  static async getAnalysis(): Promise<SalesTrendsAnalysis> {
    const response = await axiosServices.get('/insights/sales-trends/');
    return response.data;
  }

  static async generateAnalysis(): Promise<SalesTrendsAnalysis> {
    const response = await axiosServices.post('/insights/sales-trends/');
    return response.data.data;
  }
}

export class InsightsAPI {
  static readonly CompanyProfile = CompanyProfileAPI;
  static readonly SupplierRisk = SupplierRiskAPI;
  static readonly Overstock = OverstockAPI;
  static readonly SalesTrends = SalesTrendsAPI;
}
