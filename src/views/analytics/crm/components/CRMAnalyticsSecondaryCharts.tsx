import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import {
  CRMAnalyticsConversionResponse,
  CRMAnalyticsSourcesResponse,
  CRMAnalyticsActivitiesResponse,
  CRMAnalyticsDealAgingResponse,
  CRMAnalyticsRepsResponse,
  CRMAnalyticsKPIs
} from 'types/analytics';
import ChartErrorBoundary from './ChartErrorBoundary';
import useConfig from 'hooks/useConfig';
import { getChartTypeColors } from 'styles/chartColors';

interface CRMAnalyticsSecondaryChartsProps {
  conversionData?: CRMAnalyticsConversionResponse;
  sourcesData?: CRMAnalyticsSourcesResponse;
  activitiesData?: CRMAnalyticsActivitiesResponse;
  dealAgingData?: CRMAnalyticsDealAgingResponse;
  repsData?: CRMAnalyticsRepsResponse;
  kpis?: CRMAnalyticsKPIs;
  isLoading: boolean;
}

const CRMAnalyticsSecondaryCharts: React.FC<CRMAnalyticsSecondaryChartsProps> = ({
  conversionData,
  sourcesData,
  activitiesData,
  dealAgingData,
  repsData,
  kpis,
  isLoading
}) => {
  const theme = useTheme();
  const { mode, presetColor } = useConfig();

  // Get chart colors based on current theme
  const conversionColors = getChartTypeColors(presetColor, 'conversion');
  const sourcesColors = getChartTypeColors(presetColor, 'sources');
  const activitiesColors = getChartTypeColors(presetColor, 'activities');
  const heatmapColors = getChartTypeColors(presetColor, 'heatmap');
  const repsColors = getChartTypeColors(presetColor, 'reps');

  // Early return if loading or no data
  if (isLoading || (!conversionData && !sourcesData && !activitiesData && !dealAgingData && !repsData)) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid size={{ xs: 12, md: 6 }} key={index}>
            <Card>
              <CardContent>
                <Skeleton variant="rectangular" height={300} />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // Conversion Waterfall Chart Options
  const conversionOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toString();
      },
      style: {
        fontSize: '12px',
        colors: ['#fff']
      }
    },
    xaxis: {
      categories:
        conversionData?.stages && Array.isArray(conversionData.stages) && conversionData.stages.length > 0
          ? conversionData.stages.map((step) => step?.name || 'Unknown')
          : ['No Data'],
      title: {
        text: 'Conversion Stages'
      }
    },
    yaxis: {
      title: {
        text: 'Count'
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const step = conversionData?.stages[dataPointIndex];
        if (!step) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${step.name}</strong><br/>
            Count: ${step.count}
          </div>
        `;
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },
    colors: conversionColors
  };

  const conversionSeries = [
    {
      name: 'Leads',
      data:
        conversionData?.stages && Array.isArray(conversionData.stages) && conversionData.stages.length > 0
          ? conversionData.stages.map((step) => Number(step?.count) || 0)
          : [0]
    }
  ];

  // Lead Sources Chart Options
  const sourcesOptions: ApexOptions = {
    chart: {
      type: 'donut',
      height: 300,
      toolbar: { show: true }
    },
    labels:
      sourcesData?.sources && Array.isArray(sourcesData.sources) && sourcesData.sources.length > 0
        ? sourcesData.sources.map((source) => source?.source || 'Unknown')
        : ['No Data'],
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toFixed(1) + '%';
      }
    },
    tooltip: {
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const source = sourcesData?.sources[dataPointIndex];
        if (!source) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${source.source}</strong><br/>
            Leads: ${source.leads}<br/>
            Deals: ${source.deals}<br/>
            Won: ${source.won}<br/>
            Revenue: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(source.revenue)}
          </div>
        `;
      }
    },
    legend: {
      position: 'bottom'
    },
    colors: sourcesColors
  };

  const sourcesSeries =
    sourcesData?.sources && Array.isArray(sourcesData.sources) && sourcesData.sources.length > 0
      ? sourcesData.sources.map((source) => Number(source?.leads) || 0)
      : [0];

  // Activities Chart Options
  const activitiesOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return val.toString();
      },
      style: {
        fontSize: '12px',
        colors: ['#fff']
      }
    },
    xaxis: {
      categories:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity) => activity?.period || 'Unknown')
          : ['No Data'],
      title: {
        text: 'Period'
      }
    },
    yaxis: {
      title: {
        text: 'Count'
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const activity = activitiesData?.buckets[dataPointIndex];
        if (!activity) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${activity.period}</strong><br/>
            Calls: ${activity.call}<br/>
            Emails: ${activity.email}<br/>
            Meetings: ${activity.meeting}<br/>
            Demos: ${activity.demo}<br/>
            Proposals: ${activity.proposal}
          </div>
        `;
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },
    colors: activitiesColors
  };

  const activitiesSeries = [
    {
      name: 'Calls',
      data:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity: any) => Number(activity?.call) || 0)
          : [0]
    },
    {
      name: 'Emails',
      data:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity: any) => Number(activity?.email) || 0)
          : [0]
    },
    {
      name: 'Meetings',
      data:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity: any) => Number(activity?.meeting) || 0)
          : [0]
    },
    {
      name: 'Demos',
      data:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity: any) => Number(activity?.demo) || 0)
          : [0]
    },
    {
      name: 'Other',
      data:
        activitiesData?.buckets && Array.isArray(activitiesData.buckets) && activitiesData.buckets.length > 0
          ? activitiesData.buckets.map((activity: any) => Number(activity?.other) || 0)
          : [0]
    }
  ];

  // Deal Aging Heatmap
  const createHeatmapMatrix = () => {
    if (!dealAgingData?.matrix || !Array.isArray(dealAgingData.matrix) || dealAgingData.matrix.length === 0) {
      return { matrix: [[0]], stages: ['No Data'], ageBuckets: ['No Data'] };
    }

    const stages = [...new Set(dealAgingData.matrix?.map((cell) => cell?.stage || 'Unknown') || [])];
    const ageBuckets = [...new Set(dealAgingData.matrix?.map((cell) => cell?.age_bucket || 'Unknown') || [])].sort();

    const matrix: number[][] = [];
    stages.forEach((stage) => {
      const row: number[] = [];
      ageBuckets.forEach((bucket) => {
        const cell = dealAgingData.matrix.find((c) => c.stage === stage && c.age_bucket === bucket);
        row.push(cell ? cell.count : 0);
      });
      matrix.push(row);
    });

    return { matrix, stages, ageBuckets };
  };

  const { matrix: heatmapMatrix, stages, ageBuckets } = createHeatmapMatrix();
  const maxCount = Math.max(...(dealAgingData?.matrix?.map((cell) => Number(cell?.count) || 0) || [1]));

  // Deal Aging Heatmap Chart Options
  const dealAgingOptions: ApexOptions = {
    chart: {
      type: 'heatmap',
      height: 300,
      toolbar: { show: true }
    },
    dataLabels: {
      enabled: true,
      style: {
        fontSize: '12px',
        colors: ['#fff']
      }
    },
    xaxis: {
      categories: ['0-7 days', '8-14 days', '15-30 days', '30+ days'],
      title: {
        text: 'Age Buckets'
      }
    },
    yaxis: {
      title: {
        text: 'Pipeline Stages'
      }
    },
    tooltip: {
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }: any) {
        const stage = stages[seriesIndex];
        const bucket = ageBuckets[dataPointIndex];
        const cell = dealAgingData?.matrix?.find((c) => c.stage === stage && c.age_bucket === bucket);
        if (!cell) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${cell.stage}</strong><br/>
            Count: ${cell.count}<br/>
            Value: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(cell.value)}
          </div>
        `;
      }
    },
    colors: heatmapColors
  };

  const dealAgingSeries =
    stages && Array.isArray(stages) && stages.length > 0
      ? stages.map((stage, index) => ({
          name: stage,
          data: heatmapMatrix[index] || [0]
        }))
      : [{ name: 'No Data', data: [0] }];

  // Rep Performance Chart Options
  const repsOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 300,
      toolbar: { show: true }
    },
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: {
      enabled: true,
      formatter: function (val: number) {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
          minimumFractionDigits: 0,
          maximumFractionDigits: 0
        }).format(val);
      },
      style: {
        fontSize: '12px',
        colors: ['#fff']
      }
    },
    xaxis: {
      categories:
        repsData?.reps && Array.isArray(repsData.reps) && repsData.reps.length > 0
          ? repsData.reps.map((rep) => rep?.owner || 'Unknown')
          : ['No Data'],
      title: {
        text: 'Sales Reps'
      }
    },
    yaxis: {
      title: {
        text: 'Won Revenue'
      },
      labels: {
        formatter: function (val: number) {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(val);
        }
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const rep = repsData?.reps[dataPointIndex];
        if (!rep) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${rep.owner}</strong><br/>
            Won Revenue: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(rep.won_revenue)}<br/>
            Win Rate: ${rep.win_rate_pct.toFixed(1)}%<br/>
            Activities: ${rep.activities}
          </div>
        `;
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },
    colors: repsColors
  };

  const repsSeries = [
    {
      name: 'Revenue Won',
      data:
        repsData?.reps && Array.isArray(repsData.reps) && repsData.reps.length > 0
          ? repsData.reps.map((rep) => Number(rep?.won_revenue) || 0)
          : [0]
    }
  ];

  // SLA Gauge
  const slaPercentage =
    kpis && kpis.activities_completed > 0
      ? Math.max(0, Math.min(100, ((kpis.activities_completed - (kpis.overdue_tasks || 0)) / kpis.activities_completed) * 100))
      : 0;

  const slaOptions: ApexOptions = {
    chart: {
      type: 'radialBar',
      height: 300
    },
    plotOptions: {
      radialBar: {
        startAngle: -90,
        endAngle: 90,
        dataLabels: {
          name: {
            fontSize: '16px',
            color: undefined,
            offsetY: -10
          },
          value: {
            fontSize: '24px',
            color: undefined,
            offsetY: 16,
            formatter: function (val: number) {
              return `${val !== undefined ? val.toFixed(1) : '0'}%`;
            }
          }
        }
      }
    },
    labels: ['SLA Compliance'],
    colors: [slaPercentage >= 80 ? '#4caf50' : slaPercentage >= 60 ? '#ff9800' : '#f44336']
  };

  const slaSeries = [slaPercentage];

  return (
    <Grid container spacing={3}>
      {/* Conversion Waterfall */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Conversion Waterfall
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : conversionData?.stages?.length ? (
              <Chart options={conversionOptions} series={conversionSeries} type="bar" height={300} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No conversion data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Lead Sources */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Lead Sources Breakdown
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : sourcesData?.sources?.length ? (
              <Chart options={sourcesOptions} series={sourcesSeries} type="donut" height={300} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No sources data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Activity Mix */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Activity Mix by Week
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : activitiesData?.buckets?.length ? (
              <ChartErrorBoundary>
                <Chart options={activitiesOptions} series={activitiesSeries} type="bar" height={300} />
              </ChartErrorBoundary>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No activity data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Deal Aging Heatmap */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Deal Aging Heatmap
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : dealAgingData?.matrix?.length ? (
              <ChartErrorBoundary>
                <Chart options={dealAgingOptions} series={dealAgingSeries} type="heatmap" height={300} />
              </ChartErrorBoundary>
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No deal aging data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* SLA Gauge */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              SLA Compliance
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : kpis ? (
              <Chart options={slaOptions} series={slaSeries} type="radialBar" height={300} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No SLA data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>

      {/* Rep Performance Leaderboard */}
      <Grid size={{ xs: 12, md: 6 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Rep Performance Leaderboard
            </Typography>
            {isLoading ? (
              <Skeleton variant="rectangular" height={300} />
            ) : repsData?.reps?.length ? (
              <Chart options={repsOptions} series={repsSeries} type="bar" height={300} />
            ) : (
              <Box sx={{ height: 300, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Typography color="textSecondary">No rep data available</Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CRMAnalyticsSecondaryCharts;
