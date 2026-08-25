import axiosServices from 'utils/axios';
import { formatDate } from 'utils/dateUtils';
import {
  AnalyticsParams,
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  InventoryOverviewResponse,
  InventoryAllResponse,
  EmployeeOverviewResponse,
  EmployeeAllResponse,
  EmployeeDailyResponse,
  EmployeeHeatmapResponse,
  EmployeeDetailsResponse,
  ShiftLengthResponse,
  OvertimeResponse,
  CRMAnalyticsParams,
  CRMAnalyticsOverviewResponse,
  CRMAnalyticsPipelineResponse,
  CRMAnalyticsConversionResponse,
  CRMAnalyticsSourcesResponse,
  CRMAnalyticsActivitiesResponse,
  CRMAnalyticsDealAgingResponse,
  CRMAnalyticsRepsResponse,
  CRMAnalyticsStalledResponse,
  CRMRepPerformanceParams,
  CRMRepPerformanceResponse
} from 'types/analytics';

/**
 * Base Analytics API Class
 * Contains common utilities and base functionality
 */
class BaseAnalyticsAPI {
  protected static readonly BASE_URL = '/analytics';

  /**
   * Normalize date parameters to ensure consistent format
   */
  public static ensureStartEnd(params?: AnalyticsParams | CRMAnalyticsParams): { start_date?: string; end_date?: string } {
    const start_date = params?.start_date ?? params?.from ?? params?.from_date;
    const end_date = params?.end_date ?? params?.to ?? params?.to_date;

    const normalizedStart = start_date ? formatDate(start_date, 'yyyy-MM-dd') : undefined;
    const normalizedEnd = end_date ? formatDate(end_date, 'yyyy-MM-dd') : undefined;

    if (normalizedStart && normalizedEnd) return { start_date: normalizedStart, end_date: normalizedEnd };

    // Fallback: last 7 days if not provided
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 7);
    const endStr = formatDate(end, 'yyyy-MM-dd');
    const startStr = formatDate(start, 'yyyy-MM-dd');
    return { start_date: normalizedStart || startStr, end_date: normalizedEnd || endStr };
  }

  /**
   * Build query parameters from analytics params
   */
  public static buildQueryParams(params?: AnalyticsParams): URLSearchParams {
    const queryParams = new URLSearchParams();
    const { start_date, end_date } = this.ensureStartEnd(params);

    if (start_date) queryParams.append('start_date', start_date);
    if (end_date) queryParams.append('end_date', end_date);
    if (params?.employee_ids?.length)
      queryParams.append('employee_ids', Array.isArray(params.employee_ids) ? params.employee_ids.join(',') : params.employee_ids);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.group_by) queryParams.append('group_by', params.group_by);
    if (params?.rule) queryParams.append('rule', params.rule);

    return queryParams;
  }

  /**
   * Build CRM query parameters
   */
  public static buildCRMQueryParams(params?: CRMAnalyticsParams): URLSearchParams {
    const queryParams = new URLSearchParams();
    const { start_date, end_date } = this.ensureStartEnd(params);

    // Standardize to start_date/end_date on the wire
    if (start_date) queryParams.append('start_date', start_date);
    if (end_date) queryParams.append('end_date', end_date);
    if (params?.company_id) queryParams.append('company_id', params.company_id);
    if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
    if (params?.stage_ids?.length) queryParams.append('stage_ids', params.stage_ids.join(','));
    if (params?.priority_ids?.length) queryParams.append('priority_ids', params.priority_ids.join(','));
    if (params?.source_ids?.length) queryParams.append('source_ids', params.source_ids.join(','));
    if (params?.min_value !== undefined) queryParams.append('min_value', params.min_value.toString());
    if (params?.max_value !== undefined) queryParams.append('max_value', params.max_value.toString());
    if (params?.min_probability !== undefined) queryParams.append('min_probability', params.min_probability.toString());
    if (params?.max_probability !== undefined) queryParams.append('max_probability', params.max_probability.toString());
    if (params?.group_by) queryParams.append('group_by', params.group_by);
    if (params?.date_type) queryParams.append('date_type', params.date_type);

    return queryParams;
  }
}

/**
 * Financial Analytics API Class
 * Handles all financial analytics related API calls
 */
