import React from 'react';
import { Card, CardContent, Typography, Grid, Skeleton, Table, TableHead, TableRow, TableCell, TableBody, Box } from '@mui/material';
import { CRMRepPerformanceResponse } from 'types/analytics';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface Props {
  data?: CRMRepPerformanceResponse;
  isLoading: boolean;
}

const formatCompactCurrency = (val: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', notation: 'compact', maximumFractionDigits: 1 }).format(
    typeof val === 'string' ? Number(val) || 0 : val || 0
  );

const CRMRepPerformance: React.FC<Props> = ({ data, isLoading }) => {
  const owners = data?.owners || [];
  const leaderboard = data?.leaderboard || [];

  const revenueByOwner = data?.charts?.revenue_by_owner || [];
  const wonLostByOwner = data?.charts?.won_lost_by_owner || [];

  const revenueOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 4,
        dataLabels: { position: 'top' }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: (val: number) => formatCompactCurrency(val),
      style: { fontSize: '12px', colors: ['#fff'] }
    },
    xaxis: {
      type: 'category',
      categories: revenueByOwner.map((r) => r.owner),
      labels: { rotate: -45, trim: true }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatCompactCurrency(val)
      }
    },
    fill: { type: 'solid' },
    colors: ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1'],
    legend: {
      show: true,
      fontFamily: 'Roboto, sans-serif',
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false
      },
      markers: {
        size: 8,
        shape: 'square'
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    grid: { show: true }
  };

  const revenueSeries = [
    {
      name: 'Revenue',
      data: revenueByOwner.map((r) => Number(r.revenue) || 0)
    }
  ];

  const wonLostOptions: ApexOptions = {
    chart: {
      type: 'bar',
      stacked: true,
      height: 300,
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
        borderRadius: 4
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories: wonLostByOwner.map((r) => r.owner),
      labels: { rotate: -45, trim: true }
    },
    yaxis: {
      labels: { formatter: (val: number) => String(Math.round(val)) }
    },
    fill: { type: 'solid' },
    colors: ['#1976d2', '#dc004e', '#9c27b0', '#2e7d32', '#ed6c02', '#0288d1'],
    legend: {
      show: true,
      fontFamily: 'Roboto, sans-serif',
      position: 'bottom',
      offsetX: 20,
      labels: {
        useSeriesColors: false
      },
      markers: {
        size: 8,
        shape: 'square'
      },
      itemMargin: {
        horizontal: 15,
        vertical: 8
      }
    },
    grid: { show: true }
  };

  const wonLostSeries = [
    { name: 'Won', data: wonLostByOwner.map((r) => Number(r.won) || 0) },
    { name: 'Lost', data: wonLostByOwner.map((r) => Number(r.lost) || 0) }
  ];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rep Performance Leaderboard (API)
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={260} />
            ) : leaderboard.length ? (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Owner</TableCell>
                    <TableCell align="right">Won Deals</TableCell>
                    <TableCell align="right">Lost Deals</TableCell>
                    <TableCell align="right">Win Rate</TableCell>
                    <TableCell align="right">Won Revenue</TableCell>
                    <TableCell align="right">Activities</TableCell>
                    <TableCell align="right">Completed Tasks</TableCell>
                    <TableCell align="right">Notes</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {leaderboard.map((row) => (
                    <TableRow key={row.owner}>
                      <TableCell>{row.owner}</TableCell>
                      <TableCell align="right">{row.won_deals}</TableCell>
                      <TableCell align="right">{row.lost_deals}</TableCell>
                      <TableCell align="right">{`${(row.win_rate_pct ?? 0).toFixed(1)}%`}</TableCell>
                      <TableCell align="right">{formatCompactCurrency(row.won_revenue)}</TableCell>
                      <TableCell align="right">{row.activities ?? 0}</TableCell>
                      <TableCell align="right">{row.completed_tasks ?? 0}</TableCell>
                      <TableCell align="right">{row.notes_created ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <Box sx={{ height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>No data</Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Revenue by Owner
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Chart options={revenueOptions} series={revenueSeries} type="bar" height={300} />
            )}
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Won vs Lost by Owner
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : (
              <Chart options={wonLostOptions} series={wonLostSeries} type="bar" height={300} />
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CRMRepPerformance;
