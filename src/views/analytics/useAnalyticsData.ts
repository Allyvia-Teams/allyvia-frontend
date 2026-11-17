import { useQuery } from '@tanstack/react-query';

// project imports
import { AnalyticsAPI } from 'api/analytics.api';
import { FinanceAPI } from 'api/finance.api';
import bankingApi from 'api/banking';
import { useSelector } from 'store';
import axiosServices from 'utils/axios';

// One query per figure, keyed by company and window, so a panel's dropdown only
// fetches what that view shows and switching back is instant. Every hook is
// enabled by the caller, so a section the role cannot see never fetches.

const STALE = 60 * 1000;

function useCompanyId(): string | null {
  return useSelector((state) => state.auth.currentRole?.company_id) || null;
}

export function useFinanceKpisFor(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-kpis', companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Analytics.getFinanceKPIs({ companyId: companyId!, startDate, endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useRevenueSeries(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-revenue-series', companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Analytics.getRevenueSeries({ companyId: companyId!, startDate, endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useExpenseTrend(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-expense-trend', companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Expense.getTrend({ companyId: companyId!, startDate, endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

/** Which days the expense source covers (expense truth X5): bank mode draws a gap outside it. */
export function useExpenseCoverage(enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['banking', 'coverage', companyId],
    queryFn: () => bankingApi.coverage(),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useExpenseBreakdown(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-expense-breakdown', companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Expense.getBreakdown({ companyId: companyId!, startDate, endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function usePaymentSplit(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-payment-split', companyId, startDate, endDate],
    queryFn: () => FinanceAPI.Payment.getSplit({ companyId: companyId!, startDate, endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useTopItems(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-top-items', companyId, startDate, endDate],
    queryFn: async () => {
      const response = await axiosServices.get('/analytics/top-items/', {
        params: { start_date: startDate, end_date: endDate, rank_by: 'revenue', limit: 8 }
      });
      return response.data;
    },
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useInventoryOverview(enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-inventory-overview', companyId],
    queryFn: () => AnalyticsAPI.Inventory.getOverview('summary'),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useLowStock(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-low-stock', companyId, startDate, endDate],
    queryFn: () => AnalyticsAPI.Financial.getLowStock({ start_date: startDate, end_date: endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useEmployeeOverview(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-employee-overview', companyId, startDate, endDate],
    queryFn: () => AnalyticsAPI.Employee.getOverview({ start_date: startDate, end_date: endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}

export function useCrmOverview(startDate: string, endDate: string, enabled = true) {
  const companyId = useCompanyId();
  return useQuery({
    queryKey: ['analytics-crm-overview', companyId, startDate, endDate],
    queryFn: () => AnalyticsAPI.CRM.getOverview({ start_date: startDate, end_date: endDate }),
    enabled: enabled && !!companyId,
    staleTime: STALE,
    retry: false
  });
}
