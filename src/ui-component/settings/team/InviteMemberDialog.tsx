import { useState } from 'react';

import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { TeamRoleType } from 'types/settings';

interface InviteMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { email: string; role_type: TeamRoleType }) => Promise<void>;
}

export default function InviteMemberDialog({ open, onClose, onSubmit }: InviteMemberDialogProps) {
  const [email, setEmail] = useState('');
  const [roleType, setRoleType] = useState<TeamRoleType>('member');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    if (submitting) return;
    setEmail('');
    setRoleType('member');
    setError(null);
    onClose();
  };

  const handleSubmit = async () => {
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await onSubmit({ email: email.trim(), role_type: roleType });
      setEmail('');
      setRoleType('member');
      onClose();
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Failed to send invitation. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else if (d.email) msg = Array.isArray(d.email) ? d.email.join(' ') : d.email;
        else if (d.error) msg = d.error;
      }
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Invite team member</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            size="small"
            autoFocus
          />
          <TextField
            select
            label="Role"
            value={roleType}
            onChange={(e) => setRoleType(e.target.value as TeamRoleType)}
            fullWidth
            size="small"
          >
            <MenuItem value="member">Member</MenuItem>
            <MenuItem value="admin">Admin</MenuItem>
          </TextField>
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
          {submitting ? 'Sending...' : 'Send invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
