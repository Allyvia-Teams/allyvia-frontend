import { Stack, Button, TextField, Typography } from '@mui/material';
import { Login as LoginIcon, Logout as LogoutIcon, Error as ErrorIcon } from '@mui/icons-material';
import { CircularProgress } from '@mui/material';

interface ClockActionsProps {
  status: 'in' | 'out';
  loading: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  onClockIn: () => void;
  onClockOut: () => void;
  error?: string | null;
  isAdmin: boolean;
  hasSelectedEmployee: boolean;
}

export default function ClockActions({
  status,
  loading,
  note,
  onNoteChange,
  onClockIn,
  onClockOut,
  error,
  isAdmin,
  hasSelectedEmployee
}: ClockActionsProps) {
  const canPerformActions = !isAdmin || hasSelectedEmployee;

  return (
    <>
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
          <Typography variant="body2">{error}</Typography>
        </Stack>
      )}
    </>
  );
}
