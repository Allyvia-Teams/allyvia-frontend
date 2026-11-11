import { useMemo, useState } from 'react';

// material-ui
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import { useTheme } from '@mui/material/styles';

// project imports
import { useSelector } from 'store';
import { selectEffectiveModulePermissions, selectEffectiveRoleType } from 'store/selectors/effectiveRole';
import type { ModulePermissions } from 'types/settings';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { KpiRow, KpiTile, PageHeader, Panel, isoWindowLabel } from 'ui-component/frame';
import { defaultAnalyticsRange, toISO } from './analyticsDateRange';
import {
  analyticsCsv,
  bestSellerRows,
  canSeeSection,
  expenseCategoryRows,
  expenseMonthRows,
  fillDays,
  formatMoney,
  groupPoints,
  kpiCards,
  lastYearWindow,
  previousWindow,
  shiftForward,
  sourceSentence,
  tenderRows,
  toNumber,
  toPoints,
  weekdayAverages,
  WEEKDAYS,
  type ExpenseBasis,
  type Grouping
} from './analyticsPage';
import {
  useCrmOverview,
  useEmployeeOverview,
  useExpenseBreakdown,
  useExpenseTrend,
  useFinanceKpisFor,
  useInventoryOverview,
  useLowStock,
  usePaymentSplit,
  useRevenueSeries,
  useTopItems
} from './useAnalyticsData';
import FigureRows from './sections/FigureRows';
import MoneyChart, { type ChartSeries } from './sections/MoneyChart';
import RankedList from './sections/RankedList';
import ViewSelect from './sections/ViewSelect';

// assets
import { IconDownload } from '@tabler/icons-react';

// ==============================|| ANALYTICS ||============================== //
//
// One page, most important first: the four money figures, the money chart,
// where money went and what sold, then stock, team and customers. Each panel
// picks its view from one dropdown. Replaces the four tabs of draggable widgets.

type ChartView = 'inout' | 'lastyear' | 'weekday';
type SpendView = 'category' | 'month';
type SoldView = 'best' | 'tender';
type StockView = 'value' | 'low';
type TeamView = 'hours' | 'perhour';
type CustomerView = 'deals' | 'pipeline';

const CHART_VIEWS = [
  { value: 'inout', label: 'Sales and money out' },
  { value: 'lastyear', label: 'Sales vs last year' },
  { value: 'weekday', label: 'Sales by day of week' }
] as const;
const GROUPINGS = [
  { value: 'day', label: 'By day' },
  { value: 'week', label: 'By week' },
  { value: 'month', label: 'By month' }
] as const;

