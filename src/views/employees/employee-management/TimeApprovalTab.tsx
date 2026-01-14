// Time Approval Tab Component
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Button,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { IconCheck, IconX, IconLock, IconCalendar } from '@tabler/icons-react';
import { useSnackbar } from 'notistack';
import { getAdminShifts, approveShift, rejectShift, lockShift, TimeEntry } from 'api/employee.api';
import { formatDate as formatDateUtil } from 'utils/dateUtils';
import { AllyviaDateRangePicker, RangeValue } from 'ui-component/third-party/DateRangePicker';
import { today, getLocalTimeZone, parseDate, CalendarDate } from '@internationalized/date';

interface TimeApprovalTabProps {
  isAdmin: boolean;
}

// Helper function to get Monday of a week (week starts on Monday)
function getMondayOfWeek(date: CalendarDate): CalendarDate {
  const dayOfWeek = date.dayOfWeek;
  const daysToMonday = dayOfWeek === 1 ? 0 : dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return date.subtract({ days: daysToMonday });
}

// Helper function to get Sunday of a week
function getSundayOfWeek(date: CalendarDate): CalendarDate {
  const monday = getMondayOfWeek(date);
  return monday.add({ days: 6 });
}

// Helper to convert CalendarDate to string (YYYY-MM-DD)
function dateToString(date: CalendarDate): string {
  return `${date.year}-${String(date.month).padStart(2, '0')}-${String(date.day).padStart(2, '0')}`;
}


