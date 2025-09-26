import axiosServices from 'utils/axios';
import { formatDate } from 'utils/dateUtils';
import {
  CRMAnalyticsParams,
  CRMAnalyticsOverviewResponse,
  CRMAnalyticsPipelineResponse,
  CRMAnalyticsConversionResponse,
  CRMAnalyticsSourcesResponse,
  CRMAnalyticsActivitiesResponse,
  CRMAnalyticsDealAgingResponse,
  CRMAnalyticsRepsResponse,
  CRMAnalyticsStalledResponse
} from 'types/analytics';

const BASE_URL = '/analytics/crm';

function ensureStartEnd(params?: CRMAnalyticsParams): { start_date?: string; end_date?: string } {
  const start_date = params?.start_date ?? params?.from ?? params?.from_date;
  const end_date = params?.end_date ?? params?.to ?? params?.to_date;

  const normalizedStart = start_date ? formatDate(start_date, 'yyyy-MM-dd') : undefined;
  const normalizedEnd = end_date ? formatDate(end_date, 'yyyy-MM-dd') : undefined;

  if (normalizedStart && normalizedEnd) return { start_date: normalizedStart, end_date: normalizedEnd };

  // Fallback: last 30 days if not provided
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - 30);
  const endStr = formatDate(end, 'yyyy-MM-dd');
  const startStr = formatDate(start, 'yyyy-MM-dd');
  return { start_date: normalizedStart || startStr, end_date: normalizedEnd || endStr };
}

// CRM Analytics Overview
export const getCRMAnalyticsOverview = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsOverviewResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
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

  const response = await axiosServices.get(`${BASE_URL}/overview/?${queryParams.toString()}`);
  return response.data;
};

// CRM Pipeline by Stage
export const getCRMAnalyticsPipeline = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsPipelineResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
  if (params?.stage_ids?.length) queryParams.append('stage_ids', params.stage_ids.join(','));
  if (params?.priority_ids?.length) queryParams.append('priority_ids', params.priority_ids.join(','));
  if (params?.source_ids?.length) queryParams.append('source_ids', params.source_ids.join(','));
  if (params?.min_value !== undefined) queryParams.append('min_value', params.min_value.toString());
  if (params?.max_value !== undefined) queryParams.append('max_value', params.max_value.toString());
  if (params?.min_probability !== undefined) queryParams.append('min_probability', params.min_probability.toString());
  if (params?.max_probability !== undefined) queryParams.append('max_probability', params.max_probability.toString());

  const response = await axiosServices.get(`${BASE_URL}/pipeline/?${queryParams.toString()}`);
  return response.data;
};

// CRM Conversion Waterfall
export const getCRMAnalyticsConversion = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsConversionResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
  if (params?.source_ids?.length) queryParams.append('source_ids', params.source_ids.join(','));

  const response = await axiosServices.get(`${BASE_URL}/conversion/?${queryParams.toString()}`);
  return response.data;
};

// CRM Lead Sources
export const getCRMAnalyticsSources = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsSourcesResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));

  const response = await axiosServices.get(`${BASE_URL}/sources/?${queryParams.toString()}`);
  return response.data;
};

// CRM Activities Mix
export const getCRMAnalyticsActivities = async (
  params?: CRMAnalyticsParams & { bucket?: 'day' | 'week' | 'month' }
): Promise<CRMAnalyticsActivitiesResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
  if (params?.bucket) queryParams.append('bucket', params.bucket);

  const response = await axiosServices.get(`${BASE_URL}/activities/?${queryParams.toString()}`);
  return response.data;
};

// CRM Deal Aging Heatmap
export const getCRMAnalyticsDealAging = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsDealAgingResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
  if (params?.stage_ids?.length) queryParams.append('stage_ids', params.stage_ids.join(','));

  const response = await axiosServices.get(`${BASE_URL}/deal-aging/?${queryParams.toString()}`);
  return response.data;
};

// CRM Rep Performance
export const getCRMAnalyticsReps = async (params?: CRMAnalyticsParams): Promise<CRMAnalyticsRepsResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));

  const response = await axiosServices.get(`${BASE_URL}/reps/?${queryParams.toString()}`);
  return response.data;
};

// CRM Stalled Deals
export const getCRMAnalyticsStalled = async (
  params?: CRMAnalyticsParams & { days_no_activity?: number; min_value?: number }
): Promise<CRMAnalyticsStalledResponse> => {
  const queryParams = new URLSearchParams();
  const { start_date, end_date } = ensureStartEnd(params);

  if (start_date) queryParams.append('from_date', start_date);
  if (end_date) queryParams.append('to_date', end_date);
  if (params?.company_id) queryParams.append('company_id', params.company_id);
  if (params?.owner_ids?.length) queryParams.append('owner_ids', params.owner_ids.join(','));
  if (params?.stage_ids?.length) queryParams.append('stage_ids', params.stage_ids.join(','));
  if (params?.days_no_activity !== undefined) queryParams.append('days_no_activity', params.days_no_activity.toString());
  if (params?.min_value !== undefined) queryParams.append('min_value', params.min_value.toString());

  const response = await axiosServices.get(`${BASE_URL}/stalled/?${queryParams.toString()}`);
  return response.data;
};