function downloadText(filename: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function AnalyticsPage() {
  const theme = useTheme();
  const salesColor = theme.palette.primary.main;
  const outColor = theme.palette.warning.dark;
  const lastYearColor = theme.palette.grey[500];

  const roleType = useSelector(selectEffectiveRoleType);
  const permissions = useSelector(selectEffectiveModulePermissions) as ModulePermissions | undefined;
  const seeMoney = canSeeSection('finance', roleType, permissions);
  const seeStock = canSeeSection('inventory', roleType, permissions);
  const seeTeam = canSeeSection('employees', roleType, permissions);
  const seeCustomers = canSeeSection('crm', roleType, permissions);

  const [range, setRange] = useState<RangeValue>(() => defaultAnalyticsRange());
  const start = toISO(range?.start) ?? '';
  const end = toISO(range?.end) ?? '';
  const prev = previousWindow(start, end);
  const ly = lastYearWindow(start, end);

  const [chartView, setChartView] = useState<ChartView>('inout');
  const [grouping, setGrouping] = useState<Grouping>('day');
  const [spendView, setSpendView] = useState<SpendView>('category');
  const [soldView, setSoldView] = useState<SoldView>('best');
  const [stockView, setStockView] = useState<StockView>('value');
  const [teamView, setTeamView] = useState<TeamView>('hours');
  const [customerView, setCustomerView] = useState<CustomerView>('deals');

  // ---- data (only what a visible view needs) ----
  const kpis = useFinanceKpisFor(start, end, seeMoney);
  const prevKpis = useFinanceKpisFor(prev.start, prev.end, seeMoney);
  const revenue = useRevenueSeries(start, end, seeMoney);
  const lastYear = useRevenueSeries(ly.start, ly.end, seeMoney && chartView === 'lastyear');
  const expenseTrend = useExpenseTrend(start, end, seeMoney);
  const breakdown = useExpenseBreakdown(start, end, seeMoney && spendView === 'category');
  const topItems = useTopItems(start, end, seeMoney && soldView === 'best');
  const split = usePaymentSplit(start, end, seeMoney && soldView === 'tender');
  const inventory = useInventoryOverview(seeStock);
  const lowStock = useLowStock(start, end, seeStock && stockView === 'low');
  const employees = useEmployeeOverview(start, end, seeTeam);
  const crm = useCrmOverview(start, end, seeCustomers);

  const currency = kpis.data?.summary?.currency || kpis.data?.currency || 'USD';
  const basis = (kpis.data as { expense_basis?: ExpenseBasis } | null | undefined)?.expense_basis;
  const cards = useMemo(() => kpiCards(kpis.data as never, prevKpis.data as never), [kpis.data, prevKpis.data]);

  // ---- money chart ----
  const salesDays = useMemo(() => fillDays(toPoints(revenue.data), start, end), [revenue.data, start, end]);
  const outDays = useMemo(() => fillDays(toPoints(expenseTrend.data), start, end), [expenseTrend.data, start, end]);
  const lastYearDays = useMemo(() => fillDays(shiftForward(toPoints(lastYear.data)), start, end), [lastYear.data, start, end]);
  const chart = useMemo((): { kind: 'line' | 'bar'; series: ChartSeries[]; categories?: string[] } => {
    if (chartView === 'weekday') {
      const avg = weekdayAverages(salesDays, start, end);
      return {
        kind: 'bar',
        categories: WEEKDAYS,
        series: [{ name: 'Average sales', color: salesColor, points: avg.map((a) => ({ date: a.day, amount: a.amount })) }]
      };
    }
    if (chartView === 'lastyear') {
      return {
        kind: 'line',
        series: [
          { name: 'This year', color: salesColor, points: groupPoints(salesDays, grouping) },
          { name: 'Last year', color: lastYearColor, dashed: true, points: groupPoints(lastYearDays, grouping) }
        ]
      };
    }
    return {
      kind: 'line',
      series: [
        { name: 'Sales', color: salesColor, points: groupPoints(salesDays, grouping) },
        { name: 'Money out', color: outColor, points: groupPoints(outDays, grouping) }
      ]
    };
  }, [chartView, grouping, salesDays, outDays, lastYearDays, start, end, salesColor, outColor, lastYearColor]);
  const chartLoading =
    revenue.isLoading || (chartView === 'inout' && expenseTrend.isLoading) || (chartView === 'lastyear' && lastYear.isLoading);
  const chartError = revenue.isError || (chartView === 'inout' && expenseTrend.isError) || (chartView === 'lastyear' && lastYear.isError);

  // ---- ranked panels ----
  const spendRows = useMemo(
    () => (spendView === 'category' ? expenseCategoryRows(breakdown.data) : expenseMonthRows(toPoints(expenseTrend.data))),
    [spendView, breakdown.data, expenseTrend.data]
  );
  const soldRows = useMemo(
    () => (soldView === 'best' ? bestSellerRows(topItems.data) : tenderRows(split.data)),
    [soldView, topItems.data, split.data]
  );
  const spendQuery = spendView === 'category' ? breakdown : expenseTrend;
  const soldQuery = soldView === 'best' ? topItems : split;

  // ---- stock / team / customers ----
  const inv = inventory.data?.summary;
  const lowList = Array.isArray(lowStock.data) ? lowStock.data : [];
  const emp = employees.data?.summary;
  const hours = toNumber(emp?.total_hours);
  const sales = toNumber(kpis.data?.kpis?.revenue);
  const crmKpis = crm.data?.kpis;

  const handleDownload = () =>
    downloadText(
      `allyvia-analytics-${start}-to-${end}.csv`,
      analyticsCsv({ start, end, cards, sales: salesDays, moneyOut: outDays, spend: spendRows, sold: soldRows })
    );

  const loadingKpis = kpis.isLoading;

  return (
    <Box>
      <PageHeader
        title="Analytics"
        subtitle={isoWindowLabel(start, end) || undefined}
        right={
          <>
            <AllyviaDateRangePicker value={range} onChange={(value: RangeValue | null) => value && setRange(value)} />
            {seeMoney ? (
              <Button variant="outlined" color="secondary" startIcon={<IconDownload size={16} />} onClick={handleDownload}>
                Download
              </Button>
            ) : null}
          </>
        }
      />

      {seeMoney ? (
        <>
          <KpiRow>
            {cards.map((c) => (
              <KpiTile
                key={c.key}
                label={c.label}
                value={c.value}
                delta={c.change ? `${c.change} vs previous period` : null}
                deltaKind={c.direction}
                basis={c.basis}
                loading={loadingKpis}
              />
            ))}
          </KpiRow>

          <Box sx={{ mb: 2 }}>
            <Panel
              title={CHART_VIEWS.find((v) => v.value === chartView)?.label}
              action={
                <>
                  <ViewSelect label="Chart" value={chartView} options={CHART_VIEWS} onChange={setChartView} />
                  {chartView !== 'weekday' ? (
                    <ViewSelect label="Grouping" value={grouping} options={GROUPINGS} onChange={setGrouping} />
                  ) : null}
                </>
              }
            >
              <MoneyChart
                kind={chart.kind}
                series={chart.series}
                categories={chart.categories}
                loading={chartLoading}
                error={chartError}
                currency={currency}
              />
            </Panel>
          </Box>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' }, gap: 2, mb: 2 }}>
            <Panel
              title="Where money went"
              action={
                <ViewSelect
                  label="Money out view"
                  value={spendView}
                  options={[
                    { value: 'category', label: 'By category' },
                    { value: 'month', label: 'By month' }
                  ]}
                  onChange={setSpendView}
                />
              }
            >
              <RankedList
                rows={spendRows}
                loading={spendQuery.isLoading}
                error={spendQuery.isError}
                color={outColor}
                currency={currency}
                empty={
                  basis === 'own_records'
                    ? 'No expenses recorded. Connect QuickBooks or your bank to see money out.'
                    : 'No money out in this period.'
                }
              />
            </Panel>
            <Panel
              title="What sold"
              action={
                <ViewSelect
                  label="Sales view"
                  value={soldView}
                  options={[
                    { value: 'best', label: 'Best sellers' },
                    { value: 'tender', label: 'How customers paid' }
                  ]}
                  onChange={setSoldView}
                />
              }
            >
              <RankedList
                rows={soldRows}
                loading={soldQuery.isLoading}
                error={soldQuery.isError}
                color={salesColor}
                currency={currency}
                empty="No sales in this period."
              />
            </Panel>
          </Box>
        </>
      ) : null}

      {seeStock || seeTeam || seeCustomers ? (
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 2, mb: 2 }}>
          {seeStock ? (
            <Panel
              title="Stock"
              note="As of now"
              action={
                <ViewSelect
                  label="Stock view"
                  value={stockView}
                  options={[
                    { value: 'value', label: 'Stock value' },
                    { value: 'low', label: 'Low stock' }
                  ]}
                  onChange={setStockView}
                />
              }
            >
              {stockView === 'value' ? (
                <FigureRows
                  loading={inventory.isLoading}
                  error={inventory.isError}
                  value={formatMoney(toNumber(inv?.total_cost_value), currency)}
                  basis="Stock on hand at cost"
                  rows={[
                    { label: 'At retail', value: formatMoney(toNumber(inv?.total_value), currency) },
                    {
                      label: 'Margin on stock',
                      value:
                        inv?.average_profit_margin == null
                          ? '—'
                          : `${Math.round(inv.average_profit_margin)}%${inv.average_profit_margin_estimated ? ' (estimated)' : ''}`
                    },
                    { label: 'Items', value: (toNumber(inv?.total_items) ?? 0).toLocaleString('en-US') }
                  ]}
                />
              ) : (
                <FigureRows
                  loading={inventory.isLoading || lowStock.isLoading}
                  error={inventory.isError || lowStock.isError}
                  value={(toNumber(inv?.low_stock_count) ?? 0).toLocaleString('en-US')}
                  basis="Items at or below their reorder point"
                  rows={[
                    {
                      label: 'Out of stock',
                      value: (toNumber(inv?.out_of_stock_count) ?? 0).toLocaleString('en-US'),
                      tone: toNumber(inv?.out_of_stock_count) ? 'error' : 'default'
                    },
                    ...lowList.slice(0, 3).map((i) => ({ label: i.name, value: `${i.on_hand} left` }))
                  ]}
                />
              )}
            </Panel>
          ) : null}

          {seeTeam ? (
            <Panel
              title="Team"
              action={
                <ViewSelect
                  label="Team view"
                  value={teamView}
                  options={[
                    { value: 'hours', label: 'Hours worked' },
                    { value: 'perhour', label: 'Sales per hour' }
                  ]}
                  onChange={setTeamView}
                />
              }
            >
              {teamView === 'hours' ? (
                <FigureRows
                  loading={employees.isLoading}
                  error={employees.isError}
                  value={hours === null ? '—' : `${Math.round(hours).toLocaleString('en-US')} h`}
                  basis="Hours worked in this period"
                  rows={[
                    { label: 'People who worked', value: (toNumber(emp?.active_employees) ?? 0).toLocaleString('en-US') },
                    { label: 'Average per person', value: `${Math.round(toNumber(emp?.avg_hours_per_employee) ?? 0)} h` },
                    { label: 'Clocked in now', value: (toNumber(emp?.current_on_shift) ?? 0).toLocaleString('en-US') }
                  ]}
                />
              ) : (
                <FigureRows
                  loading={employees.isLoading || kpis.isLoading}
                  error={employees.isError}
                  value={hours && sales !== null ? formatMoney(sales / hours, currency) : '—'}
                  basis={hours ? 'Sales for each hour worked' : 'No hours worked in this period'}
                  rows={[
                    { label: 'Sales', value: formatMoney(sales, currency) },
                    { label: 'Hours worked', value: hours === null ? '—' : `${Math.round(hours).toLocaleString('en-US')} h` }
                  ]}
                />
              )}
            </Panel>
          ) : null}

          {seeCustomers ? (
            <Panel
              title="Customers"
              action={
                <ViewSelect
                  label="Customers view"
                  value={customerView}
                  options={[
                    { value: 'deals', label: 'Leads and deals' },
                    { value: 'pipeline', label: 'Open pipeline' }
                  ]}
                  onChange={setCustomerView}
                />
              }
            >
              {customerView === 'deals' ? (
                <FigureRows
                  loading={crm.isLoading}
                  error={crm.isError}
                  value={(toNumber(crmKpis?.new_leads) ?? 0).toLocaleString('en-US')}
                  basis="New leads in this period"
                  rows={[
                    { label: 'Deals won', value: (toNumber(crmKpis?.deals_won) ?? 0).toLocaleString('en-US') },
                    { label: 'Won value', value: formatMoney(toNumber(crmKpis?.revenue_won), currency) },
                    { label: 'Win rate', value: `${Math.round(toNumber(crmKpis?.win_rate_pct) ?? 0)}%` }
                  ]}
                />
              ) : (
                <FigureRows
                  loading={crm.isLoading}
                  error={crm.isError}
                  value={formatMoney(toNumber(crmKpis?.open_pipeline_value), currency)}
                  basis="Open deals, full value"
                  rows={[
                    { label: 'Likely to close', value: formatMoney(toNumber(crmKpis?.weighted_pipeline), currency) },
                    { label: 'Average deal', value: formatMoney(toNumber(crmKpis?.avg_deal_size), currency) },
                    { label: 'Days to close', value: `${Math.round(toNumber(crmKpis?.velocity_days) ?? 0)}` }
                  ]}
                />
              )}
            </Panel>
          ) : null}
        </Box>
      ) : null}

      {seeMoney && basis ? <Typography sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>{sourceSentence(basis)}</Typography> : null}
      {!seeMoney && !seeStock && !seeTeam && !seeCustomers ? (
        <Typography sx={{ color: 'text.secondary' }}>Your role doesn't include any analytics. Ask an admin for access.</Typography>
      ) : null}
    </Box>
  );
}
