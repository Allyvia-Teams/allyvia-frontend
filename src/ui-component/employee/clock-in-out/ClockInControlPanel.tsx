import { Box, Stack, Typography, Button, TextField, CircularProgress } from '@mui/material';
import AllyviaFilterSelect from 'ui-component/common/AllyviaFilterSelect';
import { Login as LoginIcon, Logout as LogoutIcon, Error as ErrorIcon } from '@mui/icons-material';
import { EmployeeListItem } from 'types/employee';

interface ClockInControlPanelProps {
  // Employee Selection Props
  employees: EmployeeListItem[];
  selectedEmployee: EmployeeListItem | null;
  onEmployeeChange: (employee: EmployeeListItem | null) => void;
  employeesLoading: boolean;

  // Clock Actions Props
  status: 'in' | 'out';
  loading: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  onClockIn: () => void;
  onClockOut: () => void;
  error?: string | null;
  isAdmin: boolean;
}

export default function ClockInControlPanel({
  employees,
  selectedEmployee,
  onEmployeeChange,
  employeesLoading,
  status,
  loading,
  note,
  onNoteChange,
  onClockIn,
  onClockOut,
  error,
  isAdmin
}: ClockInControlPanelProps) {
  const hasSelectedEmployee = !!selectedEmployee;
  const hasEmployees = employees.length > 0;
  const canPerformActions = !isAdmin || (hasSelectedEmployee && hasEmployees);
  return (
    <>
      <Stack direction="row" alignItems="flex-start" gap={3}>
        {/* Employee Selection - Only for Admin */}
        {isAdmin && (
          <Box sx={{ minWidth: 300 }}>
            <AllyviaFilterSelect
              width={300}
              value={selectedEmployee?.id || ''}
              onChange={(e) => {
                const next = employees.find((emp) => emp.id === e.target.value) || null;
                onEmployeeChange(next);
              }}
              options={employees.map((emp) => ({ value: emp.id, label: emp.full_name }))}
              placeholder="Select Employee"
              disabled={employeesLoading || employees.length === 0}
              MenuProps={{
                disableScrollLock: false,
                disablePortal: false,
                MenuListProps: {
                  onWheel: (e: React.WheelEvent) => {
                    e.stopPropagation();
                  },
                  onTouchMove: (e: React.TouchEvent) => {
                    e.stopPropagation();
                  }
                },
                PaperProps: {
                  sx: { maxHeight: 320, overflowY: 'auto' },
                  onWheelCapture: (e: React.WheelEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                  },
                  onTouchMoveCapture: (e: React.TouchEvent) => {
                    e.stopPropagation();
                    e.preventDefault();
                  }
                }
              }}
            />
          </Box>
        )}

        {/* Clock Actions */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
            {status === 'out' ? (
              <Button
                onClick={onClockIn}
                disabled={!canPerformActions || loading}
                variant="contained"
                startIcon={<LoginIcon />}
                sx={{
                  borderRadius: 2,
                  bgcolor: 'primary.main',
                  color: 'white',
                  '&:hover': {
                    bgcolor: 'primary.dark',
                    color: 'white'
                  },
                  '& .MuiSvgIcon-root': {
                    color: 'white'
                  }
                }}
              >
                {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Clock In'}
              </Button>
            ) : (
              <>
                <TextField
                  label="Note (optional)"
                  size="small"
                  value={note}
                  onChange={(e) => onNoteChange(e.target.value)}
                  sx={{ minWidth: 220 }}
                  disabled={!canPerformActions}
                />
                <Button
                  onClick={onClockOut}
                  disabled={!canPerformActions || loading}
                  variant="contained"
                  startIcon={<LogoutIcon />}
                  sx={{
                    borderRadius: 2,
                    bgcolor: 'error.main',
                    color: 'white',
                    '&:hover': {
                      bgcolor: 'error.dark',
                      color: 'white'
                    },
                    '& .MuiSvgIcon-root': {
                      color: 'white'
                    }
                  }}
                >
                  {loading ? <CircularProgress size={16} sx={{ color: 'white' }} /> : 'Clock Out'}
                </Button>
              </>
            )}
            {!canPerformActions && (
              <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                Select an employee above to manage their clock in/out
              </Typography>
            )}
          </Stack>

          {error && (
            <Stack direction="row" alignItems="center" gap={1.25} sx={{ mt: 2, color: 'error.main' }}>
              <ErrorIcon />
              <Typography variant="body2">
                {error.includes('Duration too short')
                  ? 'Please wait at least 10 seconds before clocking out to prevent accidental short entries.'
                  : error}
              </Typography>
            </Stack>
          )}
        </Box>
      </Stack>
    </>
  );
}