export default function TimeApprovalTab({ isAdmin }: TimeApprovalTabProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [shifts, setShifts] = useState<TimeEntry[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Get current week (Monday to Sunday)
  const todayDate = today(getLocalTimeZone());
  const currentWeekMonday = getMondayOfWeek(todayDate);
  const currentWeekSunday = getSundayOfWeek(todayDate);
  
  // Initialize with current week
  const [weekRange, setWeekRange] = useState<RangeValue>({
    start: currentWeekMonday,
    end: currentWeekSunday
  });
  
  // Calculate payPeriod (Monday of the selected week)
  const payPeriod = useMemo(() => {
    return dateToString(weekRange.start);
  }, [weekRange]);
  
  const [actionDialog, setActionDialog] = useState<{
    open: boolean;
    type: 'approve' | 'reject' | 'lock' | null;
    shift: TimeEntry | null;
    reason: string;
  }>({
    open: false,
    type: null,
    shift: null,
    reason: ''
  });

  // Load shifts when pay period changes
  useEffect(() => {
    if (isAdmin) {
      loadShifts();
    }
  }, [payPeriod, isAdmin]);

  const loadShifts = async () => {
    setLoading(true);
    try {
      const response = await getAdminShifts({ payPeriod });
      setShifts(response.data);
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.detail || 'Failed to load shifts', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = (shift: TimeEntry) => {
    setActionDialog({
      open: true,
      type: 'approve',
      shift,
      reason: ''
    });
  };

  const handleReject = (shift: TimeEntry) => {
    setActionDialog({
      open: true,
      type: 'reject',
      shift,
      reason: ''
    });
  };

  const handleLock = (shift: TimeEntry) => {
    setActionDialog({
      open: true,
      type: 'lock',
      shift,
      reason: ''
    });
  };

  const confirmAction = async () => {
    if (!actionDialog.shift || !actionDialog.type) return;

    try {
      let response;
      switch (actionDialog.type) {
        case 'approve':
          response = await approveShift(actionDialog.shift.id, actionDialog.reason);
          enqueueSnackbar('Shift approved successfully', { variant: 'success' });
          break;
        case 'reject':
          if (!actionDialog.reason.trim()) {
            enqueueSnackbar('Rejection reason is required', { variant: 'error' });
            return;
          }
          response = await rejectShift(actionDialog.shift.id, actionDialog.reason);
          enqueueSnackbar('Shift rejected successfully', { variant: 'success' });
          break;
        case 'lock':
          response = await lockShift(actionDialog.shift.id, actionDialog.reason);
          enqueueSnackbar('Shift locked successfully', { variant: 'success' });
          break;
      }
      
      // Update the shift in the list
      if (response?.data) {
        setShifts((prev) => prev.map((s) => (s.id === actionDialog.shift!.id ? response.data : s)));
      }
      
      setActionDialog({ open: false, type: null, shift: null, reason: '' });
    } catch (error: any) {
      enqueueSnackbar(error.response?.data?.detail || 'Failed to perform action', { variant: 'error' });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default';
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      case 'locked':
        return 'info';
      default:
        return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pending';
      case 'approved':
        return 'Approved';
      case 'rejected':
        return 'Rejected';
      case 'locked':
        return 'Locked';
      default:
        return status;
    }
  };

  // Handle week selection - ensure it's a full week (Monday to Sunday)
  const handleWeekChange = (range: RangeValue | null) => {
    if (!range) return;
    
    // Ensure the range is a full week (Monday to Sunday)
    const monday = getMondayOfWeek(range.start);
    const sunday = getSundayOfWeek(range.start);
    
    // Prevent selecting future weeks (beyond today)
    const todayDate = today(getLocalTimeZone());
    
    // If the selected week's Monday is in the future, restrict to current week
    if (monday.compare(todayDate) > 0) {
      enqueueSnackbar('Cannot select weeks in the future. Please select the current week or a past week.', { variant: 'warning' });
      // Set to current week if trying to select future week
      const currentWeekMonday = getMondayOfWeek(todayDate);
      setWeekRange({
        start: currentWeekMonday,
        end: getSundayOfWeek(currentWeekMonday)
      });
      return;
    }
    
    setWeekRange({
      start: monday,
      end: sunday
    });
  };
  
  // Get max date (prevent selecting future dates - allow up to today)
  const maxDate = todayDate;
  
  // Get min date (allow all past weeks - no restriction)
  const minDate = undefined;

  if (!isAdmin) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Alert severity="info">You need admin permissions to access this feature.</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 3, alignItems: 'center' }}>
        <Grid item xs={12} sm={6} md={5}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" sx={{ minWidth: '120px' }}>
              Select Week:
            </Typography>
            <Box sx={{ flex: 1, maxWidth: '400px' }}>
              <AllyviaDateRangePicker
                value={weekRange}
                onChange={handleWeekChange}
                label=""
                minDate={minDate}
                maxDate={maxDate}
                sx={{
                  '& .date-range-picker-group': {
                    width: '100%'
                  }
                }}
              />
            </Box>
          </Box>
          <Typography variant="caption" color="textSecondary" sx={{ mt: 0.5, ml: '136px', display: 'block' }}>
            Week: {weekRange.start.month}/{weekRange.start.day} - {weekRange.end.month}/{weekRange.end.day}/{weekRange.end.year}
          </Typography>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Button
            variant="outlined"
            startIcon={<IconCalendar size={18} />}
            onClick={loadShifts}
            disabled={loading}
            fullWidth
          >
            Refresh
          </Button>
        </Grid>
      </Grid>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
          <CircularProgress />
        </Box>
      ) : shifts.length === 0 ? (
        <Box sx={{ textAlign: 'center', p: 4 }}>
          <Typography variant="body1" color="textSecondary">
            No shifts found for this pay period.
          </Typography>
        </Box>
      ) : (
        <TableContainer component={Paper} elevation={0}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Employee</TableCell>
                <TableCell>Date</TableCell>
                <TableCell>Clock In</TableCell>
                <TableCell>Clock Out</TableCell>
                <TableCell>Duration</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Approved By</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {shifts.map((shift) => (
                <TableRow key={shift.id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight="medium">
                      {shift.employee_full_name || shift.employee || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatDateUtil(shift.clock_in, 'MMM DD, YYYY')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {shift.clock_in_formatted || formatDateUtil(new Date(shift.clock_in), 'hh:mm A')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {shift.clock_out_formatted || (shift.clock_out ? formatDateUtil(new Date(shift.clock_out), 'hh:mm A') : '—')}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {shift.duration_formatted || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getStatusLabel(shift.approval_status)}
                      size="small"
                      color={getStatusColor(shift.approval_status) as any}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="textSecondary">
                      {shift.approved_by_name || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      {shift.approval_status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            startIcon={<IconCheck size={16} />}
                            onClick={() => handleApprove(shift)}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            Approve
                          </Button>
                          <Button
                            size="small"
                            variant="contained"
                            color="error"
                            startIcon={<IconX size={16} />}
                            onClick={() => handleReject(shift)}
                            sx={{ minWidth: 'auto', px: 1 }}
                          >
                            Reject
                          </Button>
                        </>
                      )}
                      {shift.approval_status === 'approved' && !shift.is_locked && (
                        <Button
                          size="small"
                          variant="contained"
                          color="info"
                          startIcon={<IconLock size={16} />}
                          onClick={() => handleLock(shift)}
                          sx={{ minWidth: 'auto', px: 1 }}
                        >
                          Lock
                        </Button>
                      )}
                      {shift.is_locked && (
                        <Typography variant="caption" color="textSecondary">
                          Locked
                        </Typography>
                      )}
                      {shift.approval_status === 'rejected' && (
                        <Typography variant="caption" color="error">
                          {shift.rejection_reason || 'Rejected'}
                        </Typography>
                      )}
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Action Confirmation Dialog */}
      <Dialog open={actionDialog.open} onClose={() => setActionDialog({ open: false, type: null, shift: null, reason: '' })} maxWidth="sm" fullWidth>
        <DialogTitle>
          {actionDialog.type === 'approve' && 'Approve Shift'}
          {actionDialog.type === 'reject' && 'Reject Shift'}
          {actionDialog.type === 'lock' && 'Lock Shift'}
        </DialogTitle>
        <DialogContent>
          {actionDialog.shift && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Employee: {actionDialog.shift.employee_full_name || actionDialog.shift.employee}
              </Typography>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Date: {formatDateUtil(actionDialog.shift.clock_in, 'MMM DD, YYYY')}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Duration: {actionDialog.shift.duration_formatted || '—'}
              </Typography>
            </Box>
          )}
          {actionDialog.type === 'reject' && (
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Rejection Reason *"
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              required
              sx={{ mt: 2 }}
            />
          )}
          {(actionDialog.type === 'approve' || actionDialog.type === 'lock') && (
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Note (Optional)"
              value={actionDialog.reason}
              onChange={(e) => setActionDialog({ ...actionDialog, reason: e.target.value })}
              sx={{ mt: 2 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setActionDialog({ open: false, type: null, shift: null, reason: '' })}>
            Cancel
          </Button>
          <Button
            onClick={confirmAction}
            variant="contained"
            color={actionDialog.type === 'reject' ? 'error' : actionDialog.type === 'lock' ? 'info' : 'success'}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

