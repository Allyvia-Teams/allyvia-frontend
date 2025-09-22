import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Grid,
  Card,
  CardContent,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Avatar,
  Badge,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Person as PersonIcon,
  Event as EventIcon,
  NavigateBefore as NavigateBeforeIcon,
  NavigateNext as NavigateNextIcon,
  Today as TodayIcon,
  Work as WorkIcon,
  Group as GroupIcon,
  Close as CloseIcon
} from '@mui/icons-material';
import { DatePicker, TimePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { enqueueSnackbar } from 'notistack';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import { useGetShifts, useGetMyShifts, useGetEmployees, shiftAPI, employeeAPI } from 'api/employee.api';
import { Shift, CreateShiftRequest, UpdateShiftRequest } from 'api/employee.api';
import { Employee } from 'types/employee';
import useAuth from 'hooks/useAuth';
import { canManageShifts } from 'api/role';

// Types
interface ShiftDialogData {
  id?: string;
  employee: string;
  starts_at: Date | null;
  ends_at: Date | null;
  title: string;
  notes: string;
}

interface EmployeeDialogData {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  title: string;
  address: string;
}

const CalendarPage = () => {
  const { user, currentRole } = useAuth();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'month' | 'week' | 'list'>('month');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [showShiftDialog, setShowShiftDialog] = useState(false);
  const [showEmployeeDialog, setShowEmployeeDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [shiftToDelete, setShiftToDelete] = useState<Shift | null>(null);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [employeeFilter, setEmployeeFilter] = useState<string>('all');

  // Form data
  const [shiftData, setShiftData] = useState<ShiftDialogData>({
    employee: '',
    starts_at: null,
    ends_at: null,
    title: '',
    notes: ''
  });

  const [employeeData, setEmployeeData] = useState<EmployeeDialogData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    address: ''
  });

  // Calculate date range for API calls
  const getDateRange = useCallback(() => {
    const start = new Date(currentDate);
    const end = new Date(currentDate);

    if (view === 'month') {
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    } else if (view === 'week') {
      const dayOfWeek = start.getDay();
      start.setDate(start.getDate() - dayOfWeek);
      end.setDate(start.getDate() + 6);
    } else {
      // List view - show current month
      start.setDate(1);
      end.setMonth(end.getMonth() + 1);
      end.setDate(0);
    }

    return {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0]
    };
  }, [currentDate, view]);

  const dateRange = getDateRange();

  // API calls
  const {
    shifts,
    isLoading: shiftsLoading,
    mutate: mutateShifts
  } = useGetShifts({
    start: dateRange.start,
    end: dateRange.end,
    company: currentRole?.company_id
  });

  const {
    shifts: myShifts,
    isLoading: myShiftsLoading,
    mutate: mutateMyShifts
  } = useGetMyShifts({
    start: dateRange.start,
    end: dateRange.end
  });

  // Use appropriate shifts based on role
  const displayShifts = currentRole?.role_type === 'member' ? myShifts : shifts;
  const isLoading = currentRole?.role_type === 'member' ? myShiftsLoading : shiftsLoading;

  const {
    employees,
    isLoading: employeesLoading,
    mutate: mutateEmployees
  } = useGetEmployees(currentRole?.company_id || '', employeeFilter === 'all' ? undefined : employeeFilter);

  // Event handlers
  const handleDateChange = (newDate: Date | null) => {
    if (newDate) {
      setCurrentDate(newDate);
    }
  };

  const handleViewChange = (event: React.MouseEvent<HTMLElement>, newView: 'month' | 'week' | 'list') => {
    if (newView !== null) {
      setView(newView);
    }
  };

  const handleAddShift = () => {
    setShiftData({
      employee: '',
      starts_at: selectedDate || new Date(),
      ends_at: selectedDate || new Date(),
      title: '',
      notes: ''
    });
    setShowShiftDialog(true);
  };

  const handleEditShift = (shift: Shift) => {
    setShiftData({
      id: shift.id,
      employee: shift.employee,
      starts_at: new Date(shift.starts_at),
      ends_at: new Date(shift.ends_at),
      title: shift.title || '',
      notes: shift.metadata?.notes || ''
    });
    setShowShiftDialog(true);
  };

  const handleDeleteShift = (shift: Shift | ShiftDialogData) => {
    // Convert ShiftDialogData to Shift format if needed
    const shiftToDelete: Shift = {
      id: shift.id || '',
      employee: shift.employee,
      employee_name: '',
      company: currentRole?.company_id || '',
      company_name: '',
      title: shift.title,
      starts_at: shift.starts_at instanceof Date ? shift.starts_at.toISOString() : shift.starts_at || '',
      ends_at: shift.ends_at instanceof Date ? shift.ends_at.toISOString() : shift.ends_at || '',
      metadata: { notes: 'notes' in shift ? shift.notes : '' }
    };
    setShiftToDelete(shiftToDelete);
    setShowDeleteDialog(true);
  };

  const handleSaveShift = async () => {
    try {
      if (!shiftData.employee || !shiftData.starts_at || !shiftData.ends_at) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
        return;
      }

      const shiftPayload: CreateShiftRequest | UpdateShiftRequest = {
        employee: shiftData.employee,
        starts_at: shiftData.starts_at.toISOString(),
        ends_at: shiftData.ends_at.toISOString(),
        title: shiftData.title,
        metadata: { notes: shiftData.notes }
      };

      if (shiftData.id) {
        // Update existing shift
        await shiftAPI.updateShift(shiftData.id, shiftPayload as UpdateShiftRequest);
        enqueueSnackbar('Shift updated successfully', { variant: 'success' });
      } else {
        // Create new shift
        const companyId = currentRole?.company_id || '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
        await shiftAPI.createShift({ ...shiftPayload, company: companyId } as CreateShiftRequest);
        enqueueSnackbar('Shift created successfully', { variant: 'success' });
      }

      setShowShiftDialog(false);
      setSelectedEmployees([]);
      if (currentRole?.role_type === 'member') {
        mutateMyShifts();
      } else {
        mutateShifts();
        mutateMyShifts();
      }
    } catch (error) {
      console.error('Error saving shift:', error);
      enqueueSnackbar('Failed to save shift', { variant: 'error' });
    }
  };

  const handleSaveEmployee = async () => {
    try {
      if (!employeeData.first_name || !employeeData.last_name || !employeeData.email) {
        enqueueSnackbar('Please fill in all required fields', { variant: 'error' });
        return;
      }

      const companyId = currentRole?.company_id || '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
      await employeeAPI.createEmployee(employeeData, companyId);
      enqueueSnackbar('Employee created successfully', { variant: 'success' });

      setShowEmployeeDialog(false);
      setEmployeeData({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        title: '',
        address: ''
      });
      mutateEmployees();
    } catch (error: any) {
      console.error('Error creating employee:', error);
      const errorMessage = error.response?.data?.non_field_errors?.[0] || error.response?.data?.email?.[0] || 'Failed to create employee';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleConfirmDeleteShift = async () => {
    if (!shiftToDelete) return;

    try {
      await shiftAPI.deleteShift(shiftToDelete.id);
      enqueueSnackbar('Shift deleted successfully', { variant: 'success' });
      setShowDeleteDialog(false);
      setShowShiftDialog(false); // Close the shift edit dialog
      setShiftToDelete(null);
      if (currentRole?.role_type === 'member') {
        mutateMyShifts();
      } else {
        mutateShifts();
        mutateMyShifts();
      }
    } catch (error) {
      console.error('Error deleting shift:', error);
      enqueueSnackbar('Failed to delete shift', { variant: 'error' });
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    try {
      const companyId = currentRole?.company_id || '2e20ab1c-3ac8-48c9-969a-39780519c861';
      await employeeAPI.deleteEmployee(employeeId, companyId);
      enqueueSnackbar('Employee deleted successfully', { variant: 'success' });
      mutateEmployees();
    } catch (error: any) {
      console.error('Error deleting employee:', error);
      const errorMessage = error.response?.data?.detail || 'Failed to delete employee';
      enqueueSnackbar(errorMessage, { variant: 'error' });
    }
  };

  const handleEmployeeClick = (employeeId: string) => {
    if (canManageShifts(currentRole?.role_type || '')) {
      setShiftData({
        employee: employeeId,
        starts_at: selectedDate || new Date(),
        ends_at: selectedDate || new Date(),
        title: '',
        notes: ''
      });
      setShowShiftDialog(true);
    }
  };

  // Generate calendar grid
  const generateCalendarGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    // Get previous month's days to fill the grid
    const prevMonth = new Date(year, month - 1, 0);
    const daysInPrevMonth = prevMonth.getDate();

    const calendarDays = [];

    // Add previous month's trailing days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      calendarDays.push({
        date: new Date(year, month - 1, day),
        isCurrentMonth: false,
        isToday: false
      });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = date.toDateString() === new Date().toDateString();
      calendarDays.push({
        date,
        isCurrentMonth: true,
        isToday
      });
    }

    // Add next month's leading days to complete the grid
    const remainingDays = 42 - calendarDays.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      calendarDays.push({
        date: new Date(year, month + 1, day),
        isCurrentMonth: false,
        isToday: false
      });
    }

    return calendarDays;
  };

  // Get shifts for a specific date
  const getShiftsForDate = (date: Date) => {
    if (!displayShifts) return [];

    const dateStr = date.toISOString().split('T')[0];
    return displayShifts.filter((shift) => {
      const shiftDate = new Date(shift.starts_at).toISOString().split('T')[0];
      return shiftDate === dateStr;
    });
  };

  // Render calendar grid
  const renderCalendarGrid = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      );
    }

    const calendarDays = generateCalendarGrid();
    const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    return (
      <Box>
        {/* Week day headers */}
        <Box display="flex" sx={{ mb: 1 }}>
          {weekDays.map((day) => (
            <Box
              key={day}
              sx={{
                flex: 1,
                p: 1,
                textAlign: 'center',
                fontWeight: 'bold',
                color: 'text.secondary',
                borderBottom: '1px solid',
                borderColor: 'divider'
              }}
            >
              {day}
            </Box>
          ))}
        </Box>

        {/* Calendar grid */}
        <Box display="flex" flexWrap="wrap">
          {calendarDays.map((day, index) => {
            const shifts = getShiftsForDate(day.date);
            const isSelected = selectedDate && day.date.toDateString() === selectedDate.toDateString();

            return (
              <Box
                key={index}
                sx={{
                  width: '14.28%',
                  minHeight: 120,
                  p: 1,
                  border: '1px solid',
                  borderColor: 'divider',
                  cursor: 'pointer',
                  position: 'relative',
                  backgroundColor: day.isCurrentMonth ? 'background.paper' : 'grey.50',
                  '&:hover': {
                    backgroundColor: 'action.hover'
                  },
                  ...(isSelected && {
                    backgroundColor: 'primary.light',
                    color: 'primary.contrastText'
                  }),
                  ...(day.isToday && {
                    backgroundColor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiTypography-root': {
                      color: 'primary.contrastText'
                    }
                  })
                }}
                onClick={() => {
                  setSelectedDate(day.date);
                  if (canManageShifts(currentRole?.role_type || '')) {
                    handleAddShift();
                  }
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    fontWeight: day.isToday ? 'bold' : 'normal',
                    color: day.isCurrentMonth ? 'text.primary' : 'text.secondary',
                    mb: 1
                  }}
                >
                  {day.date.getDate()}
                </Typography>

                {/* Render shifts for this date */}
                {shifts.slice(0, 3).map((shift) => (
                  <Box
                    key={shift.id}
                    sx={{
                      backgroundColor: 'primary.main',
                      color: 'primary.contrastText',
                      p: 0.5,
                      mb: 0.5,
                      borderRadius: 1,
                      fontSize: '0.75rem',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: 'primary.dark'
                      }
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (canManageShifts(currentRole?.role_type || '')) {
                        handleEditShift(shift);
                      }
                    }}
                  >
                    <Typography variant="caption" noWrap>
                      {shift.employee_name || 'Employee'}{' '}
                      {new Date(shift.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </Typography>
                  </Box>
                ))}

                {/* Show "+X more" if there are more than 3 shifts */}
                {shifts.length > 3 && (
                  <Typography variant="caption" color="text.secondary">
                    +{shifts.length - 3} more
                  </Typography>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>
    );
  };

  // Render list view for shifts
  const renderListView = () => {
    if (isLoading) {
      return (
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="200px">
          <CircularProgress />
        </Box>
      );
    }

    if (!displayShifts || displayShifts.length === 0) {
      return (
        <Box textAlign="center" py={4}>
          <EventIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No shifts scheduled
          </Typography>
          {canManageShifts(currentRole?.role_type || '') && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={handleAddShift} sx={{ mt: 2 }}>
              Add Shift
            </Button>
          )}
        </Box>
      );
    }

    return displayShifts.map((shift) => (
      <Card key={shift.id} sx={{ mb: 2 }}>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box flex={1}>
              <Typography variant="h6" gutterBottom>
                {shift.title || 'Shift'}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {new Date(shift.starts_at).toLocaleDateString()} - {new Date(shift.starts_at).toLocaleTimeString()} to{' '}
                {new Date(shift.ends_at).toLocaleTimeString()}
              </Typography>
              {shift.metadata?.notes && (
                <Typography variant="body2" color="text.secondary">
                  {shift.metadata.notes}
                </Typography>
              )}
            </Box>
            {canManageShifts(currentRole?.role_type || '') && (
              <Box>
                <IconButton size="small" onClick={() => handleEditShift(shift)} sx={{ mr: 1 }}>
                  <EditIcon />
                </IconButton>
                <IconButton size="small" onClick={() => handleDeleteShift(shift)} color="error">
                  <DeleteIcon />
                </IconButton>
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>
    ));
  };

  // Render events based on view
  const renderEvents = () => {
    if (view === 'month') {
      return renderCalendarGrid();
    } else if (view === 'week') {
      return renderListView(); // For now, use list view for week
    } else {
      return renderListView();
    }
  };

  // Render employee summary
  const renderEmployeeSummary = () => {
    if (!employees || employees.length === 0) {
      return (
        <Box textAlign="center" py={2}>
          <Typography variant="body2" color="text.secondary">
            No employees found
          </Typography>
        </Box>
      );
    }

    const totalShifts = displayShifts ? displayShifts.length : 0;

    return (
      <Box>
        {/* Employee Summary Stats */}
        <Box mb={3}>
          <Typography variant="h6" gutterBottom>
            Employee Summary
          </Typography>
          <Box display="flex" gap={2}>
            <Box flex={1} textAlign="center" p={2} sx={{ backgroundColor: 'primary.light', borderRadius: 1 }}>
              <PersonIcon sx={{ fontSize: 24, mb: 1 }} />
              <Typography variant="h6">{employees.length}</Typography>
              <Typography variant="caption">Employees</Typography>
            </Box>
            <Box flex={1} textAlign="center" p={2} sx={{ backgroundColor: 'secondary.light', borderRadius: 1 }}>
              <WorkIcon sx={{ fontSize: 24, mb: 1 }} />
              <Typography variant="h6">{totalShifts}</Typography>
              <Typography variant="caption">Total Shifts</Typography>
            </Box>
          </Box>
        </Box>

        {/* Active Employees */}
        <Box mb={2}>
          <Typography variant="subtitle1" gutterBottom>
            Active Employees:
          </Typography>
          <Box display="flex" flexWrap="wrap" gap={1}>
            {employees.slice(0, 6).map((employee) => (
              <Chip
                key={employee.id}
                label={`${employee.first_name} ${employee.last_name}`}
                size="small"
                variant="outlined"
                onClick={() => canManageShifts(currentRole?.role_type || '') && handleEmployeeClick(employee.id)}
                sx={{ cursor: canManageShifts(currentRole?.role_type || '') ? 'pointer' : 'default' }}
              />
            ))}
            {employees.length > 6 && <Chip label={`+${employees.length - 6} more`} size="small" variant="outlined" color="secondary" />}
          </Box>
        </Box>

        {/* User Info */}
        <Box mb={3} p={2} sx={{ backgroundColor: 'grey.100', borderRadius: 1 }}>
          <Typography variant="body2" color="text.secondary">
            Logged in as: {user?.email || 'Unknown'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Role: {canManageShifts(currentRole?.role_type || '') ? 'Admin/Manager' : 'Member'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Permissions: {canManageShifts(currentRole?.role_type || '') ? 'Create, Edit, Delete' : 'View Only'}
          </Typography>
        </Box>

        {/* Read-only access notification for members */}
        {!canManageShifts(currentRole?.role_type || '') && (
          <Alert severity="info" sx={{ mb: 2 }}>
            You have read-only access. Contact your administrator to create or edit shifts.
          </Alert>
        )}

        {/* Action Buttons */}
        {canManageShifts(currentRole?.role_type || '') && (
          <Box>
            <Button fullWidth variant="contained" startIcon={<AddIcon />} onClick={handleAddShift} sx={{ mb: 1 }}>
              + New Shift
            </Button>
            <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => setShowEmployeeDialog(true)}>
              + Add Employee
            </Button>
          </Box>
        )}

        {/* Employee List - Only show for admin/manager */}
        {canManageShifts(currentRole?.role_type || '') && (
          <Box mt={3}>
            <Typography variant="h6" gutterBottom>
              Employee Management
            </Typography>
            <List dense>
              {employees.map((employee) => (
                <ListItem
                  key={employee.id}
                  onClick={() => handleEmployeeClick(employee.id)}
                  sx={{
                    borderRadius: 1,
                    mb: 1,
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: 'action.hover'
                    }
                  }}
                >
                  <ListItemIcon>
                    <Avatar sx={{ width: 32, height: 32 }}>
                      {employee.first_name.charAt(0)}
                      {employee.last_name.charAt(0)}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText primary={`${employee.first_name} ${employee.last_name}`} secondary={employee.title || employee.email} />
                  <Box>
                    <IconButton size="small" sx={{ mr: 1 }}>
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteEmployee(employee.id);
                      }}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </ListItem>
              ))}
            </List>
          </Box>
        )}
      </Box>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MainCard title="Employee Scheduling">
        <Box>
          {/* Calendar Controls */}
          <Box mb={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Box display="flex" alignItems="center" gap={2}>
                <Button
                  variant="outlined"
                  startIcon={<NavigateBeforeIcon />}
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() - (view === 'month' ? 30 : 7) * 24 * 60 * 60 * 1000))}
                >
                  Previous
                </Button>
                <Button variant="outlined" startIcon={<TodayIcon />} onClick={() => setCurrentDate(new Date())}>
                  Today
                </Button>
                <Button
                  variant="outlined"
                  endIcon={<NavigateNextIcon />}
                  onClick={() => setCurrentDate(new Date(currentDate.getTime() + (view === 'month' ? 30 : 7) * 24 * 60 * 60 * 1000))}
                >
                  Next
                </Button>
              </Box>

              <Typography variant="h5">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric'
                })}
              </Typography>

              <ToggleButtonGroup value={view} exclusive onChange={handleViewChange} size="small">
                <ToggleButton value="month">Month</ToggleButton>
                <ToggleButton value="week">Week</ToggleButton>
                <ToggleButton value="list">List</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {/* Main Content */}
          <Box display="flex" gap={3} flexWrap="wrap">
            {/* Employee Summary */}
            <Box flex={{ xs: '1 1 100%', md: '1 1 30%' }} minWidth={300}>
              <Paper sx={{ p: 2, height: 'fit-content' }}>{renderEmployeeSummary()}</Paper>
            </Box>

            {/* Calendar Events */}
            <Box flex={{ xs: '1 1 100%', md: '1 1 65%' }} minWidth={400}>
              <Paper sx={{ p: 2, minHeight: 400 }}>{renderEvents()}</Paper>
            </Box>
          </Box>
        </Box>

        {/* Shift Dialog */}
        <Dialog open={showShiftDialog} onClose={() => setShowShiftDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{shiftData.id ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Box mb={2}>
                <FormControl fullWidth required>
                  <InputLabel>Employee</InputLabel>
                  <Select
                    value={shiftData.employee}
                    onChange={(e) => setShiftData({ ...shiftData, employee: e.target.value })}
                    label="Employee"
                  >
                    {employees?.map((employee) => (
                      <MenuItem key={employee.id} value={employee.id}>
                        {employee.first_name} {employee.last_name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>

              <Box display="flex" gap={2} mb={2}>
                <Box flex={1}>
                  <DatePicker
                    label="Start Date"
                    value={shiftData.starts_at}
                    onChange={(date) => setShiftData({ ...shiftData, starts_at: date })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Box>
                <Box flex={1}>
                  <TimePicker
                    label="Start Time"
                    value={shiftData.starts_at}
                    onChange={(time) => setShiftData({ ...shiftData, starts_at: time })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Box>
              </Box>

              <Box display="flex" gap={2} mb={2}>
                <Box flex={1}>
                  <DatePicker
                    label="End Date"
                    value={shiftData.ends_at}
                    onChange={(date) => setShiftData({ ...shiftData, ends_at: date })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Box>
                <Box flex={1}>
                  <TimePicker
                    label="End Time"
                    value={shiftData.ends_at}
                    onChange={(time) => setShiftData({ ...shiftData, ends_at: time })}
                    slotProps={{ textField: { fullWidth: true, required: true } }}
                  />
                </Box>
              </Box>

              <Box mb={2}>
                <TextField
                  fullWidth
                  label="Title"
                  value={shiftData.title}
                  onChange={(e) => setShiftData({ ...shiftData, title: e.target.value })}
                />
              </Box>

              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={shiftData.notes}
                  onChange={(e) => setShiftData({ ...shiftData, notes: e.target.value })}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowShiftDialog(false)}>Cancel</Button>
            {shiftData.id && canManageShifts(currentRole?.role_type || '') && (
              <Button onClick={() => handleDeleteShift(shiftData)} color="error" variant="outlined">
                Delete
              </Button>
            )}
            <Button onClick={handleSaveShift} variant="contained">
              {shiftData.id ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Employee Dialog */}
        <Dialog open={showEmployeeDialog} onClose={() => setShowEmployeeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogContent>
            <Box sx={{ mt: 1 }}>
              <Box display="flex" gap={2} mb={2}>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    required
                    label="First Name"
                    value={employeeData.first_name}
                    onChange={(e) => setEmployeeData({ ...employeeData, first_name: e.target.value })}
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    required
                    label="Last Name"
                    value={employeeData.last_name}
                    onChange={(e) => setEmployeeData({ ...employeeData, last_name: e.target.value })}
                  />
                </Box>
              </Box>

              <Box mb={2}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email"
                  value={employeeData.email}
                  onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                />
              </Box>

              <Box display="flex" gap={2} mb={2}>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Phone"
                    value={employeeData.phone}
                    onChange={(e) => setEmployeeData({ ...employeeData, phone: e.target.value })}
                  />
                </Box>
                <Box flex={1}>
                  <TextField
                    fullWidth
                    label="Title"
                    value={employeeData.title}
                    onChange={(e) => setEmployeeData({ ...employeeData, title: e.target.value })}
                  />
                </Box>
              </Box>

              <Box>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Address"
                  value={employeeData.address}
                  onChange={(e) => setEmployeeData({ ...employeeData, address: e.target.value })}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowEmployeeDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEmployee} variant="contained">
              Create Employee
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            <Typography>Are you sure you want to delete this shift? This action cannot be undone.</Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleConfirmDeleteShift} color="error" variant="contained">
              Delete
            </Button>
          </DialogActions>
        </Dialog>
      </MainCard>
    </LocalizationProvider>
  );
};

export default CalendarPage;
