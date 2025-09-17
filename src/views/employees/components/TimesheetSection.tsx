import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  Stack,
  Typography,
  Button,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  Tooltip,
  Box,
  IconButton,
  Menu,
  MenuItem
} from '@mui/material';
import { FileDown, Link as LinkIcon, RefreshCw } from 'lucide-react';
import { EmployeeListItem } from 'types/employee';
import { TimeEntry } from 'api/employee.api';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import TimesheetSelector from './TimesheetSelector';
import StatsRow from './StatsRow';
import { useSelector, useDispatch } from 'store';
import { fetchEmployeeTimeEntries, fetchTimeEntries, clearTimeTrackingError } from 'store/slices/employee';

interface TimesheetSectionProps {
  isAdmin: boolean;
  dateRange: RangeValue;
  onDateRangeChange: (dateRange: RangeValue) => void;
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString() : '—');
const hhmm = (sec?: number | null) => {
  if (typeof sec !== 'number') return '—';
  if (sec < 60) return `${sec}s`;
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  return `${h}h ${m}m`;
};

const dayBoundsToUtc = (dateRange: RangeValue) => {
  const startUtc = new Date(`${dateRange.start.toString()}T00:00:00`);
  const endUtcExcl = new Date(`${dateRange.end.toString()}T00:00:00`);
  endUtcExcl.setDate(endUtcExcl.getDate() + 1);
  return { start: startUtc.toISOString(), end: endUtcExcl.toISOString() };
};

