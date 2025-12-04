import axiosServices from 'utils/axios';
import { CompanyProfile, SupplierRiskAnalysis, OverstockAnalysis, SalesTrendsAnalysis, WeatherInsight } from 'types/analytics';

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
class WeatherInsightsAPI {
  /**
   * Get cached weather insights from the server
   * @param days Number of forecast days (1-14, default: 7)
   * @returns WeatherInsight if found, null if not found or expired
   */
  static async getAnalysis(days: number = 7): Promise<WeatherInsight | null> {
    try {
      const response = await axiosServices.get('/insights/weather-insights/', {
        params: { days }
      });
      return response.data.data;
    } catch (error: any) {
      // Return null if 404 (not found or expired)
      if (error.response?.status === 404) {
        return null;
      }
      // Re-throw other errors
      throw error;
    }
  }

  /**
   * Generate new weather insights (always calls POST)
   * @param days Number of forecast days (1-14, default: 7)
   * @param forceRefresh Force refresh insights regardless of cache
   * @returns WeatherInsight
   */
  static async generateAnalysis(days: number = 7, forceRefresh: boolean = false): Promise<WeatherInsight> {
    const response = await axiosServices.post('/insights/weather-insights/', {
      days,
      force_refresh: forceRefresh
    });
    return response.data.data;
  }

  /**
   * Get weather insights - tries GET first, falls back to POST if not found
   * This is the recommended method to use from the frontend
   * @param days Number of forecast days (1-14, default: 7)
   * @param forceRefresh If true, skip GET and directly call POST
   * @returns WeatherInsight
   */
  static async getOrGenerateAnalysis(days: number = 7, forceRefresh: boolean = false): Promise<WeatherInsight> {
    // If force refresh, skip cache check and generate directly
    if (forceRefresh) {
      return await WeatherInsightsAPI.generateAnalysis(days, true);
    }

    // Try to get cached insights first
    const cachedInsights = await WeatherInsightsAPI.getAnalysis(days);

    // If cached insights found, return them
    if (cachedInsights) {
      return cachedInsights;
    }

    // If not found, generate new insights
    return await WeatherInsightsAPI.generateAnalysis(days, false);
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
  static readonly WeatherInsights = WeatherInsightsAPI;
}
