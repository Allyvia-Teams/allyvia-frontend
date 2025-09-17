import { Stack, Button, TextField, Typography } from '@mui/material';
import { LogIn, LogOut, Loader2, AlertCircle } from 'lucide-react';

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
      <Stack direction="row" gap={1} flexWrap="wrap">
        {canPerformActions ? (
          status === 'out' ? (
            <Button onClick={onClockIn} disabled={loading} variant="contained" startIcon={<LogIn size={16} />} sx={{ borderRadius: 2 }}>
              {loading ? <Loader2 size={16} /> : 'Clock In'}
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
              <Button onClick={onClockOut} disabled={loading} variant="outlined" startIcon={<LogOut size={16} />} sx={{ borderRadius: 2 }}>
                {loading ? <Loader2 size={16} /> : 'Clock Out'}
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
          <AlertCircle size={16} />
          <Typography variant="body2">{error}</Typography>
        </Stack>
      )}
    </>
  );
}
