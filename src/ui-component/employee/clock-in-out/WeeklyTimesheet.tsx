import { useState, useEffect, useCallback } from 'react';
import {
  Stack,
  Typography,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Button,
  Chip,
  Divider
} from '@mui/material';
import { Download as DownloadIcon, Share as ShareIcon, Refresh as RefreshIcon, ChevronLeft, ChevronRight } from '@mui/icons-material';
import { EmployeeListItem } from 'types/employee';
import { TimeEntry } from 'api/employee.api';
import TimesheetSelector from './TimesheetSelector';
import { useSelector, useDispatch } from 'store';
import { fetchEmployeeTimeEntries, fetchAllEmployeesTimeEntries, fetchTimeEntries, clearTimeTrackingError } from 'store/slices/employee';
import MainCard from 'ui-component/cards/MainCard';
import useAuth from 'hooks/useAuth';

interface WeeklyTimesheetProps {
  isAdmin: boolean;
  onEmployeeSelectionChange?: (employee: EmployeeListItem | null) => void;
  refreshTrigger?: number; // Triggers refresh when this value changes
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const fmtTime = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString() : '—');
const hhmm = (sec?: number | null) => {
  if (typeof sec !== 'number') return '—';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const formatDate = (date: Date) => {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
};

const getWeekDates = (startDate: Date) => {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(startDate);
    date.setDate(startDate.getDate() + i);
    dates.push(date);
  }
  return dates;
};

const getWeekStart = (date: Date) => {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
  start.setDate(diff);
  return start;
};

