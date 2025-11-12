import { useState, useRef, useEffect } from 'react';
import { Box } from '@mui/material';
import { IconCloud } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'store';
import { setWeatherInsightDays } from 'store/slices/analytics';
import BaseInsightCard from 'ui-component/insights/BaseInsightCard';
import { WeatherInsight } from 'types/analytics';
import ControlsBar from './weather/ControlsBar';
import MetadataBanner from './weather/MetadataBanner';
import SummarySection from './weather/SummarySection';
import AlertsPanel from './weather/AlertsPanel';
import PrioritiesPanel from './weather/PrioritiesPanel';
import DailyDetailsSection from './weather/DailyDetailsSection';
import AllyviaEmpty from 'ui-component/common/AllyviaEmpty';

interface WeatherForecastCardProps {
  data: WeatherInsight;
  onRefresh: (days: number, forceRefresh: boolean) => void;
  loading?: boolean;
}

export default function WeatherForecastCard({ data, onRefresh, loading = false }: WeatherForecastCardProps) {
  const dispatch = useDispatch();
  const weatherInsightInput = useSelector((state) => state.analytics.weatherInsightInput);

  const [selectedDayTab, setSelectedDayTab] = useState<number>(0);
  const [expandedHourBlock, setExpandedHourBlock] = useState<string | null>(null);
  const [highlightedBlock, setHighlightedBlock] = useState<string | null>(null);
  const [scrollToBlock, setScrollToBlock] = useState<string | null>(null);

  const dailyDetailsRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSelectedDayTab(0);
    setExpandedHourBlock(null);
    setHighlightedBlock(null);
    setScrollToBlock(null);
  }, [data?.forecast_days, data?.insights?.daily_insights?.length]);

  const handleDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;

    if (inputValue === '' || inputValue.trim() === '') {
      dispatch(setWeatherInsightDays(NaN));
      return;
    }

    const value = parseInt(inputValue, 10);
    dispatch(setWeatherInsightDays(value));
  };

  const handleGenerate = () => {
    if (!weatherInsightInput.isError && weatherInsightInput.value >= 1 && weatherInsightInput.value <= 14) {
      onRefresh(weatherInsightInput.value, false);
    }
  };

  const handleForceRefresh = () => {
    if (!weatherInsightInput.isError && weatherInsightInput.value >= 1 && weatherInsightInput.value <= 14) {
      onRefresh(weatherInsightInput.value, true);
    }
  };

  const getUrgency = (level: string | undefined): 'URGENT' | 'WARNING' | 'INFO' => {
    switch (level) {
      case 'critical':
        return 'URGENT';
      case 'high':
        return 'WARNING';
      case 'medium':
      case 'low':
      default:
        return 'INFO';
    }
  };

  const handleAlertClick = (alert: any) => {
    const dayIndex = data?.insights?.daily_insights?.findIndex((day: any) => day.date === alert.date) ?? -1;

    if (dayIndex !== -1) {
      setSelectedDayTab(dayIndex);
      setExpandedHourBlock(alert.time_block);
      setHighlightedBlock(alert.time_block);
      setTimeout(() => setHighlightedBlock(null), 2000);

      setTimeout(() => {
        setScrollToBlock(alert.time_block);
        setTimeout(() => setScrollToBlock(null), 100);
      }, 300);
    }
  };
  return (
    <BaseInsightCard
      title="Weather Business Insights"
      urgency={getUrgency(data?.action_priority?.level)}
      customIcon={IconCloud}
      priorityDetails={{
        requires_immediate_action: data?.action_priority?.requires_immediate_action ?? false,
        high_impact_periods: data?.action_priority?.high_impact_periods ?? 0,
        days_until_critical: data?.action_priority?.days_until_critical ?? null,
        critical_periods: data?.action_priority?.critical_periods ?? []
      }}
    >
      <ControlsBar
        days={weatherInsightInput.value}
        daysError={weatherInsightInput.error}
        isError={weatherInsightInput.isError}
        loading={loading}
        onDaysChange={handleDaysChange}
        onGenerate={handleGenerate}
        onForceRefresh={handleForceRefresh}
      />

      <MetadataBanner data={data} loading={loading} />

      <SummarySection overview={data?.insights?.overview || ''} loading={loading} />

      {loading ? (
        <Box sx={{ mb: 3 }}>
          <AllyviaEmpty isLoading={true} isEmpty={false} type="list" skeletonType="list" height={300} width="100%" />
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <AlertsPanel alerts={data?.insights?.critical_alerts || []} onAlertClick={handleAlertClick} />
        </Box>
      )}

      {loading ? (
        <Box sx={{ mb: 3 }}>
          <AllyviaEmpty isLoading={true} isEmpty={false} type="list" skeletonType="list" height={300} width="100%" />
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <PrioritiesPanel priorities={data?.insights?.week_priorities || []} />
        </Box>
      )}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <AllyviaEmpty isLoading={true} isEmpty={false} type="card" skeletonType="rectangular" height={400} width="100%" />
        </Box>
      ) : (
        data?.insights?.daily_insights &&
        data.insights.daily_insights.length > 0 && (
          <DailyDetailsSection
            dailyInsights={data.insights.daily_insights}
            selectedDay={selectedDayTab}
            onSelectDay={setSelectedDayTab}
            expandedHourBlock={expandedHourBlock}
            setExpandedHourBlock={setExpandedHourBlock}
            highlightedBlock={highlightedBlock}
            dailyDetailsRef={dailyDetailsRef}
            scrollToBlock={scrollToBlock}
          />
        )
      )}
    </BaseInsightCard>
  );
}