class FinancialAnalyticsAPI extends BaseAnalyticsAPI {
  /**
   * Get Analytics Summary
   */
  static async getSummary(params?: AnalyticsParams): Promise<AnalyticsSummary> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/summary/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Revenue Series
   */
  static async getRevenueSeries(params?: AnalyticsParams): Promise<RevenueSeriesPoint[]> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/revenue-series/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Expense Breakdown
   */
  static async getExpenseBreakdown(params?: AnalyticsParams): Promise<ExpenseBreakdownItem[]> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/expense-breakdown/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Top Items
   */
  static async getTopItems(params?: AnalyticsParams): Promise<TopItem[]> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/top-items/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Low Stock Items
   */
  static async getLowStock(params?: AnalyticsParams): Promise<LowStockItem[]> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/low-stock/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Time Utilization
   */
  static async getTimeUtilization(params?: AnalyticsParams): Promise<TimeUtilizationPoint[]> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/time-utilization/?${queryParams.toString()}`);
    return response.data;
  }
}

/**
 * Inventory Analytics API Class
 * Handles all inventory analytics related API calls
 */
class InventoryAnalyticsAPI extends BaseAnalyticsAPI {
  // `inventory-summary/` and `inventory-alerts/` were declared here. Neither
  // route exists in analytics/urls.py, so both would have 404'd, and nothing
  // dispatched them. The same summary and alerts arrive through getOverview()
  // and getAll() below -- the routes the server actually serves.

  /**
   * Get Inventory Overview
   */
  static async getOverview(sections?: string): Promise<InventoryOverviewResponse> {
    const qp = sections ? `?sections=${encodeURIComponent(sections)}` : '';
    const response = await axiosServices.get(`${this.BASE_URL}/inventory/overview/${qp}`);
    return response.data;
  }

  /**
   * Get All Inventory Analytics
   */
  static async getAll(): Promise<InventoryAllResponse> {
    const response = await axiosServices.get(`${this.BASE_URL}/inventory/`);
    return response.data;
  }

  /**
   * Get Inventory Items Treemap data with ALL grouping options in one response
   */
  static async getItemsTreemap(
    params?: AnalyticsParams & { top?: number; location_id?: string }
  ): Promise<import('types/inventory').InventoryItemsTreemapResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/inventory/items-treemap/?${queryParams.toString()}`);
    return response.data;
  }
}

/**
 * Employee Analytics API Class
 * Handles all employee analytics related API calls
 */
class EmployeeAnalyticsAPI extends BaseAnalyticsAPI {
  /**
   * Get Employee Overview
   */
  static async getOverview(params?: AnalyticsParams): Promise<EmployeeOverviewResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/overview/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get All Employee Analytics
   */
  static async getAll(params?: AnalyticsParams): Promise<EmployeeAllResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Employee Daily Breakdown
   */
  static async getDailyBreakdown(params?: AnalyticsParams): Promise<EmployeeDailyResponse> {
    const queryParams = this.buildQueryParams(params);
    if (params?.employee_id) queryParams.append('employee_id', params.employee_id);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/daily/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Employee Heatmap
   */
  static async getHeatmap(params?: AnalyticsParams): Promise<EmployeeHeatmapResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/heatmap/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Employee Analytics (Timeline + Heatmap combined)
   */
  static async getEmployeeAnalytics(params?: AnalyticsParams & { employee_id?: string }): Promise<EmployeeDetailsResponse> {
    const queryParams = this.buildQueryParams(params);
    if (params?.employee_id) {
      queryParams.append('employee_id', params.employee_id);
    }
    const response = await axiosServices.get(`${this.BASE_URL}/employees/analytics/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Employee Shift Lengths
   */
  static async getShiftLengths(params?: AnalyticsParams): Promise<ShiftLengthResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/shift-lengths/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get Employee Overtime
   */
  static async getOvertime(params?: AnalyticsParams): Promise<OvertimeResponse> {
    const queryParams = this.buildQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/employee/overtime/?${queryParams.toString()}`);
    return response.data;
  }
}

/**
 * CRM Analytics API Class
 * Handles all CRM analytics related API calls
 */
class CRMAnalyticsAPI extends BaseAnalyticsAPI {
  /**
   * Get CRM Analytics Overview
   */
  static async getOverview(params?: CRMAnalyticsParams): Promise<CRMAnalyticsOverviewResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/overview/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Pipeline by Stage
   */
  static async getPipeline(params?: CRMAnalyticsParams): Promise<CRMAnalyticsPipelineResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/pipeline/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Conversion Waterfall
   */
  static async getConversion(params?: CRMAnalyticsParams): Promise<CRMAnalyticsConversionResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/conversion/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Lead Sources
   */
  static async getSources(params?: CRMAnalyticsParams): Promise<CRMAnalyticsSourcesResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/sources/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Activities Mix
   */
  static async getActivities(params?: CRMAnalyticsParams & { bucket?: 'day' | 'week' | 'month' }): Promise<CRMAnalyticsActivitiesResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    if (params?.bucket) queryParams.append('bucket', params.bucket);