export default function WeeklyTimesheet({ isAdmin, onEmployeeSelectionChange, refreshTrigger }: WeeklyTimesheetProps) {
  const dispatch = useDispatch();
  const { allEmployees, loading: employeesLoading, timeTracking } = useSelector((state) => state.employee);
  const { user } = useAuth();

  // Internal state for employee selection - default to first employee for admins
  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeListItem | null>(null);
  const [weekStart, setWeekStart] = useState(() => getWeekStart(new Date()));
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const open = Boolean(anchorEl);

  const { loading, error } = timeTracking;

  // Use allEmployees directly - TimesheetSelector handles the "All" option
  const employeeOptions = allEmployees;

  // Get current week dates
  const weekDates = getWeekDates(weekStart);

  // Get current user's employee name
  const getCurrentUserEmployeeName = (entry: TimeEntry) => {
    if (isAdmin && selectedEmployee?.id === 'all') {
      return allEmployees.find((emp) => emp.id === entry.employee)?.full_name || 'Unknown';
    } else if (isAdmin && selectedEmployee) {
      return selectedEmployee.full_name;
    } else {
      // For non-admin users, try multiple approaches to get the name
      const currentUserEmployee = allEmployees.find((emp) => emp.email === user?.email);

      // Debug logging
      console.log('Getting employee name for non-admin:', {
        userEmail: user?.email,
        userName: user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.last_name,
        allEmployeesCount: allEmployees.length,
        foundEmployee: currentUserEmployee?.full_name,
        entryEmployee: entry.employee
      });

      // Return the best available name
      const userName = user?.first_name && user?.last_name ? `${user.first_name} ${user.last_name}` : user?.first_name || user?.last_name;
      return currentUserEmployee?.full_name || userName || user?.email || 'Current User';
    }
  };

  // Refresh function
  const refreshTimeEntries = useCallback(async () => {
    dispatch(clearTimeTrackingError());

    const start = weekStart.toISOString().split('T')[0];
    const end = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    if (isAdmin && selectedEmployee) {
      if (selectedEmployee.id === 'all') {
        // Use the efficient API to fetch all employees' data in one call
        dispatch(fetchAllEmployeesTimeEntries({ start, end }));
      } else {
        // Fetch data for specific employee for the entire week
        dispatch(fetchEmployeeTimeEntries({ employee_id: selectedEmployee.id, start, end }));
      }
    } else if (!isAdmin) {
      // Member mode: fetch own timesheet for the week
      console.log('Fetching timesheet for non-admin user:', { start, end, userEmail: user?.email });
      dispatch(fetchTimeEntries({ start, end }));
    }
  }, [dispatch, isAdmin, selectedEmployee, weekStart]);

  // Handle employee selection change
  const handleEmployeeChange = (employee: EmployeeListItem | null) => {
    setSelectedEmployee(employee);
    onEmployeeSelectionChange?.(employee);
  };

  // Set "All Employees" as default when employees are loaded (for admins)
  useEffect(() => {
    if (isAdmin && allEmployees.length > 0 && !selectedEmployee) {
      // Create the "All" option for default selection
      const allOption: EmployeeListItem = {
        id: 'all',
        first_name: 'All',
        last_name: 'Employees',
        full_name: 'All Employees',
        email: 'all@employees.com',
        status: 'active',
        is_active: true
      };
      setSelectedEmployee(allOption);
      onEmployeeSelectionChange?.(allOption);
    }
  }, [isAdmin, allEmployees, selectedEmployee, onEmployeeSelectionChange]);

  // Auto-refresh when employee selection or week changes
  useEffect(() => {
    refreshTimeEntries();
  }, [selectedEmployee, weekStart, refreshTimeEntries]);

  // Refresh when refreshTrigger changes (e.g., after clock out)
  useEffect(() => {
    if (refreshTrigger !== undefined) {
      refreshTimeEntries();
    }
  }, [refreshTrigger, refreshTimeEntries]);

  // Group time entries by date and sort by time (most recent first)
  const groupEntriesByDate = (entries: TimeEntry[]) => {
    const grouped: { [key: string]: TimeEntry[] } = {};
    entries.forEach((entry) => {
      const date = new Date(entry.clock_in).toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(entry);
    });

    // Sort entries within each day by clock_in time (most recent first)
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = new Date(a.clock_in).getTime();
        const timeB = new Date(b.clock_in).getTime();
        return timeB - timeA; // Most recent first
      });
    });

    return grouped;
  };

  // Use Redux data for all cases now (more efficient)
  const currentData = timeTracking.timeEntries;
  const groupedEntries = groupEntriesByDate(currentData);

  // Debug logging
  console.log('WeeklyTimesheet data:', {
    isAdmin,
    currentDataLength: currentData.length,
    currentData: currentData.slice(0, 2), // Show first 2 entries
    groupedEntriesKeys: Object.keys(groupedEntries),
    loading,
    error
  });

  // Week navigation functions
  const goToPreviousWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() - 7);
    setWeekStart(newWeekStart);
  };

  const goToNextWeek = () => {
    const newWeekStart = new Date(weekStart);
    newWeekStart.setDate(weekStart.getDate() + 7);
    setWeekStart(newWeekStart);
  };

  const goToCurrentWeek = () => {
    setWeekStart(getWeekStart(new Date()));
  };

  // Check if we can navigate to next week (disable future weeks)
  const canGoToNextWeek = () => {
    const currentWeekStart = getWeekStart(new Date());
    const nextWeekStart = new Date(weekStart);
    nextWeekStart.setDate(weekStart.getDate() + 7);
    return nextWeekStart <= currentWeekStart;
  };

  // Check if we can navigate to previous week (disable if no historical data)
  const canGoToPreviousWeek = () => {
    // Check if there are any time entries before the current week start
    const hasHistoricalData = currentData.some((entry) => {
      const entryDate = new Date(entry.clock_in);
      return entryDate < weekStart;
    });
    return hasHistoricalData;
  };

  // Export functions
  const exportCsv = () => {
    const header = ['Date', 'Employee', 'Clock In', 'Clock Out', 'Duration', 'Note'];
    const lines = currentData.map((r) => {
      const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
      const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
      const dur = Math.max(0, Math.round((b - a) / 1000));
      const date = new Date(r.clock_in).toISOString().split('T')[0];
      const employeeName =
        isAdmin && selectedEmployee && selectedEmployee.id !== 'all'
          ? selectedEmployee.full_name
          : allEmployees.find((emp) => emp.id === r.employee)?.full_name || 'Unknown';
      return [
        date,
        employeeName,
        r.clock_in_formatted || fmt(r.clock_in),
        r.clock_out_formatted || fmt(r.clock_out),
        r.duration_formatted || String(dur),
        r.note ?? ''
      ]
        .map((v) => `"${String(v).replace(/\"/g, '""')}"`)
        .join(',');
    });
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `weekly_timesheet_${selectedEmployee?.id === 'all' ? 'all' : selectedEmployee?.id}_${weekStart.toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    if (isAdmin && selectedEmployee && selectedEmployee.id !== 'all') {
      const origin = window.location.origin;
      const url = `${origin}/employees/clock?employee_id=${encodeURIComponent(selectedEmployee.id)}&start=${encodeURIComponent(weekStart.toISOString().split('T')[0])}&end=${encodeURIComponent(new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])}`;
      await navigator.clipboard.writeText(url);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  };

  // Menu handlers
  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const downloadCSV = () => {
    exportCsv();
    handleClose();
  };

  const copyLink = () => {
    copyShareLink();
    handleClose();
  };

  return (
    <MainCard
      title={
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="h3" fontWeight={700}>
            Weekly Timesheet
          </Typography>

          <Stack direction="row" gap={2} alignItems="center">
            {/* Employee Selector - Only for Admin */}
            {isAdmin && (
              <Box sx={{ minWidth: 200 }}>
                <TimesheetSelector
                  employees={employeeOptions}
                  selectedEmployee={selectedEmployee}
                  onEmployeeChange={handleEmployeeChange}
                  loading={employeesLoading}
                />
              </Box>
            )}

            {/* Action Buttons */}
            <Stack direction="row" gap={1} alignItems="center">
              {/* Download Menu */}
              <Tooltip title="Download Report">
                <IconButton onClick={handleClick} disabled={!currentData.length}>
                  <DownloadIcon />
                </IconButton>
              </Tooltip>

              {/* Refresh Button */}
              <Tooltip title="Refresh Data">
                <IconButton onClick={refreshTimeEntries} disabled={loading}>
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              {/* Copy Success Message */}
              {copySuccess && (
                <Typography variant="caption" color="success.main" sx={{ ml: 1 }}>
                  Link copied!
                </Typography>
              )}
            </Stack>
          </Stack>
        </Stack>
      }
      sx={{ borderRadius: 3 }}
    >
      {/* Week Navigation */}
      <Stack direction="row" alignItems="center" justifyContent="center" gap={2} sx={{ mb: 3 }}>
        <IconButton onClick={goToPreviousWeek} size="small" disabled={!canGoToPreviousWeek()}>
          <ChevronLeft />
        </IconButton>

        <Typography variant="h3" fontWeight={700} color="black" onClick={goToCurrentWeek} sx={{ cursor: 'pointer', px: 2 }}>
          {formatDate(weekDates[0])} - {formatDate(weekDates[6])}
        </Typography>

        <IconButton onClick={goToNextWeek} size="small" disabled={!canGoToNextWeek()}>
          <ChevronRight />
        </IconButton>
      </Stack>

      {/* Download Menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <MenuItem onClick={downloadCSV}>
          <DownloadIcon sx={{ mr: 1 }} />
          Download CSV Report
        </MenuItem>
        {isAdmin && selectedEmployee && selectedEmployee.id !== 'all' && (
          <MenuItem onClick={copyLink}>
            <ShareIcon sx={{ mr: 1 }} />
            Copy Share Link
          </MenuItem>
        )}
      </Menu>

      {error && (
        <Typography color="error" sx={{ mb: 2 }}>
          {error}
        </Typography>
      )}

      {/* Daily Tables - Only show days with entries */}
      <Stack gap={3}>
        {weekDates
          .filter((date) => {
            const dateStr = date.toISOString().split('T')[0];
            return groupedEntries[dateStr] && groupedEntries[dateStr].length > 0;
          })
          .sort((a, b) => b.getTime() - a.getTime()) // Sort days in reverse chronological order (most recent first)
          .map((date, index) => {
            const dateStr = date.toISOString().split('T')[0];
            const dayEntries = groupedEntries[dateStr] || [];

            // Only render if there are entries for this day
            if (dayEntries.length === 0) {
              return null;
            }

            const dayTotal = dayEntries.reduce((acc, entry) => {
              const a = entry.clock_in ? new Date(entry.clock_in).getTime() : 0;
              const b = entry.clock_out ? new Date(entry.clock_out).getTime() : a;
              return acc + Math.max(0, Math.round((b - a) / 1000));
            }, 0);

            return (
              <Box key={dateStr}>
                <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ mb: 2 }}>
                  <Typography variant="h3" fontWeight={600}>
                    {formatDate(date)}
                  </Typography>
                  {dayTotal > 0 && (
                    <Typography variant="h3" fontWeight={600} color="primary.main">
                      {hhmm(dayTotal)}
                    </Typography>
                  )}
                </Stack>

                <Box sx={{ overflowX: 'auto', width: '100%', maxHeight: 400 }}>
                  <Table size="small" sx={{ minWidth: 600, border: '1px solid black' }} stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ width: '30%', minWidth: 150, bgcolor: 'grey.100', fontWeight: 600 }}>Employee</TableCell>
                        <TableCell sx={{ width: '12%', minWidth: 80, bgcolor: 'grey.100', fontWeight: 600 }}>Clock In</TableCell>
                        <TableCell sx={{ width: '12%', minWidth: 80, bgcolor: 'grey.100', fontWeight: 600 }}>Clock Out</TableCell>
                        <TableCell sx={{ width: '12%', minWidth: 80, bgcolor: 'grey.100', fontWeight: 600 }}>Duration</TableCell>
                        <TableCell sx={{ width: '30%', minWidth: 150, bgcolor: 'grey.100', fontWeight: 600 }}>Note</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {dayEntries.map((entry) => {
                        const a = entry.clock_in ? new Date(entry.clock_in).getTime() : 0;
                        const b = entry.clock_out ? new Date(entry.clock_out).getTime() : a;
                        const dur = Math.max(0, Math.round((b - a) / 1000));
                        return (
                          <TableRow key={entry.id} hover>
                            <TableCell sx={{ width: '30%', minWidth: 150 }}>{getCurrentUserEmployeeName(entry)}</TableCell>
                            <TableCell sx={{ width: '12%', minWidth: 80 }}>{entry.clock_in_formatted || fmtTime(entry.clock_in)}</TableCell>
                            <TableCell sx={{ width: '12%', minWidth: 80 }}>
                              {entry.clock_out_formatted || fmtTime(entry.clock_out)}
                            </TableCell>
                            <TableCell sx={{ width: '12%', minWidth: 80 }}>{entry.duration_formatted || hhmm(dur)}</TableCell>
                            <TableCell sx={{ width: '30%', minWidth: 150 }}>{entry.note ?? '—'}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </Box>
              </Box>
            );
          })}
      </Stack>

      {/* Show message when no data */}
      {Object.keys(groupedEntries).length === 0 && !loading && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="h6" color="text.secondary">
            No time entries found for this week
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {isAdmin ? 'Select an employee or try a different week' : 'Try clocking in/out or check a different week'}
          </Typography>
        </Box>
      )}
    </MainCard>
  );
}
