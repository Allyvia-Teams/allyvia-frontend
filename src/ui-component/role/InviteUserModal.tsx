import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Stack,
  Box,
  Typography
} from '@mui/material';
import { IconMail, IconUser } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { inviteUser, fetchUsers } from 'store/slices/role';
import type { Role, InviteUserRequest } from 'types/role';

interface InviteUserModalProps {
  open: boolean;
  onClose: () => void;
}

export default function InviteUserModal({ open, onClose }: InviteUserModalProps) {
  const dispatch = useDispatch();
  const { roleDefinitions, inviteUserLoading, inviteUserError, inviteUserSuccess } = useSelector((s) => s.role);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [roleId, setRoleId] = useState<string>('');
  const [errors, setErrors] = useState<{ firstName?: string; lastName?: string; email?: string; role?: string }>({});

  // Reset form when modal opens/closes
  useEffect(() => {
    if (open) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setRoleId('');
      setErrors({});
    }
  }, [open]);

  // Close modal on success
  useEffect(() => {
    if (inviteUserSuccess) {
      setTimeout(() => {
        handleClose();
        dispatch(fetchUsers());
      }, 1500);
    }
  }, [inviteUserSuccess, dispatch]);

  const validateForm = (): boolean => {
    const newErrors: { firstName?: string; lastName?: string; email?: string; role?: string } = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!roleId) {
      newErrors.role = 'Please select a role';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (!validateForm()) {
      return;
    }

    // Find the selected role to determine if it's a system role or custom role
    const selectedRole = roleDefinitions.find((role: Role) => role.id === roleId);

    if (!selectedRole) {
      setErrors({ role: 'Selected role not found' });
      return;
    }

    // Prepare the request based on role type
    const isSystemRole = selectedRole.is_system_role || selectedRole.role_type === 'admin' || selectedRole.role_type === 'member';

    const requestData: InviteUserRequest = {
      email: email.trim(),
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      ...(isSystemRole ? { role_type: selectedRole.role_type as 'admin' | 'member' } : { role_definition_id: selectedRole.id })
    };

    dispatch(inviteUser(requestData));
  };

  const handleClose = () => {
    if (!inviteUserLoading) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setRoleId('');
      setErrors({});
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconUser size={24} />
          <Typography variant="h6">Invite User</Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {inviteUserSuccess && <Alert severity="success">User invited successfully! A welcome email has been sent.</Alert>}
          {inviteUserError && <Alert severity="error">{inviteUserError}</Alert>}

          <TextField
            fullWidth
            label="First Name"
            value={firstName}
            onChange={(e) => {
              setFirstName(e.target.value);
              if (errors.firstName) setErrors({ ...errors, firstName: undefined });
            }}
            error={!!errors.firstName}
            helperText={errors.firstName}
            required
            disabled={inviteUserLoading}
            placeholder="Enter first name"
          />

          <TextField
            fullWidth
            label="Last Name"
            value={lastName}
            onChange={(e) => {
              setLastName(e.target.value);
              if (errors.lastName) setErrors({ ...errors, lastName: undefined });
            }}
            error={!!errors.lastName}
            helperText={errors.lastName}
            required
            disabled={inviteUserLoading}
            placeholder="Enter last name"
          />

          <TextField
            fullWidth
            label="Email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (errors.email) setErrors({ ...errors, email: undefined });
            }}
            error={!!errors.email}
            helperText={errors.email}
            required
            disabled={inviteUserLoading}
            placeholder="user@example.com"
            InputProps={{
              startAdornment: <IconMail size={18} style={{ marginRight: 8, color: '#666' }} />
            }}
          />

          <FormControl fullWidth required error={!!errors.role} disabled={inviteUserLoading}>
            <InputLabel>Role</InputLabel>
            <Select
              value={roleId}
              onChange={(e) => {
                setRoleId(e.target.value);
                if (errors.role) setErrors({ ...errors, role: undefined });
              }}
              label="Role"
            >
              {roleDefinitions.map((role: Role) => (
                <MenuItem key={role.id} value={role.id}>
                  {role.role_display || role.role_type}
                  {role.is_system_role && (
                    <Typography component="span" variant="caption" sx={{ ml: 1, color: 'text.secondary' }}>
                      (System)
                    </Typography>
                  )}
                </MenuItem>
              ))}
            </Select>
            {errors.role && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.75 }}>
                {errors.role}
              </Typography>
            )}
          </FormControl>

          <Alert severity="info" icon={<IconMail size={18} />}>
            A welcome email will be sent to the user with instructions to set up their account.
          </Alert>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={inviteUserLoading} sx={{ color: 'white' }}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={inviteUserLoading}
          startIcon={inviteUserLoading ? <CircularProgress size={16} /> : null}
          sx={{ color: 'white' }}
        >
          {inviteUserLoading ? 'Inviting...' : 'Send Invitation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
