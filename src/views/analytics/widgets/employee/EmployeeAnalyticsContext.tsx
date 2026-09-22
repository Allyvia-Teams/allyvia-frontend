import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AnalyticsAPI } from 'api/analytics.api';
import {
  AnalyticsParams,
  DailyBreakdown,
  EmployeeAllResponse,
  EmployeeDailyResponse,
  EmployeeHeatmapResponse,
  EmployeeOverviewResponse,
  EmployeeSummary
} from 'types/analytics';
import { RangeValue } from 'ui-component/third-party/DateRangePicker';
import { omittedEntryCount, timelineSeries as buildTimelineSeries } from './employeeTimelineView';

type Props = {
  dateRange: RangeValue;
  isLoading: boolean;
  children: React.ReactNode;
};

type TimelineSeries = {
  name: string;
  data: { x: string; y: number[] }[];
};

type EmployeeAnalyticsContextValue = {
  isLoading: boolean;
  error: unknown;
  summary: EmployeeSummary | undefined;
  daily: DailyBreakdown[];
  allEmployees: string[];
  selectedEmployee: string;
  filteredDaily: DailyBreakdown[];
  heatmapQ: ReturnType<typeof useQuery<EmployeeHeatmapResponse>>;
  weekdayOrder: string[];
  anchorEl: HTMLButtonElement | null;
  open: boolean;
  handleClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  handleClose: () => void;
  selectEmployee: (employeeName: string) => void;
  timelineSeries: TimelineSeries[];
  omittedTimelineEntries: number;
  timelineChartConfig: { height: number; barHeight: string; columnWidth: string };
  isFutureEndDateError: boolean;
  setWeekStartISO: (iso: string) => void;
  setWeekEndISO: (iso: string) => void;
};

const EmployeeAnalyticsContext = createContext<EmployeeAnalyticsContextValue | null>(null);

export function useEmployeeAnalytics(): EmployeeAnalyticsContextValue {
  const context = useContext(EmployeeAnalyticsContext);
  if (!context) {
    throw new Error('useEmployeeAnalytics must be used within EmployeeAnalyticsProvider');
  }
  return context;
}

const EmployeeAnalyticsProvider: React.FC<Props> = ({ dateRange, isLoading, children }) => {
  // Convert dateRange to AnalyticsParams
  const params: AnalyticsParams = {
    start_date: dateRange.start?.toString() || '',
    end_date: dateRange.end?.toString() || ''
  };
  const weekdayOrder = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const [selectedEmployee, setSelectedEmployee] = useState<string>('');
  const [weekStartISO, setWeekStartISO] = useState<string | undefined>(undefined);
  const [weekEndISO, setWeekEndISO] = useState<string | undefined>(undefined);
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const overviewQ = useQuery<EmployeeOverviewResponse>({
    queryKey: ['employee-overview', params],
    queryFn: () => AnalyticsAPI.Employee.getOverview(params)
  });

  const allQ = useQuery<EmployeeAllResponse>({
    queryKey: ['employee-all', params],
    queryFn: () => AnalyticsAPI.Employee.getAll(params)
  });
  // Map employee name -> id from employee all response
  const nameToId = useMemo(() => {
    const map: Record<string, string> = {};
    const top = allQ.data?.top_employees || [];
    top.forEach((t) => {
      if (t.employee_name && t.employee_id) map[t.employee_name] = t.employee_id;
    });
    return map;
  }, [allQ.data?.top_employees]);

  const selectedEmployeeId = selectedEmployee ? nameToId[selectedEmployee] : undefined;

  // Daily breakdown refetches on week or employee change
  const dailyQ = useQuery<EmployeeDailyResponse>({
    queryKey: [
      'employee-daily',
      {
        start: weekStartISO || params.start_date,
        end: weekEndISO || params.end_date,
        employee_id: selectedEmployeeId || null
      }
    ],
    queryFn: () =>
      AnalyticsAPI.Employee.getDailyBreakdown({
        start_date: weekStartISO || params.start_date,
        end_date: weekEndISO || params.end_date,
        ...(selectedEmployeeId ? { employee_id: selectedEmployeeId } : {})
      })
  });
  const heatmapQ = useQuery<EmployeeHeatmapResponse>({
    queryKey: ['employee-heatmap', params],
    queryFn: () => AnalyticsAPI.Employee.getHeatmap(params)
  });

  // Gracefully handle specific daily error: end_date cannot be in the future
  const dailyNonFieldErrors: string[] = React.useMemo(() => {
    const e: any = dailyQ.error as any;
    const apiErrors = e?.response?.data?.non_field_errors;
    if (Array.isArray(apiErrors)) return apiErrors.map((s: any) => String(s));
    const message = e?.message || e?.response?.data?.message;
    return message ? [String(message)] : [];
  }, [dailyQ.error]);

  const isFutureEndDateError = dailyNonFieldErrors.some((msg) => msg.toLowerCase().includes('end_date cannot be in the future'));

  const error = overviewQ.error || allQ.error || (isFutureEndDateError ? null : dailyQ.error) || heatmapQ.error;

  const summary = overviewQ.data?.summary;
  const daily = dailyQ.data?.daily_breakdown || [];

  // Get all unique employees from daily data
  const allEmployees = useMemo(() => {
    const employeeSet = new Set<string>();
    daily.forEach((day) => {
      day.employees.forEach((emp) => {
        employeeSet.add(emp.employee_name);
      });
    });
    return Array.from(employeeSet).sort();
  }, [daily]);

  // Initialize selected employee with first employee if none selected
  useEffect(() => {
    if (allEmployees.length > 0 && !selectedEmployee) {
      setSelectedEmployee(allEmployees[0]);
    }
  }, [allEmployees, selectedEmployee]);

  // Filter daily data based on selected employee
  const filteredDaily = useMemo(() => {
    return daily.map((day) => ({
      ...day,
      employees: day.employees.filter((emp) => emp.employee_name === selectedEmployee)
    }));
  }, [daily, selectedEmployee]);

  // Popover handlers
  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const selectEmployee = (employeeName: string) => {
    setSelectedEmployee(employeeName);
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  const uniqueEmployees = selectedEmployee ? [selectedEmployee] : [];

  // Timeline (rangeBar) per employee per day, from actual clock-in/out times.
  // Days without both timestamps are omitted rather than drawn at an invented
  // hour (ALL-140 H1); `omittedTimelineEntries` reports how many, so a partial
  // week is not mistaken for a complete one. Logic lives in
  // employeeTimelineView.ts and is unit-tested there.
  const timelineSeries = useMemo(() => buildTimelineSeries(filteredDaily as any, uniqueEmployees), [uniqueEmployees, filteredDaily]);

  const omittedTimelineEntries = useMemo(() => omittedEntryCount(filteredDaily as any, uniqueEmployees), [uniqueEmployees, filteredDaily]);

  // Fixed chart configuration for single employee
  const timelineChartConfig = {
    height: 500,
    barHeight: '60%',
    columnWidth: '70%'
  };

  const value: EmployeeAnalyticsContextValue = {
    isLoading,
    error,
    summary,
    daily,
    allEmployees,
    selectedEmployee,
    filteredDaily,
    heatmapQ,
    weekdayOrder,
    anchorEl,
    open,
    handleClick,
    handleClose,
    selectEmployee,
    timelineSeries,
    omittedTimelineEntries,
    timelineChartConfig,
    isFutureEndDateError,
    setWeekStartISO,
    setWeekEndISO
  };

  return <EmployeeAnalyticsContext.Provider value={value}>{children}</EmployeeAnalyticsContext.Provider>;
};

export default EmployeeAnalyticsProvider;
