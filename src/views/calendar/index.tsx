import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, 
  Typography, 
  Card,
  CardContent,
  IconButton,
  Tooltip,
  Button,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel as MuiFormControlLabel,
  useTheme,
  Alert,
  CircularProgress,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Checkbox,
  FormControlLabel
} from '@mui/material';
import Grid from '@mui/material/Grid';
import { 
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon,
  Work as WorkIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  FilterList as FilterListIcon
} from '@mui/icons-material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { useGetShifts, useGetMyShifts, useGetEmployees, createShift, updateShift, deleteShift, createEmployee, updateEmployee, deleteEmployee, invalidateShiftsCache, invalidateEmployeesCache } from 'api/employee.api';
import { canManageShifts, getRoleDisplayName } from 'api/role.api';
import { Shift, Employee, CreateShiftRequest, UpdateShiftRequest } from 'types/entities';
import useAuth from 'hooks/useAuth';

// Calendar event interface for display
interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  startTime: string;
  endTime: string;
  employee_id: string;
  employee_name: string;
  color: string;
  allDay: boolean;
  notes?: string;
}

// Employee color mapping
const getEmployeeColor = (employeeId: string, employees: Employee[]): string => {
  const colors = ['#673ab7', '#69A1EA', '#00e676', '#ffab91', '#f44336', '#9c27b0', '#2196f3', '#4caf50'];
  const employee = employees.find(emp => emp.id === employeeId);
  if (!employee) return colors[0];
  
  // Use employee ID to consistently assign colors
  const hash = employee.id.split('').reduce((a, b) => {
    a = ((a << 5) - a) + b.charCodeAt(0);
    return a & a;
  }, 0);
  return colors[Math.abs(hash) % colors.length];
};

// Helper functions for timezone-safe datetime handling
const formatDateTimeLocalValue = (isoString: string): string => {
  try {
    const date = new Date(isoString);
    // Convert to local time and format for datetime-local input
    const offset = date.getTimezoneOffset();
    const localDate = new Date(date.getTime() - (offset * 60 * 1000));
    return localDate.toISOString().slice(0, 16);
  } catch (error) {
    console.error('Error formatting datetime local value:', error);
    return '';
  }
};

const formatDateTimeToISO = (localValue: string): string => {
  try {
    if (!localValue) return '';
    const date = new Date(localValue);
    return date.toISOString();
  } catch (error) {
    console.error('Error formatting datetime to ISO:', error);
    return '';
  }
};

// ==============================|| CALENDAR PAGE ||============================== //

