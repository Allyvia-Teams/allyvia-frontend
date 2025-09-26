import axiosServices from 'utils/axios';
import { formatDate } from 'utils/dateUtils';
import {
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  PaymentSplitItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  AnalyticsParams,
  InventorySummary,
  InventoryCategory,
  InventoryLocation,
  InventoryType,
  InventoryAlerts,
  InventoryOverviewResponse,
  InventoryAllResponse,
  EmployeeOverviewResponse,
  EmployeeAllResponse,
  EmployeeDailyResponse,
  EmployeeHeatmapResponse,
  ShiftLengthResponse,
  OvertimeResponse
} from 'types/analytics';

const BASE_URL = '/analytics';

function ensureStartEnd(params?: AnalyticsParams): { start_date?: string; end_date?: string } {
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

// Analytics Summary
export const getAnalyticsSummary = async (params?: AnalyticsParams): Promise<AnalyticsSummary> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/summary/?${queryParams.toString()}`);
  return response.data;
};

// Revenue Series
export const getRevenueSeries = async (params?: AnalyticsParams): Promise<RevenueSeriesPoint[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/revenue-series/?${queryParams.toString()}`);
  return response.data;
};

// Expense Breakdown
export const getExpenseBreakdown = async (params?: AnalyticsParams): Promise<ExpenseBreakdownItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/expense-breakdown/?${queryParams.toString()}`);
  return response.data;
};

// Payments Split
export const getPaymentsSplit = async (params?: AnalyticsParams): Promise<PaymentSplitItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/payments-split/?${queryParams.toString()}`);
  return response.data;
};

// Top Items
export const getTopItems = async (params?: AnalyticsParams): Promise<TopItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/top-items/?${queryParams.toString()}`);
  return response.data;
};

// Low Stock
export const getLowStock = async (params?: AnalyticsParams): Promise<LowStockItem[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/low-stock/?${queryParams.toString()}`);
  return response.data;
};

// Time Utilization
export const getTimeUtilization = async (params?: AnalyticsParams): Promise<TimeUtilizationPoint[]> => {
  const queryParams = new URLSearchParams();
  if (params?.from_date) queryParams.append('from', params.from_date);
  if (params?.to_date) queryParams.append('to', params.to_date);
  if (params?.provider) queryParams.append('provider', params.provider);
  if (params?.location_id) queryParams.append('location_id', params.location_id);

  const response = await axiosServices.get(`${BASE_URL}/time-utilization/?${queryParams.toString()}`);
  return response.data;
};

// New Inventory Analytics APIs
// Inventory Summary
export const getInventorySummary = async (): Promise<InventorySummary> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory-summary/`);
  return response.data;
};

// Inventory Categories
export const getInventoryCategories = async (): Promise<InventoryCategory[]> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory-categories/`);
  return response.data;
};

// Inventory Locations
export const getInventoryLocations = async (): Promise<InventoryLocation[]> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory-locations/`);
  return response.data;
};

// Inventory Types
export const getInventoryTypes = async (): Promise<InventoryType[]> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory-types/`);
  return response.data;
};

// Inventory Alerts
export const getInventoryAlerts = async (): Promise<InventoryAlerts> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory-alerts/`);
  return response.data;
};

// New consolidated Inventory analytics endpoints
// GET /analytics/inventory/overview/ (alias: /analytics/inventory-overview/)
export const getInventoryOverview = async (sections?: string): Promise<InventoryOverviewResponse> => {
  const qp = sections ? `?sections=${encodeURIComponent(sections)}` : '';
  const response = await axiosServices.get(`${BASE_URL}/inventory/overview/${qp}`);
  return response.data;
};

// GET /analytics/inventory/
export const getInventoryAll = async (): Promise<InventoryAllResponse> => {
  const response = await axiosServices.get(`${BASE_URL}/inventory/`);
  return response.data;
};

// Employee analytics
export const getEmployeeOverview = async (params?: AnalyticsParams): Promise<EmployeeOverviewResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  const response = await axiosServices.get(`${BASE_URL}/employee/overview/?${queryParams.toString()}`);
  return response.data;
};

export const getEmployeeAll = async (params?: AnalyticsParams): Promise<EmployeeAllResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  const response = await axiosServices.get(`${BASE_URL}/employee/?${queryParams.toString()}`);
  return response.data;
};

export const getEmployeeDailyBreakdown = async (params?: AnalyticsParams): Promise<EmployeeDailyResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  const response = await axiosServices.get(`${BASE_URL}/employee/daily/?${queryParams.toString()}`);
  return response.data;
};

// Employee heatmap (weekday x hour)
export const getEmployeeHeatmap = async (
  params?: AnalyticsParams & { bucket?: 'hour'; employee_ids?: string }
): Promise<EmployeeHeatmapResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  if (params?.bucket) queryParams.append('bucket', params.bucket);
  if (params?.employee_ids) queryParams.append('employee_ids', params.employee_ids);
  const response = await axiosServices.get(`${BASE_URL}/employee/heatmap/?${queryParams.toString()}`);
  return response.data;
};

// Shift length histogram
export const getEmployeeShiftLengths = async (params?: AnalyticsParams & { employee_ids?: string }): Promise<ShiftLengthResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  if (params?.employee_ids) queryParams.append('employee_ids', params.employee_ids);
  const response = await axiosServices.get(`${BASE_URL}/employee/shift-lengths/?${queryParams.toString()}`);
  return response.data;
};

// Overtime trend
export const getEmployeeOvertime = async (
  params?: AnalyticsParams & { rule?: 'daily8' | 'weekly40'; group_by?: 'week' | 'month'; employee_ids?: string }
): Promise<OvertimeResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);
  if (start_date) queryParams.append('start_date', start_date);
  if (end_date) queryParams.append('end_date', end_date);
  if (params?.rule) queryParams.append('rule', params.rule);
  if (params?.group_by) queryParams.append('group_by', params.group_by);
  if (params?.employee_ids) queryParams.append('employee_ids', params.employee_ids);
  const response = await axiosServices.get(`${BASE_URL}/employee/overtime/?${queryParams.toString()}`);
  return response.data;
};
