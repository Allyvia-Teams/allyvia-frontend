import axiosServices from 'utils/axios';
import {
  AnalyticsSummary,
  RevenueSeriesPoint,
  ExpenseBreakdownItem,
  PaymentSplitItem,
  TopItem,
  LowStockItem,
  TimeUtilizationPoint,
  AnalyticsParams
} from 'types/analytics';

const BASE_URL = '/analytics';

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