export default function CalendarPage() {
  const theme = useTheme();
  const { user } = useAuth();
  
  // State for calendar view
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState('month');
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  
  // Dialog states
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  
  // Employee management states
  const [openEmployeeDialog, setOpenEmployeeDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [showEmployeeDeleteDialog, setShowEmployeeDeleteDialog] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<Employee | null>(null);
  
  // Loading and error states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Check if user can manage shifts based on their role
  const canManage = useMemo(() => {
    if (!user?.role_type) return false;
    return canManageShifts(user.role_type);
  }, [user]);

  // Debug user role information
  React.useEffect(() => {
    console.log('User role debug:', {
      user: user,
      roleType: user?.role_type,
      canManage: canManage
    });
  }, [user, canManage]);
  
  // API calls
  const { employees, employeesLoading, employeesError } = useGetEmployees();
  const { shifts, shiftsLoading, shiftsError } = useGetShifts({
    start: dateRange.start,
    end: dateRange.end,
    employee_id: selectedEmployees.length === 1 ? selectedEmployees[0] : undefined
  });
  const { myShifts, myShiftsLoading, myShiftsError } = useGetMyShifts({
    start: dateRange.start,
    end: dateRange.end
  });

  // Debug logging
  React.useEffect(() => {
    console.log('Calendar state:', {
      canManage,
      roleType: user?.role_type,
      roleDisplay: user?.role_type ? getRoleDisplayName(user.role_type) : 'Unknown',
      employees: employees?.length || 0,
      employeesLoading,
      employeesError,
      shifts: shifts?.length || 0,
      shiftsLoading,
      shiftsError,
      myShifts: myShifts?.length || 0,
      myShiftsLoading,
      myShiftsError,
      dateRange,
      selectedEmployees
    });
  }, [canManage, user, employees, employeesLoading, employeesError, shifts, shiftsLoading, shiftsError, myShifts, myShiftsLoading, myShiftsError, dateRange, selectedEmployees]);
  
  // Determine which shifts to display based on user role
  const displayShifts = useMemo(() => {
    if (canManage) {
      return shifts || [];
    } else {
      return myShifts || [];
    }
  }, [canManage, shifts, myShifts]);
  
  // Convert shifts to calendar events
  const events = useMemo(() => {
    if (!displayShifts || !employees) return [];
    
    return displayShifts.map((shift: Shift): CalendarEvent => {
      const startTime = new Date(shift.starts_at);
      const endTime = new Date(shift.ends_at);
      const isAllDay = startTime.getHours() === 0 && startTime.getMinutes() === 0 && 
                      endTime.getHours() === 23 && endTime.getMinutes() === 59;
      
      return {
        id: shift.id,
        title: `${shift.employee_name} - Shift`,
        date: shift.date,
        time: isAllDay ? 'All day' : startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        startTime: startTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        endTime: endTime.toLocaleTimeString('en-US', { 
          hour: 'numeric', 
          minute: '2-digit',
          hour12: true 
        }),
        employee_id: shift.employee,
        employee_name: shift.employee_name,
        color: getEmployeeColor(shift.employee, employees),
        allDay: isAllDay,
        notes: shift.notes
      };
    });
  }, [displayShifts, employees]);

  // Update date range when current date changes
  useEffect(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);
    
    if (viewMode === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1, 0);
    } else if (viewMode === 'week') {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    }
    
    setDateRange({
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    });
  }, [currentDate, viewMode]);

  const handleEmployeeToggle = (employeeId: string) => {
    setSelectedEmployees(prev => 
      prev.includes(employeeId) 
        ? prev.filter(id => id !== employeeId)
        : [...prev, employeeId]
    );
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (viewMode === 'month') {
        if (direction === 'prev') {
          newDate.setMonth(newDate.getMonth() - 1);
        } else {
          newDate.setMonth(newDate.getMonth() + 1);
        }
      } else if (viewMode === 'week') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 7);
        } else {
          newDate.setDate(newDate.getDate() + 7);
        }
      } else if (viewMode === 'day') {
        if (direction === 'prev') {
          newDate.setDate(newDate.getDate() - 1);
        } else {
          newDate.setDate(newDate.getDate() + 1);
        }
      }
      return newDate;
    });
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const handleViewModeChange = (event: React.MouseEvent<HTMLElement>, newViewMode: string | null) => {
    if (newViewMode !== null) {
      setViewMode(newViewMode);
    }
  };

  const getDateRangeDisplay = () => {
    if (viewMode === 'month') {
      return formatMonthYear(currentDate);
    } else if (viewMode === 'week') {
      const startOfWeek = new Date(currentDate);
      const dayOfWeek = startOfWeek.getDay();
      startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
      
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      
      return `${startOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endOfWeek.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else if (viewMode === 'day') {
      return currentDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return formatMonthYear(currentDate);
  };

  const handleAddShift = (date: Date) => {
    if (!canManage) return;
    setSelectedDate(date);
    setEditingShift(null);
    setOpenShiftDialog(true);
  };

  const handleEditShift = (shift: Shift) => {
    if (!canManage) return;
    setEditingShift(shift);
    setOpenShiftDialog(true);
  };

  const handleDeleteShift = (shift: Shift) => {
    if (!canManage) return;
    setShiftToDelete(shift);
    setShowDeleteDialog(true);
  };

  const confirmDeleteShift = async () => {
    if (shiftToDelete) {
      try {
        setIsSubmitting(true);
        await deleteShift(shiftToDelete.id);
        invalidateShiftsCache();
        setShowDeleteDialog(false);
        setShiftToDelete(null);
      } catch (error) {
        setError('Failed to delete shift');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handleSaveShift = async (shiftData: Partial<CreateShiftRequest | UpdateShiftRequest>) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      if (!shiftData.employee) {
        setError('Please select an employee');
        return;
      }
      if (!shiftData.starts_at) {
        setError('Please select a start time');
        return;
      }
      if (!shiftData.ends_at) {
        setError('Please select an end time');
        return;
      }

      // Validate that end time is after start time
      const startTime = new Date(shiftData.starts_at);
      const endTime = new Date(shiftData.ends_at);
      if (endTime <= startTime) {
        setError('End time must be after start time');
        return;
      }

      console.log('Saving shift with validated data:', shiftData);

      if (editingShift) {
        // Update existing shift
        await updateShift(editingShift.id, shiftData as UpdateShiftRequest);
      } else {
        // Create new shift - add company ID
        const companyId = '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
        await createShift({ ...shiftData, company: companyId } as CreateShiftRequest);
      }
      
      invalidateShiftsCache();
      setOpenShiftDialog(false);
      setShowShiftDialog(false);
      setEditingShift(null);
      setSelectedDate(null);
      setSelectedEmployees([]);
    } catch (error: any) {
      console.error('Error saving shift:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save shift';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Employee management functions
  const handleAddEmployee = () => {
    setEditingEmployee(null);
    setOpenEmployeeDialog(true);
  };

  const handleEditEmployee = (employee: Employee) => {
    setEditingEmployee(employee);
    setOpenEmployeeDialog(true);
  };

  const handleDeleteEmployee = (employee: Employee) => {
    setEmployeeToDelete(employee);
    setShowEmployeeDeleteDialog(true);
  };

  const handleSaveEmployee = async (employeeData: { first_name: string; last_name: string; email: string }) => {
    try {
      setIsSubmitting(true);
      setError(null);

      // Validate required fields
      if (!employeeData.first_name || !employeeData.last_name || !employeeData.email) {
        setError('Please fill in all required fields');
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(employeeData.email)) {
        setError('Please enter a valid email address');
        return;
      }

      console.log('Saving employee with data:', employeeData);

      if (editingEmployee) {
        // Update existing employee
        await updateEmployee(editingEmployee.id, employeeData);
      } else {
        // Create new employee - use the actual company ID
        const companyId = '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
        await createEmployee({ ...employeeData, company: companyId });
      }
      
      invalidateEmployeesCache();
      setOpenEmployeeDialog(false);
      setShowEmployeeDialog(false);
      setEditingEmployee(null);
    } catch (error: any) {
      console.error('Error saving employee:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to save employee';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteShift = async () => {
    if (!shiftToDelete) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await deleteShift(shiftToDelete.id);
      invalidateShiftsCache();
      setShowDeleteDialog(false);
      setShiftToDelete(null);
    } catch (error: any) {
      console.error('Error deleting shift:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete shift';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmDeleteEmployee = async () => {
    if (!employeeToDelete) return;

    try {
      setIsSubmitting(true);
      setError(null);

      await deleteEmployee(employeeToDelete.id);
      invalidateEmployeesCache();
      setShowEmployeeDeleteDialog(false);
      setEmployeeToDelete(null);
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      const errorMessage = error?.response?.data?.message || error?.message || 'Failed to delete employee';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    
    const days = [];
    
    // Add days from previous month
    const prevMonth = new Date(year, month, 0);
    const daysInPrevMonth = prevMonth.getDate();
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month - 1, daysInPrevMonth - i),
        isCurrentMonth: false
      });
    }
    
    // Add days from current month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    // Add days from next month to complete the grid
    const remainingDays = 42 - days.length; // 6 rows * 7 days
    for (let i = 1; i <= remainingDays; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }
    
    return days;
  };

  const getEventsForDate = (date: Date) => {
    const dateString = date.toISOString().split('T')[0];
    return events.filter(event => event.date === dateString);
  };

  const formatDate = (date: Date) => {
    return date.getDate();
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.getDate() === today.getDate() && 
           date.getMonth() === today.getMonth() && 
           date.getFullYear() === today.getFullYear();
  };

  const formatMonthYear = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'long', 
      year: 'numeric' 
    });
  };

  const calendarDays = getDaysInMonth(currentDate);

  // Render different view modes
  const renderMonthView = () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
      {/* Day Headers */}
      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
        <Box key={day} sx={{ p: 1, textAlign: 'center' }}>
          <Typography variant="body2" color="textSecondary">
            {day}
          </Typography>
        </Box>
      ))}

      {/* Calendar Days */}
      {calendarDays.map((day, index) => {
        const events = getEventsForDate(day.date);
        const visibleEvents = events.slice(0, 3);
        const moreEvents = events.length - 3;

        return (
          <Box
            key={index}
            sx={{
              minHeight: 120,
              border: 1,
              borderColor: 'divider',
              p: 1,
              backgroundColor: day.isCurrentMonth ? 'background.paper' : 'action.hover',
              position: 'relative',
              cursor: canManage ? 'pointer' : 'default',
              '&:hover': {
                backgroundColor: day.isCurrentMonth ? 'action.hover' : 'action.selected'
              }
            }}
            onClick={() => canManage && handleAddShift(day.date)}
          >
            <Typography
              variant="body2"
              sx={{
                color: day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                fontWeight: isToday(day.date) ? 'bold' : 'normal',
                mb: 1,
                textAlign: 'center',
                ...(isToday(day.date) && {
                  backgroundColor: theme.palette.primary.main,
                  color: 'white',
                  borderRadius: '50%',
                  width: 24,
                  height: 24,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto'
                })
              }}
            >
              {formatDate(day.date)}
            </Typography>

            {/* Events */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {visibleEvents.map((event) => (
                <Box
                  key={event.id}
                  sx={{
                    backgroundColor: event.color,
                    color: 'white',
                    p: 0.5,
                    borderRadius: 1,
                    fontSize: '0.75rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    cursor: canManage ? 'pointer' : 'default',
                    fontWeight: 'bold',
                    '&:hover': canManage ? {
                      opacity: 0.8
                    } : {}
                  }}
                  onClick={(e) => {
                    if (canManage) {
                      e.stopPropagation();
                      // Find the original shift data
                      const originalShift = displayShifts.find(s => s.id === event.id);
                      if (originalShift) {
                        handleEditShift(originalShift);
                      }
                    }
                  }}
                >
                  <Typography variant="caption" noWrap sx={{ fontWeight: 'bold', color: 'white' }}>
                    {event.employee_name}
                  </Typography>
                  {event.time !== 'All day' && (
                    <Typography variant="caption" sx={{ fontWeight: 'bold', color: 'white' }}>
                      {event.time}
                    </Typography>
                  )}
                </Box>
              ))}
              {moreEvents > 0 && (
                <Typography variant="caption" color="textSecondary">
                  +{moreEvents} more
                </Typography>
              )}
            </Box>
          </Box>
        );
      })}
    </Box>
  );

  const renderListView = () => (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" gutterBottom>
        Employee Shifts
      </Typography>
      <List>
        {events
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
          .map((event) => (
            <ListItem 
              key={event.id} 
              sx={{ 
                border: 1, 
                borderColor: 'divider', 
                borderRadius: 1, 
                mb: 1,
                cursor: canManage ? 'pointer' : 'default',
                '&:hover': canManage ? {
                  backgroundColor: 'action.hover'
                } : {}
              }}
              onClick={() => {
                if (canManage) {
                  const originalShift = displayShifts.find(s => s.id === event.id);
                  if (originalShift) {
                    handleEditShift(originalShift);
                  }
                }
              }}
            >
              <ListItemIcon>
                <Box
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: '50%',
                    backgroundColor: event.color
                  }}
                />
              </ListItemIcon>
              <ListItemText
                primary={event.title}
                secondary={`${new Date(event.date).toLocaleDateString()} • ${event.time}`}
              />
              {canManage && (
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation();
                    const originalShift = displayShifts.find(s => s.id === event.id);
                    if (originalShift) {
                      handleDeleteShift(originalShift);
                    }
                  }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </ListItem>
          ))}
      </List>
    </Box>
  );

  // Week view implementation
  const renderWeekView = () => {
    const startOfWeek = new Date(currentDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);
    
    const days: Date[] = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }

    return (
      <Box>
        {/* Week Header */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1, mb: 1 }}>
          {['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((dayName, index) => (
            <Box key={dayName}>
              <Typography variant="h6" align="center" sx={{ py: 1, backgroundColor: 'action.hover' }}>
                {dayName}
              </Typography>
              <Typography variant="body2" align="center" color="textSecondary">
                {days[index].toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Week Days */}
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1 }}>
          {days.map((day, index) => {
            const dayEvents = getEventsForDate(day);
            return (
              <Box key={index}>
                <Box
                  sx={{
                    minHeight: 300,
                    border: 1,
                    borderColor: 'divider',
                    p: 1,
                    backgroundColor: 'background.paper',
                    cursor: canManage ? 'pointer' : 'default',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                  onClick={() => canManage && handleAddShift(day)}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: isToday(day) ? 'bold' : 'normal',
                      mb: 1,
                      textAlign: 'center',
                      ...(isToday(day) && {
                        backgroundColor: theme.palette.primary.main,
                        color: 'white',
                        borderRadius: 1,
                        py: 0.5
                      })
                    }}
                  >
                    {day.getDate()}
                  </Typography>

                  {/* Events for this day */}
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {dayEvents.map((event) => (
                      <Box
                        key={event.id}
                        sx={{
                          backgroundColor: event.color,
                          color: 'white',
                          p: 1,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          cursor: canManage ? 'pointer' : 'default',
                          '&:hover': canManage ? {
                            opacity: 0.8
                          } : {}
                        }}
                        onClick={(e) => {
                          if (canManage) {
                            e.stopPropagation();
                            const originalShift = displayShifts.find(s => s.id === event.id);
                            if (originalShift) {
                              handleEditShift(originalShift);
                            }
                          }
                        }}
                      >
                        <Typography variant="caption" noWrap sx={{ fontWeight: 'bold', display: 'block' }}>
                          {event.employee_name}
                        </Typography>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', display: 'block' }}>
                          {event.startTime} - {event.endTime}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  const renderCurrentView = () => {
    switch (viewMode) {
      case 'week':
        return renderWeekView();
      case 'list':
        return renderListView();
      default:
        return renderMonthView();
    }
  };

  // Show loading state
  if (employeesLoading || shiftsLoading || myShiftsLoading) {
    return (
      <MainCard title="Employee Shifts">
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  // Show error state
  if (employeesError || shiftsError || myShiftsError) {
    return (
      <MainCard title="Employee Shifts">
        <Alert severity="error">
          Failed to load data. Please try again.
        </Alert>
      </MainCard>
    );
  }

  return (
    <MainCard title="Employee Shifts">
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      {/* Summary Section */}
      <Box sx={{ mb: 3, p: 2, backgroundColor: 'grey.50', borderRadius: 2, border: 1, borderColor: 'grey.200' }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <PersonIcon color="primary" />
          Employee Summary
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
          <Chip 
            label={`${employees?.length || 0} Employees`} 
            color="primary" 
            variant="outlined"
            icon={<PersonIcon />}
          />
          <Chip 
            label={`${shifts?.length || 0} Total Shifts`} 
            color="secondary" 
            variant="outlined"
            icon={<ScheduleIcon />}
          />
          {canManage && (
            <Chip 
              label={`${myShifts?.length || 0} My Shifts`} 
              color="info" 
              variant="outlined"
              icon={<WorkIcon />}
            />
          )}
        </Box>
        
        {/* Employee Names */}
        {employees && employees.length > 0 && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Employees:
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {employees.slice(0, 6).map((employee) => (
                <Chip
                  key={employee.id}
                  label={`${employee.first_name} ${employee.last_name}`}
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    if (canManage) {
                      setEditingShift(null);
                      setSelectedDate(new Date());
                      setOpenShiftDialog(true);
                      // Pre-select this employee in the shift dialog
                      setSelectedEmployees([employee.id]);
                    }
                  }}
                  style={{ cursor: canManage ? 'pointer' : 'default' }}
                  title={canManage ? 'Click to create shift for this employee' : ''}
                />
              ))}
              {employees.length > 6 && (
                <Chip
                  label={`+${employees.length - 6} more`}
                  size="small"
                  variant="outlined"
                  color="default"
                />
              )}
            </Box>
          </Box>
        )}
        
        {/* Action Buttons for Admins/Managers */}
        {canManage && (
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<AddIcon />}
              onClick={() => setShowEmployeeDialog(true)}
              size="small"
            >
              Add Employee
            </Button>
            <Button
              variant="contained"
              color="secondary"
              startIcon={<AddIcon />}
              onClick={() => setShowShiftDialog(true)}
              size="small"
            >
              Add Shift
            </Button>
          </Box>
        )}
      </Box>
      
      <Box sx={{ display: 'flex', gap: 3 }}>
        {/* Left Sidebar */}
        <Box sx={{ width: { xs: '100%', md: '300px' } }}>
          <Card>
            <CardContent>
              {/* User Role Indicator */}
              <Box sx={{ mb: 2, p: 2, backgroundColor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="body2" color="textSecondary">
                  Logged in as: {user?.email}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Role: {user?.role_type ? getRoleDisplayName(user.role_type) : 'Loading...'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Company: {user?.company_name || 'Loading...'}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Permissions: {canManage ? 'Create, Edit, Delete' : 'View Only'}
                </Typography>
              </Box>

              {/* New Shift Button */}
              {canManage && (
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  fullWidth
                  sx={{ 
                    mb: 3,
                    color: 'white',
                    '& .MuiButton-startIcon': {
                      color: 'white'
                    }
                  }}
                  onClick={() => handleAddShift(new Date())}
                >
                  New Shift
                </Button>
              )}

              {/* Read-only message for members */}
              {!canManage && (
                <Alert severity="info" sx={{ mb: 3 }}>
                  You have read-only access. Contact your administrator to create or edit shifts.
                </Alert>
              )}

              {/* Employee Management Section */}
              {canManage && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Employee Management
                  </Typography>
                  
                  {/* New Employee Button */}
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    fullWidth
                    sx={{ mb: 2 }}
                    onClick={handleAddEmployee}
                  >
                    Add Employee
                  </Button>

                  {/* Employee List */}
                  {employees && employees.length > 0 && (
                    <Box sx={{ maxHeight: 200, overflowY: 'auto' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Current Employees ({employees.length})
                      </Typography>
                      {employees.map((employee) => (
                        <Box
                          key={employee.id}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            mb: 1,
                            border: 1,
                            borderColor: 'divider',
                            borderRadius: 1,
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight="bold">
                              {employee.first_name} {employee.last_name}
                            </Typography>
                            <Typography variant="caption" color="textSecondary">
                              {employee.email}
                            </Typography>
                          </Box>
                          <Box>
                            <IconButton
                              size="small"
                              onClick={() => handleEditEmployee(employee)}
                              sx={{ mr: 0.5 }}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                            <IconButton
                              size="small"
                              onClick={() => handleDeleteEmployee(employee)}
                              color="error"
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>
              )}

              {/* Mini Calendar */}
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  {formatMonthYear(currentDate)}
                </Typography>
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
                  {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
                    <Box key={day}>
                      <Typography variant="caption" align="center" display="block">
                        {day}
                      </Typography>
                    </Box>
                  ))}
                  {getDaysInMonth(currentDate).slice(0, 35).map((day, index) => (
                    <Box key={index}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: '50%',
                          backgroundColor: isToday(day.date) ? theme.palette.primary.main : 'transparent',
                          color: isToday(day.date) ? 'white' : day.isCurrentMonth ? 'text.primary' : 'text.disabled',
                          fontSize: '0.75rem',
                          cursor: 'pointer',
                          fontWeight: isToday(day.date) ? 'bold' : 'normal',
                          '&:hover': {
                            backgroundColor: isToday(day.date) ? theme.palette.primary.main : 'action.hover'
                          }
                        }}
                        onClick={() => {
                          setCurrentDate(day.date);
                          setViewMode('day');
                        }}
                      >
                        {formatDate(day.date)}
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Box>

              {/* Employee Filter */}
              {canManage && employees && employees.length > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2">Employees</Typography>
                    <IconButton 
                      size="small"
                      onClick={() => setShowFilters(!showFilters)}
                    >
                      <FilterListIcon fontSize="small" />
                    </IconButton>
                  </Box>
                  {showFilters && (
                    <Box sx={{ maxHeight: 200, overflow: 'auto' }}>
                      {employees.map((employee) => (
                        <FormControlLabel
                          key={employee.id}
                          control={
                            <Checkbox
                              checked={selectedEmployees.includes(employee.id)}
                              onChange={() => handleEmployeeToggle(employee.id)}
                              size="small"
                            />
                          }
                          label={
                            <Typography variant="body2">
                              {employee.first_name} {employee.last_name}
                            </Typography>
                          }
                          sx={{ display: 'block', mb: 0.5 }}
                        />
                      ))}
                    </Box>
                  )}
                </Box>
              )}
            </CardContent>
          </Card>
        </Box>

        {/* Main Calendar View */}
        <Box sx={{ flex: 1 }}>
          {/* Calendar Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconButton onClick={() => navigateMonth('prev')}>
                <NavigateBeforeIcon />
              </IconButton>
              <Button 
                variant="contained" 
                size="small"
                onClick={goToToday}
                sx={{ 
                  backgroundColor: theme.palette.secondary.main,
                  color: 'white',
                  '&:hover': { 
                    backgroundColor: theme.palette.secondary.dark,
                    color: 'white'
                  }
                }}
              >
                Today
              </Button>
              <IconButton onClick={() => navigateMonth('next')}>
                <NavigateNextIcon />
              </IconButton>
            </Box>
            
            <Typography variant="h4">
              {getDateRangeDisplay()}
            </Typography>

            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={handleViewModeChange}
              size="small"
            >
              <ToggleButton 
                value="month"
                sx={{
                  backgroundColor: viewMode === 'month' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'month' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'month' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                Month
              </ToggleButton>
              <ToggleButton 
                value="week"
                sx={{
                  backgroundColor: viewMode === 'week' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'week' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'week' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                Week
              </ToggleButton>
              <ToggleButton 
                value="list"
                sx={{
                  backgroundColor: viewMode === 'list' ? theme.palette.secondary.main : 'white',
                  color: viewMode === 'list' ? 'white' : 'black',
                  '&:hover': {
                    backgroundColor: viewMode === 'list' ? theme.palette.secondary.dark : '#f5f5f5'
                  }
                }}
              >
                List
              </ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Calendar Content */}
          {renderCurrentView()}
        </Box>
      </Box>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
        <DialogTitle>Delete Shift</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this shift for {shiftToDelete?.employee_name}?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleConfirmDeleteShift} 
            color="error" 
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Employee Dialog */}
      <EmployeeDialog
        open={openEmployeeDialog}
        onClose={() => setOpenEmployeeDialog(false)}
        onSave={handleSaveEmployee}
        onDelete={handleDeleteEmployee}
        employee={editingEmployee}
        isSubmitting={isSubmitting}
      />

      {/* Employee Delete Confirmation Dialog */}
      <Dialog
        open={showEmployeeDeleteDialog}
        onClose={() => setShowEmployeeDeleteDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Employee</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {employeeToDelete?.first_name} {employeeToDelete?.last_name}?
            This action cannot be undone and will also delete all associated shifts.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEmployeeDeleteDialog(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirmDeleteEmployee}
            color="error"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? <CircularProgress size={20} /> : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Shift Dialog */}
      <ShiftDialog
        open={openShiftDialog || showShiftDialog}
        onClose={() => {
          setOpenShiftDialog(false);
          setShowShiftDialog(false);
          setEditingShift(null);
          setSelectedEmployees([]);
        }}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        shift={editingShift}
        employees={employees || []}
        selectedDate={selectedDate}
        isSubmitting={isSubmitting}
        preselectedEmployee={selectedEmployees.length === 1 ? selectedEmployees[0] : undefined}
      />

      {/* Employee Dialog */}
      <EmployeeDialog
        open={openEmployeeDialog || showEmployeeDialog}
        onClose={() => {
          setOpenEmployeeDialog(false);
          setShowEmployeeDialog(false);
          setEditingEmployee(null);
        }}
        onSave={handleSaveEmployee}
        onDelete={handleDeleteEmployee}
        employee={editingEmployee}
        isSubmitting={isSubmitting}
      />
    </MainCard>
  );
}

// Shift Dialog Component
interface ShiftDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (shiftData: Partial<CreateShiftRequest | UpdateShiftRequest>) => void;
  onDelete: (shift: Shift) => void;
  shift: Shift | null;
  employees: Employee[];
  selectedDate: Date | null;
  isSubmitting: boolean;
  preselectedEmployee?: string;
}

function ShiftDialog({ open, onClose, onSave, onDelete, shift, employees, selectedDate, isSubmitting, preselectedEmployee }: ShiftDialogProps) {
  const [formData, setFormData] = useState({
    employee: '',
    starts_at: '',
    ends_at: '',
    title: '',
    notes: ''
  });

  // Update form data when shift changes
  React.useEffect(() => {
    if (shift) {
      console.log('Setting form data for editing shift:', shift);
      setFormData({
        employee: shift.employee,
        starts_at: shift.starts_at,
        ends_at: shift.ends_at,
        title: shift.title || '',
        notes: shift.notes || ''
      });
    } else {
      // Create default times for new shift
      const defaultDate = selectedDate || new Date();
      const startTime = new Date(defaultDate);
      startTime.setHours(9, 0, 0, 0);
      const endTime = new Date(defaultDate);
      endTime.setHours(17, 0, 0, 0);
      
      console.log('Setting form data for new shift:', {
        selectedDate,
        defaultDate,
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString()
      });
      
      setFormData({
        employee: preselectedEmployee || '',
        starts_at: startTime.toISOString(),
        ends_at: endTime.toISOString(),
        title: '',
        notes: ''
      });
    }
  }, [shift, selectedDate, open, preselectedEmployee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form data before submission
    if (!formData.employee) {
      alert('Please select an employee');
      return;
    }
    if (!formData.starts_at) {
      alert('Please select a start time');
      return;
    }
    if (!formData.ends_at) {
      alert('Please select an end time');
      return;
    }

    console.log('Submitting form data:', formData);
    onSave(formData);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
    >
      <DialogTitle>
        {shift ? 'Edit Shift' : 'Add New Shift'}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          ×
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <FormControl fullWidth required>
              <InputLabel>Employee</InputLabel>
              <Select
                value={formData.employee}
                onChange={(e) => setFormData({ ...formData, employee: e.target.value })}
                label="Employee"
              >
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.first_name} {employee.last_name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <TextField
              label="Start Time"
              type="datetime-local"
              value={formData.starts_at ? formatDateTimeLocalValue(formData.starts_at) : ''}
              onChange={(e) => setFormData({ ...formData, starts_at: formatDateTimeToISO(e.target.value) })}
              fullWidth
              required
              InputLabelProps={{
                shrink: true
              }}
              helperText="Select the start date and time for this shift"
            />
            
            <TextField
              label="End Time"
              type="datetime-local"
              value={formData.ends_at ? formatDateTimeLocalValue(formData.ends_at) : ''}
              onChange={(e) => setFormData({ ...formData, ends_at: formatDateTimeToISO(e.target.value) })}
              fullWidth
              required
              InputLabelProps={{
                shrink: true
              }}
              helperText="Select the end date and time for this shift"
            />

            <TextField
              label="Title (Optional)"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              fullWidth
            />

            <TextField
              label="Notes (Optional)"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              fullWidth
              multiline
              rows={3}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          {shift && (
            <Button 
              onClick={() => {
                onClose();
                onDelete(shift);
              }} 
              color="error" 
              variant="outlined"
              sx={{ mr: 'auto' }}
            >
              Delete Shift
            </Button>
          )}
          <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button 
            type="submit" 
            variant="contained" 
            disabled={isSubmitting || !formData.employee || !formData.starts_at || !formData.ends_at}
          >
            {isSubmitting ? <CircularProgress size={20} /> : (shift ? 'Update' : 'Add')} Shift
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// Employee Dialog Component
interface EmployeeDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (employeeData: { first_name: string; last_name: string; email: string }) => void;
  onDelete: (employee: Employee) => void;
  employee: Employee | null;
  isSubmitting: boolean;
}

function EmployeeDialog({ open, onClose, onSave, onDelete, employee, isSubmitting }: EmployeeDialogProps) {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });

  // Update form data when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email
      });
    } else {
      setFormData({
        first_name: '',
        last_name: '',
        email: ''
      });
    }
  }, [employee]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {employee ? 'Edit Employee' : 'Add New Employee'}
        <IconButton
          onClick={onClose}
          sx={{ position: 'absolute', right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              label="First Name"
              value={formData.first_name}
              onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
              fullWidth
              required
            />
            
            <TextField
              label="Last Name"
              value={formData.last_name}
              onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
              fullWidth
              required
            />

            <TextField
              label="Email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              fullWidth
              required
              helperText="Enter a valid email address"
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, pt: 1 }}>
          {employee && (
            <Button 
              onClick={() => {
                onClose();
                onDelete(employee);
              }} 
              color="error" 
              variant="outlined"
              disabled={isSubmitting}
            >
              Delete
            </Button>
          )}
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting || !formData.first_name || !formData.last_name || !formData.email}
          >
            {isSubmitting ? <CircularProgress size={20} /> : (employee ? 'Update' : 'Add')} Employee
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}