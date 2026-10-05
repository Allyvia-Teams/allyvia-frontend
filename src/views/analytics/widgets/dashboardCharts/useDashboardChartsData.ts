import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AnalyticsAPI } from 'api/analytics.api';
import { useIsAdmin } from 'hooks/usePermission';
import { AppDispatch, RootState } from 'store';
import {
  fetchAnalyticsSummary,
  fetchBudgetByCategoryAsync,
  fetchExpenseBreakdown,
  fetchInvoiceAgingAsync,
  fetchPayablesByDueDateAsync,
  fetchRevenueSeries
} from 'store/slices/finance';
import type { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { toISO } from 'views/analytics/analyticsDateRange';
import { buildDashboardCharts, type ChartData } from 'views/dashboard/Analytics/buildDashboardCharts';

/**
 * Shared data for the six dashboard-metric analytics widgets.
 * Mirrors AnalyticsSection.tsx fetch + ChartInputs wiring (do not reinvent).
 */
export function useDashboardChartsData(dateRange: RangeValue): {
  charts: ChartData[];
  isLoading: boolean;
} {
  const dispatch = useDispatch<AppDispatch>();
  const isAdmin = useIsAdmin();

  const startDate = toISO(dateRange?.start as { year: number; month: number; day: number } | null | undefined);
  const endDate = toISO(dateRange?.end as { year: number; month: number; day: number } | null | undefined);

  const invoiceAging = useSelector((state: RootState) => state.finance.invoiceAging);
  const payablesByDueDate = useSelector((state: RootState) => state.finance.payablesByDueDate);
  const budgetsByCategory = useSelector((state: RootState) => state.finance.budgetsByCategory);
  const expenseBreakdown = useSelector((state: RootState) => state.finance.expenseBreakdown);
  const analyticsSummary = useSelector((state: RootState) => state.finance.analyticsSummary);
  const revenueSeries = useSelector((state: RootState) => state.finance.revenueSeries);
  const loading = useSelector((state: RootState) => state.finance.loading);

  const [inventorySummary, setInventorySummary] = useState<Record<string, unknown> | null>(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<unknown>(null);
  const [localLoading, setLocalLoading] = useState(false);

  useEffect(() => {
    if (!startDate || !endDate) {
      return;
    }

    // AR aging (/invoice/aging/) is admin-only on the backend; non-admins get a 403.
    if (isAdmin) dispatch(fetchInvoiceAgingAsync());
    dispatch(fetchPayablesByDueDateAsync({ startDate, endDate }));
    dispatch(fetchBudgetByCategoryAsync({ startDate, endDate }));
    dispatch(fetchExpenseBreakdown({ startDate, endDate }) as any);
    dispatch(fetchAnalyticsSummary({ startDate, endDate }));
    dispatch(fetchRevenueSeries({ startDate, endDate }));

    let cancelled = false;
    setLocalLoading(true);
    Promise.allSettled([
      AnalyticsAPI.Inventory.getOverview('summary').then((data) =>
        setInventorySummary(((data as any).summary ?? data) as Record<string, unknown>)
      ),
      AnalyticsAPI.Employee.getDailyBreakdown({ start_date: startDate, end_date: endDate }).then((data) => setEmployeeAnalytics(data))
    ]).finally(() => {
      if (!cancelled) setLocalLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [dispatch, startDate, endDate, isAdmin]);

  const charts = useMemo(
    () =>
      buildDashboardCharts({
        invoiceAging: isAdmin ? (invoiceAging as any) : null,
        payablesByDueDate: payablesByDueDate as any,
        budgetsByCategory: budgetsByCategory as any,
        expenseBreakdown: expenseBreakdown as any,
        analyticsSummary: analyticsSummary as any,
        revenueSeries: revenueSeries as any,
        inventorySummary,
        employeeAnalytics: employeeAnalytics as any
      }),
    [
      isAdmin,
      invoiceAging,
      payablesByDueDate,
      budgetsByCategory,
      expenseBreakdown,
      analyticsSummary,
      revenueSeries,
      inventorySummary,
      employeeAnalytics
    ]
  );

  const isLoading =
    localLoading ||
    loading.invoiceAging ||
    loading.payables ||
    loading.budgets ||
    loading.expenseBreakdown ||
    loading.analyticsSummary ||
    loading.revenueSeries;

  return { charts, isLoading };
}

/** Exact `ChartData.name` values from buildDashboardCharts (stable contract). */
export const DASHBOARD_CHART_NAMES = {
  revenueVsExpenses: 'Revenue vs expenses',
  receivablesByAge: 'Receivables by age',
  payablesByDueDate: 'Payables by due date',
  budgetVsActual: 'Budget vs actual',
  inventoryTurnover: 'Inventory turnover',
  revenuePerLaborHour: 'Revenue per labor hour'
} as const;
