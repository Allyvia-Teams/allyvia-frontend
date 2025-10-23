import React from 'react';
import { Grid, Card, CardContent, Typography, useTheme } from '@mui/material';
import Chart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import { CRMAnalyticsPipelineResponse, CRMAnalyticsForecastPoint } from 'types/analytics';
import ChartErrorBoundary from './ChartErrorBoundary';
import useConfig from 'hooks/useConfig';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface CRMAnalyticsPrimaryChartsProps {
  pipelineData?: CRMAnalyticsPipelineResponse;
  forecastData?: CRMAnalyticsForecastPoint[];
  isLoading: boolean;
  pipelineLoading?: boolean;
  overviewLoading?: boolean;
}

const CRMAnalyticsPrimaryCharts: React.FC<CRMAnalyticsPrimaryChartsProps> = ({
  pipelineData,
  forecastData,
  isLoading,
  pipelineLoading,
  overviewLoading
}) => {
  const theme = useTheme();
  const { mode, presetColor } = useConfig();

  // Debug logging
  React.useEffect(() => {
    console.log('🔍 CRM Primary Charts Debug:', {
      pipelineData: pipelineData
        ? {
            stages: pipelineData.stages?.length || 0,
            isLoading: pipelineData.isLoading,
            data: pipelineData.stages
          }
        : '❌ Missing',
      forecastData: forecastData
        ? {
            length: forecastData.length,
            data: forecastData
          }
        : '❌ Missing',
      isLoading,
      pipelineLoading,
      overviewLoading,
      // Additional loading state analysis
      pipelineIsLoading: Boolean(pipelineLoading || isLoading),
      forecastIsLoading: Boolean(overviewLoading || isLoading),
      pipelineIsEmpty: !pipelineData?.stages || pipelineData.stages.length === 0,
      forecastIsEmpty: !forecastData || forecastData.length === 0
    });
    // Explicit logs for API responses powering the two charts
    if (pipelineData) {
      console.log('📊 Pipeline by Stage API response:', pipelineData);
    } else {
      console.log('📊 Pipeline by Stage API response: MISSING');
    }
    if (forecastData) {
      console.log('📈 Forecast Curve API response (forecast_weighted):', forecastData);
    } else {
      console.log('📈 Forecast Curve API response: MISSING');
    }
  }, [pipelineData, forecastData, isLoading, pipelineLoading, overviewLoading]);

  // Compact currency formatter (e.g., $2.5M, $250K)
  const formatCurrencyCompact = (val: number | string) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      notation: 'compact',
      maximumFractionDigits: 1
    }).format(typeof val === 'string' ? parseFloat(val) || 0 : val || 0);

  // Color palettes
  const pipelineColors = ['#1976d2'];
  const forecastColors = ['#2e7d32', '#66bb6a'];

  // We'll render cards consistently and use AllyviaEmpty inside to handle loading/empty

  // Pipeline by Stage Chart Options (vertical bars with vertical labels)
  const stageNames =
    pipelineData?.stages && Array.isArray(pipelineData.stages) && pipelineData.stages.length > 0
      ? pipelineData.stages.map((stage) => stage?.stage || 'Unknown')
      : [];

  // Prepare series data; if all values are zero but counts exist, fall back to counts
  const valueData = stageNames.length && pipelineData?.stages ? pipelineData.stages.map((stage) => Number(stage?.value) || 0) : [];
  const countData = stageNames.length && pipelineData?.stages ? pipelineData.stages.map((stage) => Number(stage?.count) || 0) : [];
  const totalValue = valueData.reduce((s, v) => s + v, 0);
  const totalCount = countData.reduce((s, v) => s + v, 0);
  const useCounts = stageNames.length > 0 && totalValue === 0 && totalCount > 0;

  const pipelineOptions: ApexOptions = {
    chart: {
      type: 'bar',
      height: 400,
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
    dataLabels: useCounts
      ? { enabled: false }
      : {
          enabled: true,
          formatter: function (val: number) {
            return formatCurrencyCompact(val);
          },
          style: {
            fontSize: '12px',
            colors: ['#fff']
          }
        },
    xaxis: {
      type: 'category',
      categories: stageNames,
      title: {
        text: 'Pipeline Stages'
      },
      labels: {
        rotate: -90,
        trim: true
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => (useCounts ? String(Math.round(val)) : formatCurrencyCompact(val))
      }
    },
    tooltip: {
      shared: true,
      intersect: false,
      theme: mode,
      custom: function ({ series, seriesIndex, dataPointIndex, w }) {
        const stage = pipelineData?.stages[dataPointIndex];
        if (!stage) return '';

        const valueLine = `Value: ${formatCurrencyCompact(stage.value)}`;
        const countLine = `Deals: ${stage.count}`;

        return `
          <div style="padding: 10px; background: white; border: 1px solid #ccc; border-radius: 4px;">
            <strong>${stage.stage}</strong><br/>
            ${useCounts ? countLine : valueLine}<br/>
            Median Age: ${stage.median_age_days} days
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

  // Forecast Curve Chart Options
  const forecastOptions: ApexOptions = {
    chart: {
      type: 'line',
      height: 400,
      toolbar: { show: true },
      zoom: { enabled: false }
    },
    stroke: {
      curve: 'smooth',
      width: 3
    },
    xaxis: {
      type: 'datetime',
      title: {
        text: 'Week'
      }
    },
    yaxis: {
      labels: {
        formatter: (val: number) => formatCurrencyCompact(val)
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
            Weighted Pipeline: ${formatCurrencyCompact(point.weighted)}<br/>
            Won: ${formatCurrencyCompact(point.won)}
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
      name: useCounts ? 'Deal Count' : 'Total Value',
      data: useCounts ? countData : valueData
    }
  ];

  const forecastSeries = [
    {
      name: 'Weighted Pipeline',
      data:
        forecastData && Array.isArray(forecastData) && forecastData.length > 0
          ? forecastData.map((point) => {
              try {
                const date = new Date(point.week);
                return [date.getTime(), Number(point.weighted) || 0];
              } catch (error) {
                console.warn('Invalid date in forecast data:', point.week);
                return [new Date().getTime(), 0];
              }
            })
          : [[new Date().getTime(), 0]]
    },
    {
      name: 'Won',
      data:
        forecastData && Array.isArray(forecastData) && forecastData.length > 0
          ? forecastData.map((point) => {
              try {
                const date = new Date(point.week);
                return [date.getTime(), Number(point.won) || 0];
              } catch (error) {
                console.warn('Invalid date in forecast data:', point.week);
                return [new Date().getTime(), 0];
              }
            })
          : [[new Date().getTime(), 0]]
    }
  ];

  return (
    <Grid container spacing={3}>
      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Pipeline by Stage
            </Typography>
            <AllyviaEmpty
              isLoading={Boolean(pipelineLoading || isLoading)}
              isEmpty={!pipelineData?.stages || pipelineData.stages.length === 0}
              type="chart"
              height={400}
            >
              <ChartErrorBoundary>
                <Chart options={pipelineOptions} series={pipelineSeries} type="bar" height={400} />
              </ChartErrorBoundary>
            </AllyviaEmpty>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 6 }}>
        <Card sx={{ border: '1px solid', borderColor: 'divider' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Forecast Curve
            </Typography>
            <AllyviaEmpty
              isLoading={Boolean(overviewLoading || isLoading)}
              isEmpty={!forecastData || forecastData.length === 0}
              type="chart"
              height={400}
            >
              <ChartErrorBoundary>
                <Chart options={forecastOptions} series={forecastSeries} type="line" height={400} />
              </ChartErrorBoundary>
            </AllyviaEmpty>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

export default CRMAnalyticsPrimaryCharts;
