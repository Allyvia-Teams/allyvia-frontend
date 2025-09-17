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
  const { user } = useAuth();
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
    company: user?.company_id
  });

  const {
    shifts: myShifts,
    isLoading: myShiftsLoading,
    mutate: mutateMyShifts
  } = useGetMyShifts({
    start: dateRange.start,
    end: dateRange.end
  });

  const {
    employees,
    isLoading: employeesLoading,
    mutate: mutateEmployees
  } = useGetEmployees(user?.company_id || '', employeeFilter === 'all' ? undefined : employeeFilter);

  // Determine which shifts to show based on user role
  const displayShifts = canManageShifts(user?.role_type || '') ? shifts : myShifts;
  const isLoading = canManageShifts(user?.role_type || '') ? shiftsLoading : myShiftsLoading;

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

  const handleDeleteShift = (shift: Shift) => {
    setShiftToDelete(shift);
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
        const companyId = user?.company_id || '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
        await shiftAPI.createShift({ ...shiftPayload, company: companyId } as CreateShiftRequest);
        enqueueSnackbar('Shift created successfully', { variant: 'success' });
      }

      setShowShiftDialog(false);
      setSelectedEmployees([]);
      mutateShifts();
      mutateMyShifts();
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

      const companyId = user?.company_id || '2e20ab1c-3ac8-48c9-969a-39780519c861'; // Test Company
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
    } catch (error) {
      console.error('Error creating employee:', error);
      enqueueSnackbar('Failed to create employee', { variant: 'error' });
    }
  };

  const handleConfirmDeleteShift = async () => {
    if (!shiftToDelete) return;

    try {
      await shiftAPI.deleteShift(shiftToDelete.id);
      enqueueSnackbar('Shift deleted successfully', { variant: 'success' });
      setShowDeleteDialog(false);
      setShiftToDelete(null);
      mutateShifts();
      mutateMyShifts();
    } catch (error) {
      console.error('Error deleting shift:', error);
      enqueueSnackbar('Failed to delete shift', { variant: 'error' });
    }
  };

  const handleEmployeeClick = (employeeId: string) => {
    if (canManageShifts(user?.role_type || '')) {
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

  // Render calendar events
  const renderEvents = () => {
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
          {canManageShifts(user?.role_type || '') && (
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
            {canManageShifts(user?.role_type || '') && (
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

    return (
      <Box>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Employees ({employees.length})</Typography>
          {canManageShifts(user?.role_type || '') && (
            <Box>
              <Button size="small" startIcon={<AddIcon />} onClick={() => setShowEmployeeDialog(true)} sx={{ mr: 1 }}>
                Add Employee
              </Button>
              <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={handleAddShift}>
                Add Shift
              </Button>
            </Box>
          )}
        </Box>
        <List dense>
          {employees.map((employee) => (
            <ListItem
              key={employee.id}
              button={canManageShifts(user?.role_type || '')}
              onClick={() => canManageShifts(user?.role_type || '') && handleEmployeeClick(employee.id)}
            >
              <ListItemIcon>
                <Avatar sx={{ width: 32, height: 32 }}>
                  {employee.first_name.charAt(0)}
                  {employee.last_name.charAt(0)}
                </Avatar>
              </ListItemIcon>
              <ListItemText primary={`${employee.first_name} ${employee.last_name}`} secondary={employee.title || employee.email} />
            </ListItem>
          ))}
        </List>
      </Box>
    );
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <MainCard title="Employee Scheduling">
        <Grid container spacing={3}>
          {/* Calendar Controls */}
          <Grid item xs={12}>
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
          </Grid>

          {/* Employee Summary */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: 'fit-content' }}>{renderEmployeeSummary()}</Paper>
          </Grid>

          {/* Calendar Events */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, minHeight: 400 }}>{renderEvents()}</Paper>
          </Grid>
        </Grid>

        {/* Shift Dialog */}
        <Dialog open={showShiftDialog} onClose={() => setShowShiftDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>{shiftData.id ? 'Edit Shift' : 'Add New Shift'}</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12}>
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
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Start Date"
                  value={shiftData.starts_at}
                  onChange={(date) => setShiftData({ ...shiftData, starts_at: date })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="Start Time"
                  value={shiftData.starts_at}
                  onChange={(time) => setShiftData({ ...shiftData, starts_at: time })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="End Date"
                  value={shiftData.ends_at}
                  onChange={(date) => setShiftData({ ...shiftData, ends_at: date })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TimePicker
                  label="End Time"
                  value={shiftData.ends_at}
                  onChange={(time) => setShiftData({ ...shiftData, ends_at: time })}
                  renderInput={(params) => <TextField {...params} fullWidth required />}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Title"
                  value={shiftData.title}
                  onChange={(e) => setShiftData({ ...shiftData, title: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Notes"
                  value={shiftData.notes}
                  onChange={(e) => setShiftData({ ...shiftData, notes: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowShiftDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveShift} variant="contained">
              {shiftData.id ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Employee Dialog */}
        <Dialog open={showEmployeeDialog} onClose={() => setShowEmployeeDialog(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add New Employee</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="First Name"
                  value={employeeData.first_name}
                  onChange={(e) => setEmployeeData({ ...employeeData, first_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Last Name"
                  value={employeeData.last_name}
                  onChange={(e) => setEmployeeData({ ...employeeData, last_name: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  required
                  type="email"
                  label="Email"
                  value={employeeData.email}
                  onChange={(e) => setEmployeeData({ ...employeeData, email: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Phone"
                  value={employeeData.phone}
                  onChange={(e) => setEmployeeData({ ...employeeData, phone: e.target.value })}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Title"
                  value={employeeData.title}
                  onChange={(e) => setEmployeeData({ ...employeeData, title: e.target.value })}
                />
              </Grid>

              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={2}
                  label="Address"
                  value={employeeData.address}
                  onChange={(e) => setEmployeeData({ ...employeeData, address: e.target.value })}
                />
              </Grid>
            </Grid>
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
