import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { disableTwoFactor } from 'api/twofa';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface TwoFactorDisableDialogProps {
  open: boolean;
  onClose: () => void;
  onDisabled: () => void;
}

export default function TwoFactorDisableDialog({ open, onClose, onDisabled }: TwoFactorDisableDialogProps) {
  const [password, setPassword] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (working) return;
    setPassword('');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!password) {
      setError('Password is required.');
      return;
    }
    setError(null);
    setWorking(true);
    try {
      await disableTwoFactor(password);
      dispatch(
        openSnackbar({
          open: true,
          message: 'Two-factor authentication disabled.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
      onDisabled();
      setPassword('');
      onClose();
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.detail || d?.error || 'Failed to disable 2FA. Check your password and try again.');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Disable two-factor authentication</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography variant="body2" color="text.secondary">
            This will turn off 2FA for your account. You'll sign in with just your email and password again.
          </Typography>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Current password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={working}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="error"
          onClick={handleSubmit}
          disabled={working}
          startIcon={working ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
        >
          {working ? 'Disabling...' : 'Disable 2FA'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