export default function TimesheetSection({ isAdmin, dateRange, onDateRangeChange }: TimesheetSectionProps) {
  const dispatch = useDispatch();
  const { allEmployees, loading: employeesLoading, timeTracking } = useSelector((state) => state.employee);

  // Internal state for employee selection - default to first employee for admins
  const [selectedTimesheetEmployee, setSelectedTimesheetEmployee] = useState<EmployeeListItem | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [copySuccess, setCopySuccess] = useState(false);
  const open = Boolean(anchorEl);

  const { timeEntries, loading, error } = timeTracking;

  // Refresh function
  const refreshTimeEntries = useCallback(async () => {
    dispatch(clearTimeTrackingError());

    if (isAdmin && selectedTimesheetEmployee) {
      // Admin mode: fetch timesheet for selected timesheet employee
      const { start, end } = dayBoundsToUtc(dateRange);
      dispatch(fetchEmployeeTimeEntries({ employee_id: selectedTimesheetEmployee.id, start, end }));
    } else if (!isAdmin) {
      // Member mode: fetch own timesheet
      const { start, end } = dayBoundsToUtc(dateRange);
      dispatch(fetchTimeEntries({ start, end }));
    }
  }, [dispatch, isAdmin, selectedTimesheetEmployee, dateRange]);

  // Set first employee as default when employees are loaded (for admins)
  useEffect(() => {
    if (isAdmin && allEmployees.length > 0 && !selectedTimesheetEmployee) {
      setSelectedTimesheetEmployee(allEmployees[0]);
    }
  }, [isAdmin, allEmployees, selectedTimesheetEmployee]);

  // Auto-refresh when employee selection or date range changes
  useEffect(() => {
    refreshTimeEntries();
  }, [selectedTimesheetEmployee, dateRange, refreshTimeEntries]);

  // Calculate stats
  const totalSec = timeEntries.reduce((acc, r) => {
    const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
    const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
    return acc + Math.max(0, Math.round((b - a) / 1000));
  }, 0);

  const recordsCount = timeEntries.length;

  const lastIn = timeEntries[timeEntries.length - 1]?.clock_in || null;
  const lastOut = timeEntries[timeEntries.length - 1]?.clock_out || null;
  const lastActivity = lastOut ? fmt(lastOut) : lastIn ? fmt(lastIn) : '—';

  // Internal functions
  const exportCsv = () => {
    const header = ['Clock In', 'Clock Out', 'Duration (sec)', 'Note'];
    const lines = timeEntries.map((r) => {
      const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
      const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
      const dur = Math.max(0, Math.round((b - a) / 1000));
      return [fmt(r.clock_in), fmt(r.clock_out), String(dur), r.note ?? ''].map((v) => `"${String(v).replace(/\"/g, '""')}"`).join(',');
    });
    const blob = new Blob([header.join(',') + '\n' + lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `timesheet_${selectedTimesheetEmployee?.id || 'my'}_${dateRange.start.toString()}_${dateRange.end.toString()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const copyShareLink = async () => {
    if (isAdmin && selectedTimesheetEmployee) {
      const origin = window.location.origin;
      const url = `${origin}/employees/clock?employee_id=${encodeURIComponent(selectedTimesheetEmployee.id)}&start=${encodeURIComponent(dateRange.start.toString())}&end=${encodeURIComponent(dateRange.end.toString())}`;
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

  const downloadPDF = () => {
    // TODO: Implement PDF download
    console.log('PDF download not implemented yet');
    handleClose();
  };

  const copyLink = () => {
    copyShareLink();
    handleClose();
  };

  return (
    <Card sx={{ borderRadius: 3 }}>
      <CardHeader
        titleTypographyProps={{ fontWeight: 700 }}
        title={
          isAdmin
            ? selectedTimesheetEmployee
              ? `${selectedTimesheetEmployee.full_name}'s Timesheet`
              : 'Employee Timesheet'
            : 'My Timesheet'
        }
        action={
          <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
            {/* Employee Selector - Only for Admin */}
            {isAdmin && (
              <Box sx={{ minWidth: 300 }}>
                <TimesheetSelector
                  employees={allEmployees}
                  selectedEmployee={selectedTimesheetEmployee}
                  onEmployeeChange={setSelectedTimesheetEmployee}
                  loading={employeesLoading}
                />
              </Box>
            )}

            {/* Date Range Picker */}
            <AllyviaDateRangePicker
              value={dateRange}
              onChange={(value: RangeValue | null) => {
                if (value) {
                  onDateRangeChange(value);
                }
              }}
            />

            {/* Action Buttons */}
            <Stack direction="row" gap={1} alignItems="center">
              {/* Download Menu */}
              <Tooltip title="Download Report">
                <IconButton onClick={handleClick} disabled={!timeEntries.length}>
                  <FileDown size={20} />
                </IconButton>
              </Tooltip>

              {/* Refresh Button */}
              <Tooltip title="Refresh Data">
                <IconButton onClick={refreshTimeEntries} disabled={loading}>
                  <RefreshCw size={20} />
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
        }
      />

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
          <FileDown size={18} style={{ marginRight: 8 }} />
          Download CSV Report
        </MenuItem>
        <MenuItem onClick={downloadPDF}>
          <FileDown size={18} style={{ marginRight: 8 }} />
          Download PDF Report
        </MenuItem>
        {isAdmin && selectedTimesheetEmployee && (
          <MenuItem onClick={copyLink}>
            <LinkIcon size={18} style={{ marginRight: 8 }} />
            Copy Share Link
          </MenuItem>
        )}
      </Menu>

      <CardContent sx={{ pt: 0 }}>
        {error && (
          <Typography color="error" sx={{ mb: 2 }}>
            {error}
          </Typography>
        )}

        {/* Stats Row */}
        <StatsRow totalDuration={hhmm(totalSec)} recordsCount={recordsCount} lastActivity={lastActivity} />
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Clock In</TableCell>
              <TableCell>Clock Out</TableCell>
              <TableCell>Duration</TableCell>
              <TableCell>Note</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {timeEntries.map((r) => {
              const a = r.clock_in ? new Date(r.clock_in).getTime() : 0;
              const b = r.clock_out ? new Date(r.clock_out).getTime() : a;
              const dur = Math.max(0, Math.round((b - a) / 1000));
              return (
                <TableRow key={r.id} hover>
                  <TableCell>{fmt(r.clock_in)}</TableCell>
                  <TableCell>{fmt(r.clock_out)}</TableCell>
                  <TableCell>{hhmm(dur)}</TableCell>
                  <TableCell>{r.note ?? '—'}</TableCell>
                </TableRow>
              );
            })}

            {/* Total row */}
            <TableRow>
              <TableCell colSpan={2}>
                <Typography fontWeight={700}>Total</Typography>
              </TableCell>
              <TableCell>
                <Typography fontWeight={700}>{hhmm(totalSec)}</Typography>
              </TableCell>
              <TableCell />
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
