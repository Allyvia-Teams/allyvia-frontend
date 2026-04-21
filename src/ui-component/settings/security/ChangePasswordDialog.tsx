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

import axiosServices from 'utils/axios';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface ChangePasswordDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function ChangePasswordDialog({ open, onClose }: ChangePasswordDialogProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setError(null);
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('All fields are required.');
      return;
    }
    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (/^\d+$/.test(newPassword)) {
      setError('Password cannot be entirely numeric.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New password and confirmation must match.');
      return;
    }

    setSubmitting(true);
    try {
      await axiosServices.post('/auth/change-password/', {
        current_password: currentPassword,
        password: newPassword,
        password_confirm: confirmPassword
      });
      dispatch(
        openSnackbar({
          open: true,
          message: 'Password updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
      reset();
      onClose();
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Failed to update password. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else if (d.current_password) {
          msg = Array.isArray(d.current_password) ? d.current_password.join(' ') : d.current_password;
        } else if (d.password) msg = Array.isArray(d.password) ? d.password.join(' ') : d.password;
        else if (d.password_confirm) msg = Array.isArray(d.password_confirm) ? d.password_confirm.join(' ') : d.password_confirm;
        else if (d.non_field_errors) {
          msg = Array.isArray(d.non_field_errors) ? d.non_field_errors.join(' ') : d.non_field_errors;
        } else if (d.error) msg = d.error;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Change password</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Current password"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
          <TextField
            label="New password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            fullWidth
            size="small"
            helperText="At least 8 characters, not entirely numeric."
          />
          <TextField
            label="Confirm new password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            fullWidth
            size="small"
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={submitting}
          startIcon={submitting ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
        >
          {submitting ? 'Updating...' : 'Update password'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
