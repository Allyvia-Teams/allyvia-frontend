import { Box, Stack, Typography, Button, TextField, Autocomplete, CircularProgress } from '@mui/material';
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
            <Autocomplete
              options={employees}
              getOptionLabel={(option) => option.full_name}
              value={selectedEmployee || undefined}
              onChange={(_, newValue) => onEmployeeChange(newValue)}
              loading={employeesLoading}
              size="small"
              fullWidth
              disableClearable
              filterOptions={(options, { inputValue }) => {
                const filterValue = inputValue.toLowerCase();
                return options.filter(
                  (option) => option.full_name.toLowerCase().includes(filterValue) || option.email.toLowerCase().includes(filterValue)
                );
              }}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select Employee"
                  placeholder="Search by name or email..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {employeesLoading ? <CircularProgress color="inherit" size={20} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    )
                  }}
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props}>
                  <Typography variant="body1" fontWeight="medium">
                    {option.full_name}
                  </Typography>
                </Box>
              )}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              noOptionsText="No employees found"
              loadingText="Loading employees..."
            />
          </Box>
        )}

        {/* Clock Actions */}
        <Box sx={{ flex: 1 }}>
          <Stack direction="row" gap={1} flexWrap="wrap" justifyContent="flex-end" alignItems="center">
            {canPerformActions ? (
              status === 'out' ? (
                <Button
                  onClick={onClockIn}
                  disabled={loading}
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
                  />
                  <Button
                    onClick={onClockOut}
                    disabled={loading}
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
              )
            ) : (
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
