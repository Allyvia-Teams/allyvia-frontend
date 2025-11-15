import { useState } from 'react';
import { Box, Typography } from '@mui/material';
import { SelectChangeEvent } from '@mui/material/Select';
import { IconTrendingUp, IconCash, IconCalendar, IconChartLine } from '@tabler/icons-react';
import { CalendarMonth, TrendingUp, AutoAwesome } from '@mui/icons-material';
import BaseInsightCard from 'ui-component/insights/BaseInsightCard';
import AllyviaSubcard from 'ui-component/common/AllyviaSubcard';
import MetricCardsRow from 'ui-component/insights/MetricCardsRow';
import AllyviaFilterSelect from 'ui-component/common/AllyviaFilterSelect';
import AllyviaViewToggle from 'ui-component/common/AllyviaViewToggle';
import { SalesTrendsAnalysis } from 'types/analytics';
import { useDispatch } from 'store';
import { generateSalesTrends } from 'store/slices/analytics';
import HistoricalPatternChart from './HistoricalPatternChart';
import NextWeekForecastTable from './NextWeekForecastTable';

interface SalesTrendsCardProps {
  data: SalesTrendsAnalysis;
}

export default function SalesTrendsCard({ data }: SalesTrendsCardProps) {
  const dispatch = useDispatch();
  const [selectedPeriod, setSelectedPeriod] = useState<string>('all');
  const [selectedView, setSelectedView] = useState<string>('pattern');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const viewOptions = [
    { value: 'pattern', label: 'Weekly Pattern', icon: <CalendarMonth fontSize="small" /> },
    { value: 'forecast', label: 'Forecast', icon: <TrendingUp fontSize="small" /> },
    { value: 'insights', label: 'AI Insights', icon: <AutoAwesome fontSize="small" /> }
  ];

  const handleViewChange = (newView: string) => {
    setSelectedView(newView);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await dispatch(generateSalesTrends());
    setIsRefreshing(false);
  };

  const handlePeriodChange = (event: SelectChangeEvent) => {
    setSelectedPeriod(event.target.value);
  };

  const getFilteredData = (): SalesTrendsAnalysis => {
    if (!data.daily_breakdown) return data;

    const today = new Date();
    let cutoffDate: Date;

    switch (selectedPeriod) {
      case '30':
        cutoffDate = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '60':
        cutoffDate = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
        break;
      case '90':
        cutoffDate = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        return data;
    }

    const filtered = data.daily_breakdown.filter((day) => new Date(day.date) >= cutoffDate);
    const filteredRevenue = filtered.reduce((sum, day) => sum + day.revenue, 0);

    return {
      ...data,
      metrics: data.metrics
        ? {
            ...data.metrics,
            total_revenue: filteredRevenue
          }
        : undefined,
      daily_breakdown: filtered
    } as SalesTrendsAnalysis;
  };

  const generatedTime = new Date(data.updated_at);
  const hoursAgo = Math.floor((Date.now() - generatedTime.getTime()) / (1000 * 60 * 60));
  const timeAgoText = hoursAgo < 1 ? 'just now' : `${hoursAgo}h ago`;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getGrowthLabel = (growth: number) => {
    if (Math.abs(growth) < 1) return 'Steady';
    return growth > 0 ? `+${growth.toFixed(1)}%` : `${growth.toFixed(1)}%`;
  };

  const periodOptions = [
    { value: '30', label: 'Last 30 Days' },
    { value: '60', label: 'Last 60 Days' },
    { value: '90', label: 'Last 90 Days' },
    { value: 'all', label: 'All Time' }
  ];

  const filteredData = getFilteredData();

  return (
    <BaseInsightCard
      title="Sales Forecasting"
      urgency={data.urgency}
      customIcon={IconTrendingUp}
      onRefresh={handleRefresh}
      isRefreshing={isRefreshing}
    >
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2} flexWrap="wrap" gap={2}>
        <Box>
          <AllyviaViewToggle value={selectedView} onChange={handleViewChange} options={viewOptions} size="small" />
        </Box>

        <Box display="flex" gap={1.5} alignItems="center">
          <Typography variant="body2" color="text.secondary">
            View patterns:
          </Typography>
          <AllyviaFilterSelect height={32} width={160} value={selectedPeriod} onChange={handlePeriodChange} options={periodOptions} />
        </Box>
      </Box>

      <MetricCardsRow>
        <AllyviaSubcard
          value={formatCurrency(filteredData.metrics?.total_revenue || 0)}
          label="Total Revenue"
          subtitle={`Last ${selectedPeriod === 'all' ? data.meta?.total_days_available : selectedPeriod} days`}
          icon={<IconCash />}
          height={120}
        />
        <AllyviaSubcard value={data.metrics?.peak_day || 'N/A'} label="Busiest Day" icon={<IconCalendar />} height={120} />
        <AllyviaSubcard
          value={getGrowthLabel(data.metrics?.growth_percentage || 0)}
          label="Growth Trend"
          subtitle="Weekly average"
          icon={<IconChartLine />}
          height={120}
        />
      </MetricCardsRow>

      {selectedView === 'pattern' && data.patterns && <HistoricalPatternChart data={filteredData} selectedPeriod={selectedPeriod} />}

      {selectedView === 'forecast' && data.patterns && (
        <NextWeekForecastTable
          forecast={data.patterns.next_week_forecast}
          meta={data.meta}
          overallConfidence={data.metrics?.confidence_pct}
        />
      )}

      {selectedView === 'insights' && data.llm_insights && (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mt: 3 }}>
          <Typography variant="h3" gutterBottom>
            AI Insights
          </Typography>

          <Typography variant="body2" color="text.secondary" paragraph>
            {data.llm_insights.summary}
          </Typography>

          {data.llm_insights.week_outlook && data.llm_insights.week_outlook.length > 0 && (
            <>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Week Outlook
              </Typography>
              <Box sx={{ pl: 2, mb: 2 }}>
                {data.llm_insights.week_outlook.map((item, idx) => (
                  <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                    • {item}
                  </Typography>
                ))}
              </Box>
            </>
          )}

          {data.llm_insights.inventory_watch && data.llm_insights.inventory_watch.length > 0 && (
            <>
              <Typography variant="h5" gutterBottom sx={{ mt: 2 }}>
                Inventory Watch
              </Typography>
              <Box sx={{ pl: 2, mb: 2 }}>
                {data.llm_insights.inventory_watch.map((item, idx) => (
                  <Typography key={idx} variant="body2" color="text.secondary" gutterBottom>
                    • {item}
                  </Typography>
                ))}
              </Box>
            </>
          )}
        </Box>
      )}

      {selectedView === 'insights' && data.metrics && (
        <Box sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 1, bgcolor: 'background.paper', mt: 3 }}>
          <Typography variant="h3" gutterBottom>
            Forecast Confidence
          </Typography>

          <Box display="flex" alignItems="center" gap={2} mb={2}>
            <Typography variant="h4">{data.metrics.confidence_pct?.toFixed(0) || 0}%</Typography>
            <Typography variant="body2" color="text.secondary">
              Overall Confidence
            </Typography>
          </Box>

          <Typography variant="body2" color="text.secondary" paragraph>
            Based on {data.meta?.total_days_available || 0} days of sales data with{' '}
            {data.metrics.trend_r_squared
              ? `${(data.metrics.trend_r_squared * 100).toFixed(0)}% pattern strength`
              : 'moderate pattern strength'}
            .
          </Typography>
        </Box>
      )}

      <Box display="flex" justifyContent="flex-end" mt={3}>
        <Typography variant="caption" color="text.secondary">
          Updated: {timeAgoText}
        </Typography>
      </Box>
    </BaseInsightCard>
  );
}
