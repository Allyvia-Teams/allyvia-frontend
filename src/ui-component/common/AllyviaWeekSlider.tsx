import React, { useState, useCallback } from 'react';
import { Stack, IconButton, Typography } from '@mui/material';
import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { formatDate } from 'utils/dateUtils';

interface WeekDates {
  start: Date;
  end: Date;
  weekDates: Date[];
}

interface AllyviaWeekSliderProps {
  children: (weekDates: WeekDates) => React.ReactNode;
  initialWeekStart?: Date;
  minDate?: Date;
  maxDate?: Date;
  onWeekChange?: (weekDates: WeekDates) => void;
  disabled?: boolean;
}

const AllyviaWeekSlider: React.FC<AllyviaWeekSliderProps> = ({
  children,
  initialWeekStart,
  minDate,
  maxDate,
  onWeekChange,
  disabled = false
}) => {
  // Initialize with current week or provided start date
  const getInitialWeekStart = useCallback(() => {
    if (initialWeekStart) return initialWeekStart;

    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek); // Start of week (Sunday)
    return weekStart;
  }, [initialWeekStart]);

  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(getInitialWeekStart());

  // Generate week dates array
  const generateWeekDates = useCallback((startDate: Date): Date[] => {
    const dates: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      dates.push(date);
    }
    return dates;
  }, []);

  const weekDates = generateWeekDates(currentWeekStart);
  const weekEnd = new Date(weekDates[6]);

  // Navigation functions
  const goToPreviousWeek = useCallback(() => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() - 7);

    if (!minDate || newWeekStart >= minDate) {
      setCurrentWeekStart(newWeekStart);
      const newWeekDates = generateWeekDates(newWeekStart);
      const newWeekEnd = new Date(newWeekDates[6]);

      onWeekChange?.({
        start: newWeekStart,
        end: newWeekEnd,
        weekDates: newWeekDates
      });
    }
  }, [currentWeekStart, minDate, generateWeekDates, onWeekChange]);

  const goToNextWeek = useCallback(() => {
    const newWeekStart = new Date(currentWeekStart);
    newWeekStart.setDate(currentWeekStart.getDate() + 7);

    if (!maxDate || newWeekStart <= maxDate) {
      setCurrentWeekStart(newWeekStart);
      const newWeekDates = generateWeekDates(newWeekStart);
      const newWeekEnd = new Date(newWeekDates[6]);

      onWeekChange?.({
        start: newWeekStart,
        end: newWeekEnd,
        weekDates: newWeekDates
      });
    }
  }, [currentWeekStart, maxDate, generateWeekDates, onWeekChange]);

  const goToCurrentWeek = useCallback(() => {
    const today = new Date();
    const dayOfWeek = today.getDay();
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - dayOfWeek);

    setCurrentWeekStart(weekStart);
    const newWeekDates = generateWeekDates(weekStart);
    const newWeekEnd = new Date(newWeekDates[6]);

    onWeekChange?.({
      start: weekStart,
      end: newWeekEnd,
      weekDates: newWeekDates
    });
  }, [generateWeekDates, onWeekChange]);

  // Check if navigation is disabled
  const canGoToPreviousWeek = useCallback(() => {
    if (!minDate) return true;
    const prevWeekStart = new Date(currentWeekStart);
    prevWeekStart.setDate(currentWeekStart.getDate() - 7);
    return prevWeekStart >= minDate;
  }, [currentWeekStart, minDate]);

  const canGoToNextWeek = useCallback(() => {
    if (!maxDate) return true;
    const nextWeekStart = new Date(currentWeekStart);
    nextWeekStart.setDate(currentWeekStart.getDate() + 7);
    return nextWeekStart <= maxDate;
  }, [currentWeekStart, maxDate]);

  const currentWeekData: WeekDates = {
    start: currentWeekStart,
    end: weekEnd,
    weekDates
  };

  return (
    <Stack spacing={3}>
      {disabled ? (
        /* Show disabled message instead of slider */
        <Stack direction="row" alignItems="center" justifyContent="center" sx={{ mb: 3 }}>
          <Typography
            variant="h2"
            fontWeight={700}
            color="text.disabled"
            sx={{
              px: 2,
              py: 1,
              borderRadius: 1,
              backgroundColor: 'rgba(0, 0, 0, 0.04)',
              border: '1px dashed rgba(0, 0, 0, 0.12)'
            }}
          >
            Week Navigation Disabled - No Data Available
          </Typography>
        </Stack>
      ) : (
        /* Show normal week navigation slider */
        <Stack direction="row" alignItems="center" justifyContent="center" gap={2} sx={{ mb: 3 }}>
          <IconButton
            onClick={goToPreviousWeek}
            size="small"
            disabled={!canGoToPreviousWeek()}
            sx={{
              color: 'primary.main',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.dark'
              },
              '&:disabled': {
                color: 'text.disabled',
                backgroundColor: 'transparent'
              }
            }}
          >
            <ChevronLeft />
          </IconButton>

          <Typography
            variant="h2"
            fontWeight={700}
            color="black"
            onClick={goToCurrentWeek}
            sx={{
              cursor: 'pointer',
              px: 2,
              py: 1,
              borderRadius: 1,
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.dark'
              }
            }}
          >
            {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
          </Typography>

          <IconButton
            onClick={goToNextWeek}
            size="small"
            disabled={!canGoToNextWeek()}
            sx={{
              color: 'primary.main',
              backgroundColor: 'transparent',
              '&:hover': {
                backgroundColor: 'rgba(25, 118, 210, 0.08)',
                color: 'primary.dark'
              },
              '&:disabled': {
                color: 'text.disabled',
                backgroundColor: 'transparent'
              }
            }}
          >
            <ChevronRight />
          </IconButton>
        </Stack>
      )}

      {/* Render children with week data */}
      {children(currentWeekData)}
    </Stack>
  );
};

export default AllyviaWeekSlider;
