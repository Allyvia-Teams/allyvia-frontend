import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, useTheme } from '@mui/material';
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
// Removed chartColors helper; use direct color arrays
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface CRMAnalyticsSecondaryChartsProps {
  conversionData?: CRMAnalyticsConversionResponse;
  sourcesData?: CRMAnalyticsSourcesResponse;
  activitiesData?: CRMAnalyticsActivitiesResponse;
  dealAgingData?: CRMAnalyticsDealAgingResponse;
  repsData?: CRMAnalyticsRepsResponse;
  kpis?: CRMAnalyticsKPIs;
  isLoading: boolean;
  section?: 'performance' | 'leads' | 'activity';
  conversionLoading?: boolean;
  sourcesLoading?: boolean;
  activitiesLoading?: boolean;
  dealAgingLoading?: boolean;
  repsLoading?: boolean;
}

const CRMAnalyticsSecondaryCharts: React.FC<CRMAnalyticsSecondaryChartsProps> = ({
  conversionData,
  sourcesData,
  activitiesData,
  dealAgingData,
  repsData,
  kpis,
  isLoading,
  section
}) => {
  const theme = useTheme();
  const { mode, presetColor } = useConfig();

  // Get chart colors based on current theme and section
  const getSectionTheme = (section: string) => {
    switch (section) {
      case 'performance':
        return 'blue'; // Blue theme for performance charts
      case 'leads':
        return 'green'; // Green theme for lead quality charts
      case 'activity':
        return 'purple'; // Purple theme for activity charts
      default:
        return presetColor;
    }
  };

  const sectionTheme = getSectionTheme(section || 'default');
  const conversionColors = ['#5e35b1'];
  const sourcesColors = ['#00897b', '#26a69a', '#4db6ac'];
  const activitiesColors = ['#1976d2'];
  const heatmapColors = ['#90caf9'];
  const repsColors = ['#ef6c00'];

  // We'll consistently render cards and let AllyviaEmpty manage loading/empty

  // Conversion Waterfall Chart Options
  const conversionOptions: ApexOptions = {
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
      type: 'category',
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
    grid: { show: true },
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
    }
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
            Conversion Rate: ${source.conversion_rate.toFixed(1)}%<br/>
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
      show: false
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
      toolbar: { show: false },
      zoom: { enabled: false }
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '50%',
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
      type: 'category',
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

  // Rep Performance Chart Options (vertical bars with rep names on X)
  const repsOptions: ApexOptions = {
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
        dataLabels: {
          position: 'top'
        }
      }
    },
    dataLabels: { enabled: false },
    xaxis: {
      type: 'category',
      categories:
        repsData?.reps && Array.isArray(repsData.reps) && repsData.reps.length > 0
          ? repsData.reps.map((rep) => rep?.owner || 'Unknown')
          : ['No Data'],
      labels: {
        rotate: -45,
        trim: true
      }
    },
    yaxis: {
      labels: {
        formatter: function (val: number) {
          if (val === undefined || val === null || isNaN(val)) return '$0';
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            notation: 'compact',
            maximumFractionDigits: 1
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

        const wonRevenue = rep.won_revenue !== undefined && !isNaN(rep.won_revenue) ? rep.won_revenue : 0;
        const pipelineValue = rep.pipeline_value !== undefined && !isNaN(rep.pipeline_value) ? rep.pipeline_value : 0;
        const dealsCount = rep.deals_count !== undefined && !isNaN(rep.deals_count) ? rep.deals_count : 0;
        const avgDealSize = rep.avg_deal_size !== undefined && !isNaN(rep.avg_deal_size) ? rep.avg_deal_size : 0;
        const velocity = rep.velocity !== undefined && !isNaN(rep.velocity) ? rep.velocity : 0;

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${rep.owner || 'Unknown'}</strong><br/>
            Won Revenue: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(wonRevenue)}<br/>
            Pipeline Value: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(pipelineValue)}<br/>
            Deals Count: ${dealsCount}<br/>
            Avg Deal Size: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(avgDealSize)}<br/>
            Velocity: ${velocity.toFixed(2)}
          </div>
        `;
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

  const repsSeries = [
    {
      name: 'Revenue Won',
      data:
        repsData?.reps && Array.isArray(repsData.reps) && repsData.reps.length > 0
          ? repsData.reps.map((rep) => {
              const value = rep?.won_revenue;
              if (value === undefined || value === null || isNaN(Number(value))) {
                return 0;
              }
              return Number(value);
            })
          : [0]
    }
  ];

  // SLA removed per product decision (no formal SLA defined yet)

  const getSectionCharts = () => {
    switch (section) {
      case 'performance':
        return (
          <Grid container spacing={3}>
            {/* Conversion Waterfall */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Conversion Waterfall
                  </Typography>
                  <AllyviaEmpty
                    isLoading={Boolean(conversionLoading ?? isLoading)}
                    isEmpty={!conversionData || !conversionData.stages?.length}
                    type="chart"
                    height={350}
                  >
                    <ChartErrorBoundary>
                      <Chart options={conversionOptions} series={conversionSeries} type="bar" height={350} />
                    </ChartErrorBoundary>
                  </AllyviaEmpty>
                </CardContent>
              </Card>
            </Grid>

            {/* Rep Performance Leaderboard */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Rep Performance Leaderboard
                  </Typography>
                  <AllyviaEmpty
                    isLoading={Boolean(repsLoading ?? isLoading)}
                    isEmpty={!repsData || !repsData.reps?.length}
                    type="chart"
                    height={350}
                  >
                    <ChartErrorBoundary>
                      <Chart options={repsOptions} series={repsSeries} type="bar" height={350} />
                    </ChartErrorBoundary>
                  </AllyviaEmpty>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      case 'leads':
        return (
          <Grid container spacing={3}>
            {/* Lead Sources Breakdown */}
            <Grid size={{ xs: 12 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Lead Sources Breakdown
                  </Typography>
                  <AllyviaEmpty
                    isLoading={Boolean(sourcesLoading ?? isLoading)}
                    isEmpty={!sourcesData || !sourcesData.sources?.length}
                    type="chart"
                    height={350}
                  >
                    <ChartErrorBoundary>
                      <Chart options={sourcesOptions} series={sourcesSeries} type="donut" height={350} />
                    </ChartErrorBoundary>
                  </AllyviaEmpty>
                </CardContent>
              </Card>
            </Grid>

            {/* (Removed) SLA gauge placeholder intentionally omitted */}
          </Grid>
        );
      case 'activity':
        return (
          <Grid container spacing={3}>
            {/* Activity Mix by Week */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Activity Mix by Week
                  </Typography>
                  <AllyviaEmpty
                    isLoading={Boolean(activitiesLoading ?? isLoading)}
                    isEmpty={!activitiesData || !activitiesData.buckets?.length}
                    type="chart"
                    height={350}
                  >
                    <ChartErrorBoundary>
                      <Chart options={activitiesOptions} series={activitiesSeries} type="bar" height={350} />
                    </ChartErrorBoundary>
                  </AllyviaEmpty>
                </CardContent>
              </Card>
            </Grid>

            {/* Deal Aging Heatmap */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Deal Aging Heatmap
                  </Typography>
                  <AllyviaEmpty
                    isLoading={Boolean(dealAgingLoading ?? isLoading)}
                    isEmpty={!dealAgingData || !dealAgingData.matrix?.length}
                    type="chart"
                    height={350}
                  >
                    <ChartErrorBoundary>
                      <Chart options={dealAgingOptions} series={dealAgingSeries} type="heatmap" height={350} />
                    </ChartErrorBoundary>
                  </AllyviaEmpty>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        );
      default:
        return null;
    }
  };

  return getSectionCharts();
};

export default CRMAnalyticsSecondaryCharts;
