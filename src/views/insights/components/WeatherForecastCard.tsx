import { useState, useRef, useEffect } from 'react';
import { Box, Skeleton } from '@mui/material';
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

interface WeatherForecastCardProps {
  data: WeatherInsight;
  onRefresh: (days: number, forceRefresh: boolean) => void;
  loading?: boolean;
}

export default function WeatherForecastCard({ data, onRefresh, loading = false }: WeatherForecastCardProps) {
  const dispatch = useDispatch();
  const reduxDays = useSelector((state) => state.analytics.weatherInsightDays);
  const [daysInput, setDaysInput] = useState<string>('');
  const [daysError, setDaysError] = useState<string>('');
  const [selectedDayTab, setSelectedDayTab] = useState<number>(0);
  const [expandedHourBlock, setExpandedHourBlock] = useState<string | null>(null);
  const [highlightedBlock, setHighlightedBlock] = useState<string | null>(null);
  const [scrollToBlock, setScrollToBlock] = useState<string | null>(null);

  // Refs for smooth scrolling
  const dailyDetailsRef = useRef<HTMLDivElement | null>(null);

  // Sync Redux state with data.forecast_days if it exists and differs
  useEffect(() => {
    if (data?.forecast_days && data.forecast_days !== reduxDays) {
      dispatch(setWeatherInsightDays(data.forecast_days));
    }
  }, [data?.forecast_days, reduxDays, dispatch]);

  // Reset navigation state when data changes (days change or new data loaded)
  useEffect(() => {
    // Reset all navigation-related state when data changes
    setSelectedDayTab(0);
    setExpandedHourBlock(null);
    setHighlightedBlock(null);
    setScrollToBlock(null);
  }, [data?.forecast_days, data?.insights?.daily_insights?.length]);

  const handleDaysChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = event.target.value;
    setDaysInput(inputValue);

    // Validate on change for better UX
    if (inputValue === '') {
      setDaysError('Please enter a number');
      return;
    }

    const value = parseInt(inputValue, 10);
    if (isNaN(value)) {
      setDaysError('Please enter a valid number');
      return;
    }

    if (value < 1 || value > 14) {
      setDaysError('Days must be between 1 and 14');
      return;
    }

    setDaysError('');
  };

  const handleGenerate = () => {
    const days = parseInt(daysInput, 10);
    if (daysError || isNaN(days) || days < 1 || days > 14) {
      return;
    }
    // Only dispatch to Redux when Generate is clicked
    dispatch(setWeatherInsightDays(days));
    onRefresh(days, false);
  };

  const handleForceRefresh = () => {
    const days = parseInt(daysInput, 10);
    if (daysError || isNaN(days) || days < 1 || days > 14) {
      return;
    }
    // Only dispatch to Redux when Force Refresh is clicked
    dispatch(setWeatherInsightDays(days));
    onRefresh(days, true);
  };

  // Map action_priority.level to urgency for BaseInsightCard
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

  // Navigation handler for clicking on alerts
  const handleAlertClick = (alert: any) => {
    // Find the day index for this alert
    const dayIndex = data?.insights?.daily_insights?.findIndex((day: any) => day.date === alert.date) ?? -1;

    if (dayIndex !== -1) {
      // 1. Select the day
      setSelectedDayTab(dayIndex);

      // 2. Expand the specific hour block
      setExpandedHourBlock(alert.time_block);

      // 3. Highlight the block temporarily
      setHighlightedBlock(alert.time_block);
      setTimeout(() => setHighlightedBlock(null), 2000);

      // 4. Trigger scroll to specific accordion block (single scroll)
      // Wait for day selection and accordion expansion
      setTimeout(() => {
        setScrollToBlock(alert.time_block);
        // Clear scrollToBlock after a moment to allow re-triggering
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
      {/* Controls Bar */}
      <ControlsBar
        days={daysInput || reduxDays}
        daysError={daysError}
        loading={loading}
        onDaysChange={handleDaysChange}
        onGenerate={handleGenerate}
        onForceRefresh={handleForceRefresh}
      />

      {/* Metadata Banner */}
      <MetadataBanner data={data} loading={loading} />

      {/* Summary Section */}
      <SummarySection overview={data?.insights?.overview || ''} loading={loading} />

      {/* Critical Alerts Section */}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <AlertsPanel alerts={data?.insights?.critical_alerts || []} onAlertClick={handleAlertClick} />
        </Box>
      )}

      {/* Week Priorities Section */}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
        </Box>
      ) : (
        <Box sx={{ mb: 3 }}>
          <PrioritiesPanel priorities={data?.insights?.week_priorities || []} />
        </Box>
      )}

      {/* Daily Details Section */}
      {loading ? (
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width={150} height={32} sx={{ mb: 2 }} />
          <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} variant="rectangular" width={120} height={100} sx={{ borderRadius: 1, flexShrink: 0 }} />
            ))}
          </Box>
          <Skeleton variant="rectangular" height={200} sx={{ borderRadius: 1 }} />
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
