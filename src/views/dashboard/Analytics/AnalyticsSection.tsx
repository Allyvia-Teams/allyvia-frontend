import { useEffect, useMemo, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

// material-ui
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';

// icons
import { IconChartBar, IconChartLine } from '@tabler/icons-react';

// Redux
import { AppDispatch, RootState } from 'store';
import {
  fetchInvoiceAgingAsync,
  fetchBudgetByCategoryAsync,
  fetchPayablesByDueDateAsync,
  fetchExpenseBreakdown,
  fetchAnalyticsSummary,
  fetchRevenueSeries
} from 'store/slices/finance';
import { AnalyticsAPI } from 'api/analytics.api';
import { useIsAdmin } from 'hooks/usePermission';

// project imports
import { Panel, PanelMessage } from 'ui-component/frame';
import AnalyticsChart from './AnalyticsChart';
import { buildDashboardCharts, pickChart } from './buildDashboardCharts';
import type { IsoWindow } from '../dashboardRange';

// ==============================|| DASHBOARD - ANALYTICS ||============================== //
// One chart, one small dropdown of the metrics the owner most wants to see
// (design handoff 1.3 "Chart" body inside a panel). The data plumbing is the
// old dashboard analytics section's; the three KPI cards, the table view and
// the drill-down dialog it carried are gone — the Analytics view has them.

export const AnalyticsSection = ({ window, windowLabel }: { window: IsoWindow; windowLabel: string }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { startDate, endDate } = window;

  // AR aging (/invoice/aging/) is admin-only on the backend; non-admins get a 403.
  // Gate the fetch on admin so they see a clean panel rather than an error.
  const isAdmin = useIsAdmin();

  const invoiceAging = useSelector((state: RootState) => state.finance.invoiceAging);
  const payablesByDueDate = useSelector((state: RootState) => state.finance.payablesByDueDate);
  const budgetsByCategory = useSelector((state: RootState) => state.finance.budgetsByCategory);
  const expenseBreakdown = useSelector((state: RootState) => state.finance.expenseBreakdown);
  const analyticsSummary = useSelector((state: RootState) => state.finance.analyticsSummary);
  const revenueSeries = useSelector((state: RootState) => state.finance.revenueSeries);
  const loading = useSelector((state: RootState) => state.finance.loading);
  const errors = useSelector((state: RootState) => state.finance.errors);

  const [inventorySummary, setInventorySummary] = useState<Record<string, unknown> | null>(null);
  const [employeeAnalytics, setEmployeeAnalytics] = useState<any>(null);
  const [localLoading, setLocalLoading] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [typeOverride, setTypeOverride] = useState<'bar' | 'line' | null>(null);

  useEffect(() => {
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
        employeeAnalytics
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

  const chart = pickChart(charts, selectedName);
  const chartType = typeOverride ?? chart?.chartType ?? 'bar';

  const isLoading =
    localLoading ||
    loading.invoiceAging ||
    loading.payables ||
    loading.budgets ||
    loading.expenseBreakdown ||
    loading.analyticsSummary ||
    loading.revenueSeries;
  const hasErrors =
    errors.invoiceAging || errors.payables || errors.budgets || errors.expenseBreakdown || errors.analyticsSummary || errors.revenueSeries;

  const handleSelect = (event: SelectChangeEvent<string>) => {
    setSelectedName(event.target.value);
    setTypeOverride(null);
  };

  const picker =
    charts.length > 0 ? (
      <>
        <Select
          size="small"
          value={chart?.name ?? ''}
          onChange={handleSelect}
          aria-label="Metric"
          sx={{
            fontSize: '0.875rem',
            fontWeight: 600,
            minWidth: 180,
            height: 30,
            '& .MuiSelect-select': { py: 0, display: 'flex', alignItems: 'center' }
          }}
        >
          {charts.map((c) => (
            <MenuItem key={c.name} value={c.name} sx={{ fontSize: '0.875rem' }}>
              {c.name}
            </MenuItem>
          ))}
        </Select>
        <IconButton
          size="small"
          aria-label="Show as bars"
          aria-pressed={chartType === 'bar'}
          onClick={() => setTypeOverride('bar')}
          sx={{ color: chartType === 'bar' ? 'primary.dark' : 'text.disabled', bgcolor: chartType === 'bar' ? 'grey.100' : 'transparent' }}
        >
          <IconChartBar size={16} stroke={1.75} />
        </IconButton>
        <IconButton
          size="small"
          aria-label="Show as a line"
          aria-pressed={chartType === 'line'}
          onClick={() => setTypeOverride('line')}
          sx={{
            color: chartType === 'line' ? 'primary.dark' : 'text.disabled',
            bgcolor: chartType === 'line' ? 'grey.100' : 'transparent'
          }}
        >
          <IconChartLine size={16} stroke={1.75} />
        </IconButton>
      </>
    ) : null;

  let body: React.ReactNode;
  if (!chart && isLoading) {
    body = (
      <Box sx={{ p: '14px' }}>
        <Skeleton variant="text" width={140} sx={{ fontSize: '1.5rem' }} />
        <Skeleton variant="rounded" height={170} sx={{ mt: 1 }} />
      </Box>
    );
  } else if (!chart) {
    body = (
      <PanelMessage tone={hasErrors ? 'error' : 'default'}>
        {hasErrors
          ? "Couldn't load analytics right now."
          : `No sales, invoices, bills or budgets recorded for ${windowLabel.toLowerCase()} yet.`}
      </PanelMessage>
    );
  } else {
    const series = chart.secondarySeries
      ? [
          { name: chart.seriesNames[0], data: chart.data },
          { name: chart.seriesNames[1] ?? 'Comparison', data: chart.secondarySeries }
        ]
      : [{ name: chart.seriesNames[0], data: chart.data }];
    body = (
      <Box sx={{ px: '14px', pt: '12px', pb: '8px' }}>
        <Typography
          component="div"
          sx={{ fontSize: '1.375rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.15, color: 'text.dark' }}
        >
          {chart.headline}
        </Typography>
        <Typography component="div" sx={{ mt: '2px', fontSize: '0.8125rem', color: 'text.disabled', lineHeight: 1.4 }}>
          {chart.description}
        </Typography>
        <Box sx={{ mt: 1 }}>
          <AnalyticsChart type={chartType} series={series} xAxis={chart.xAxis} />
        </Box>
      </Box>
    );
  }

  return (
    <Panel title="Analytics" icon={<IconChartBar size={17} stroke={1.75} />} note={windowLabel} action={picker}>
      {body}
    </Panel>
  );
};

export default AnalyticsSection;