    const response = await axiosServices.get(`${this.BASE_URL}/crm/activities/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Deal Aging Heatmap
   */
  static async getDealAging(params?: CRMAnalyticsParams): Promise<CRMAnalyticsDealAgingResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/deal-aging/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Rep Performance
   */
  static async getReps(params?: CRMAnalyticsParams): Promise<CRMAnalyticsRepsResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    const response = await axiosServices.get(`${this.BASE_URL}/crm/reps/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Stalled Deals
   */
  static async getStalled(
    params?: CRMAnalyticsParams & { days_no_activity?: number; min_value?: number }
  ): Promise<CRMAnalyticsStalledResponse> {
    const queryParams = this.buildCRMQueryParams(params);
    if (params?.days_no_activity !== undefined) queryParams.append('days_no_activity', params.days_no_activity.toString());
    if (params?.min_value !== undefined) queryParams.append('min_value', params.min_value.toString());

    const response = await axiosServices.get(`${this.BASE_URL}/crm/stalled/?${queryParams.toString()}`);
    return response.data;
  }

  /**
   * Get CRM Rep Performance
   */
  static async getRepPerformance(params: CRMRepPerformanceParams): Promise<CRMRepPerformanceResponse> {
    const qp = new URLSearchParams();
    qp.append('company_id', params.company_id);
    qp.append('start', params.start);
    qp.append('end', params.end);
    if (params.owners) qp.append('owners', params.owners);
    if (params.min_value !== undefined) qp.append('min_value', String(params.min_value));
    if (params.max_value !== undefined) qp.append('max_value', String(params.max_value));
    if (params.tz) qp.append('tz', params.tz);

    const response = await axiosServices.get(`${this.BASE_URL}/crm/rep-performance/?${qp.toString()}`);
    return response.data;
  }
}

/**
 * Dashboard API Class
 * Handles dashboard summary with fixed time ranges
 */
class DashboardAPI extends BaseAnalyticsAPI {
  /**
   * Get Dashboard Summary
   */
  static async getSummary(range: 'today' | '7d' | '30d' | 'mtd'): Promise<any> {
    const queryParams = new URLSearchParams();
    queryParams.append('range', range);
    const response = await axiosServices.get(`${this.BASE_URL}/dashboard/summary/?${queryParams.toString()}`);
    return response.data;
  }
}

/**
 * Main Analytics API Class
 * Hierarchical structure with nested analytics types
 */
export class AnalyticsAPI {
  // Nested analytics classes
  static readonly Financial = FinancialAnalyticsAPI;
  static readonly Inventory = InventoryAnalyticsAPI;
  static readonly Employee = EmployeeAnalyticsAPI;
  static readonly CRM = CRMAnalyticsAPI;
  static readonly Dashboard = DashboardAPI;

  // Direct access to base utilities (made public for external access)
  static ensureStartEnd(params?: AnalyticsParams | CRMAnalyticsParams) {
    return BaseAnalyticsAPI.ensureStartEnd(params);
  }

  static buildQueryParams(params?: AnalyticsParams) {
    return BaseAnalyticsAPI.buildQueryParams(params);
  }

  static buildCRMQueryParams(params?: CRMAnalyticsParams) {
    return BaseAnalyticsAPI.buildCRMQueryParams(params);
  }
}
