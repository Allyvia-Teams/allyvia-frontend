import React from 'react';
import { useSelector } from 'react-redux';
import { RootState } from 'store';
import { Grid } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import Chart from 'react-apexcharts';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';
import AllyviaStats from 'ui-component/common/AllyviaStats';

const fmtMoney = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

const InvoiceAnalytics: React.FC = () => {
  const { invoiceStatistics, invoiceList, invoiceAging, revenueSeries } = useSelector((state: RootState) => (state as any).finance);

  const loading = useSelector((state: RootState) => (state as any).finance.loading.invoiceStatistics);

  // Invoice KPIs
  const invoiceKPIs = [
    {
      title: 'Total Invoices',
      value: invoiceStatistics?.total_invoices || 0,
      theme: 'default' as const,
      loading: loading
    },
    {
      title: 'Total Amount',
      value: fmtMoney(invoiceStatistics?.total_amount || 0),
      theme: 'success' as const,
      loading: loading
    },
    {
      title: 'Outstanding Balance',
      value: fmtMoney(invoiceStatistics?.outstanding_balance || 0),
      theme: 'warning' as const,
      loading: loading
    },
    {
      title: 'Overdue Count',
      value: invoiceStatistics?.overdue_count || 0,
      theme: 'alert' as const,
      loading: loading
    }
  ];

  // Invoice Status Distribution
  const statusData = invoiceStatistics?.invoices_by_status || {};
  const statusLabels = Object.keys(statusData);
  const statusSeries = Object.values(statusData).map((count: any) => Number(count || 0));

  // Revenue Trends Data - handle new structure
  const revenueData = Array.isArray(revenueSeries) ? revenueSeries : [];
  const revenueCategories = revenueData.map((r: any) => r.date);
  const revenueSeriesData = revenueData.map((r: any) => Number(r.amount || 0));

  // Invoice Aging Data - handle new structure
  const agingData = Array.isArray(invoiceAging?.aging_summary) ? invoiceAging.aging_summary : [];
  const agingLabels = agingData.map((item: any) => item.period);
  const agingSeries = agingData.map((item: any) => Number(item.amount || 0));

  // Recent Invoices List - handle both array and paginated response
  const recentInvoices = Array.isArray(invoiceList)
    ? invoiceList.slice(0, 10)
    : Array.isArray(invoiceList?.items)
      ? invoiceList.items.slice(0, 10)
      : [];

  return (
    <Grid container spacing={3}>
      {/* Invoice KPIs */}
      <Grid size={{ xs: 12 }}>
        <Grid container spacing={3}>
          {invoiceKPIs.map((kpi, index) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={index}>
              <AllyviaStats title={kpi.title} value={kpi.value} theme={kpi.theme} size="medium" loading={kpi.loading} />
            </Grid>
          ))}
        </Grid>
      </Grid>

      {/* Invoice Status Distribution */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Invoice Status Distribution">
            <Chart
              options={{
                chart: { type: 'donut' },
                labels: statusLabels.length ? statusLabels : ['Paid', 'Pending', 'Overdue'],
                legend: { position: 'bottom' },
                colors: ['#4caf50', '#ff9800', '#f44336']
              }}
              series={statusSeries.length ? statusSeries : [15, 8, 3]}
              type="donut"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Revenue Trends */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Revenue Trends">
            <Chart
              options={{
                chart: { type: 'line', height: 350 },
                xaxis: {
                  categories: revenueCategories.length ? revenueCategories : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun']
                },
                stroke: { curve: 'smooth', width: 3 },
                dataLabels: { enabled: false },
                legend: { position: 'top' },
                colors: ['#2196f3']
              }}
              series={[
                {
                  name: 'Revenue',
                  data: revenueSeriesData.length ? revenueSeriesData : [45000, 48000, 42000, 51000, 47000, 49000]
                }
              ]}
              type="line"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Invoice Aging Analysis */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="chart"
          skeletonType="chart"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Invoice Aging Analysis">
            <Chart
              options={{
                chart: { type: 'bar', height: 350 },
                xaxis: {
                  categories: agingLabels.length ? agingLabels : ['Current', '31-60 Days', '61-90 Days', 'Over 90 Days']
                },
                plotOptions: {
                  bar: { horizontal: false }
                },
                dataLabels: { enabled: false },
                colors: ['#2196f3', '#ff9800', '#f44336', '#9c27b0']
              }}
              series={[
                {
                  name: 'Amount',
                  data: agingSeries.length ? agingSeries : [45000, 15000, 8000, 5000]
                }
              ]}
              type="bar"
              height={350}
            />
          </MainCard>
        </AllyviaEmpty>
      </Grid>

      {/* Recent Invoices */}
      <Grid size={{ xs: 12, md: 6 }}>
        <AllyviaEmpty
          isLoading={loading}
          isEmpty={false}
          type="list"
          skeletonType="list"
          height={0}
          width="100%"
          sx={{ p: 0, height: 'auto' }}
        >
          <MainCard title="Recent Invoices">
            <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
              {recentInvoices.length > 0 ? (
                recentInvoices.map((invoice: any, index: number) => (
                  <div
                    key={invoice.id || index}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 0',
                      borderBottom: index < recentInvoices.length - 1 ? '1px solid #e0e0e0' : 'none'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 'medium', fontSize: '14px' }}>
                        {invoice.customer_name || invoice.customer || `Invoice ${invoice.doc_number || index + 1}`}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>Due: {invoice.due_date || '—'}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 'bold', color: '#2196f3' }}>{fmtMoney(invoice.total_amount || invoice.amount || 0)}</div>
                      <div style={{ fontSize: '12px', color: '#666' }}>{invoice.status || 'Pending'}</div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', color: '#666', padding: '20px' }}>No invoice data available</div>
              )}
            </div>
          </MainCard>
        </AllyviaEmpty>
      </Grid>
    </Grid>
  );
};

export default InvoiceAnalytics;
