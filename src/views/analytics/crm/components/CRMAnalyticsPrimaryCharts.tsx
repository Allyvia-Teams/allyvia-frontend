import React, { useEffect, useState } from 'react';
import { Grid, Card, CardContent, Typography, Box, Skeleton, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { CRMAnalyticsPipelineResponse, CRMAnalyticsForecastPoint } from 'types/analytics';
import ChartErrorBoundary from './ChartErrorBoundary';
import useConfig from 'hooks/useConfig';
import { getChartTypeColors } from 'styles/chartColors';

interface CRMAnalyticsPrimaryChartsProps {
  pipelineData?: CRMAnalyticsPipelineResponse;
  forecastData?: CRMAnalyticsForecastPoint[];
  isLoading: boolean;
}

const CRMAnalyticsPrimaryCharts: React.FC<CRMAnalyticsPrimaryChartsProps> = ({ pipelineData, forecastData, isLoading }) => {
  const theme = useTheme();
  const { mode, presetColor } = useConfig();

  // Get chart colors based on current theme
  const pipelineColors = getChartTypeColors(presetColor, 'pipeline');
  const forecastColors = getChartTypeColors(presetColor, 'forecast');

  // Early return if loading or no data
  if (isLoading || (!pipelineData && !forecastData)) {
    return (
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline by Stage
              </Typography>
              <Skeleton variant="rectangular" height={400} />
            </CardContent>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Forecast Curve
              </Typography>
              <Skeleton variant="rectangular" height={400} />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
  }

  // Pipeline by Stage Chart Options
  const pipelineOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 400,
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
      formatter: function (val: number, opts: any) {
        const seriesIndex = opts.seriesIndex;
        const dataPointIndex = opts.dataPointIndex;
        const stage = pipelineData?.stages[dataPointIndex];

        if (seriesIndex === 0) {
          return `${stage?.count || 0} deals`;
        } else {
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
          }).format(stage?.value || 0);
        }
      },
      style: {
        fontSize: '12px',
        colors: ['#fff']
      }
    },
    xaxis: {
      categories:
        pipelineData?.stages && Array.isArray(pipelineData.stages) && pipelineData.stages.length > 0
          ? pipelineData.stages.map((stage) => stage?.stage || 'Unknown')
          : ['No Data'],
      title: {
        text: 'Pipeline Stages'
      }
    },
    yaxis: {
      title: {
        text: 'Value'
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
        const stage = pipelineData?.stages[dataPointIndex];
        if (!stage) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${stage.stage}</strong><br/>
            Deals: ${stage.count}<br/>
            Value: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(stage.value)}<br/>
            Median Age: ${stage.median_age_days} days
          </div>
        `;
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },
    colors: pipelineColors
  };

  // Forecast Curve Chart Options
  const forecastOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 400,
      toolbar: { show: true }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    fill: {
      type: 'gradient',
      gradient: {
        shadeIntensity: 1,
        opacityFrom: 0.7,
        opacityTo: 0.3,
        stops: [0, 90, 100]
      }
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: 'Week'
      }
    },
    yaxis: {
      title: {
        text: 'Value'
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
        const point = forecastData?.[dataPointIndex];
        if (!point) return '';

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>Week: ${point.week}</strong><br/>
            Weighted Pipeline: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(point.weighted)}<br/>
            Won: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD',
              minimumFractionDigits: 0,
              maximumFractionDigits: 0
            }).format(point.won)}
          </div>
        `;
      }
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left'
    },
    colors: forecastColors
  };

  const pipelineSeries = [
    {
      name: 'Deal Count',
      data:
        pipelineData?.stages && Array.isArray(pipelineData.stages) && pipelineData.stages.length > 0
          ? pipelineData.stages.map((stage) => Number(stage?.count) || 0)
          : [0]
    },
    {
      name: 'Total Value',
      data:
        pipelineData?.stages && Array.isArray(pipelineData.stages) && pipelineData.stages.length > 0
          ? pipelineData.stages.map((stage) => Number(stage?.value) || 0)
          : [0]
    }
  ];

  const forecastSeries = [
    {
      name: 'Weighted Pipeline',
      type: 'line',
      data:
        forecastData && Array.isArray(forecastData) && forecastData.length > 0
          ? forecastData.map((point) => [new Date(point.week).getTime(), Number(point.weighted) || 0])
          : [[new Date().getTime(), 0]]
    },
    {
      name: 'Won',
      type: 'area',
      data:
        forecastData && Array.isArray(forecastData) && forecastData.length > 0
          ? forecastData.map((point) => [new Date(point.week).getTime(), Number(point.won) || 0])
          : [[new Date().getTime(), 0]]
    }
  ];

  return (
    <Grid container spacing={3}>
      {/* Pipeline by Stage Chart */}
      {pipelineData && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Pipeline by Stage
              </Typography>
              <ChartErrorBoundary>
                <Chart options={pipelineOptions} series={pipelineSeries} type="bar" height={400} />
              </ChartErrorBoundary>
            </CardContent>
          </Card>
        </Grid>
      )}

      {/* Forecast Curve Chart */}
      {forecastData && (
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Forecast Curve
              </Typography>
              <ChartErrorBoundary>
                <Chart options={forecastOptions} series={forecastSeries} type="line" height={400} />
              </ChartErrorBoundary>
            </CardContent>
          </Card>
        </Grid>
      )}
    </Grid>
  );
};

export default CRMAnalyticsPrimaryCharts;
