import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Stack,
  Typography,
  Alert,
  CircularProgress,
  Box,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Grid
} from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { compareRoleChanges, changeUserRole, clearRoleComparison, clearChangeRoleSuccess, fetchUsers } from 'store/slices/role';
import type { User, Role } from 'types/role';
import { IconX, IconCheck, IconShieldCheck } from '@tabler/icons-react';
import { getModuleDisplayName } from 'registry/builders';

interface ChangeUserRoleModalProps {
  open: boolean;
  onClose: () => void;
  user: User | null;
  roleDefinitions: Role[];
}

export default function ChangeUserRoleModal({ open, onClose, user, roleDefinitions }: ChangeUserRoleModalProps) {
  const dispatch = useDispatch();
  const roleState = useSelector((s) => s.role);
  const { roleComparison, roleComparisonLoading, roleComparisonError, changeRoleLoading, changeRoleSuccess, changeRoleError } = roleState;

  const [selectedRoleId, setSelectedRoleId] = React.useState<string>('');

  React.useEffect(() => {
    if (open && user) {
      // Reset state when modal opens
      setSelectedRoleId('');
      dispatch(clearRoleComparison());
      dispatch(clearChangeRoleSuccess());
    }
  }, [open, user, dispatch]);

  React.useEffect(() => {
    if (changeRoleSuccess) {
      dispatch(fetchUsers());
      setTimeout(() => {
        onClose();
        dispatch(clearChangeRoleSuccess());
      }, 1500);
    }
  }, [changeRoleSuccess, dispatch, onClose]);

  const handleRoleChange = (event: any) => {
    const newRoleId = event.target.value;
    setSelectedRoleId(newRoleId);

    if (!user || !newRoleId) {
      dispatch(clearRoleComparison());
      return;
    }

    // Find the selected role
    const selectedRole = roleDefinitions.find((r) => r.id === newRoleId);
    if (!selectedRole) return;

    // Determine if it's a system role or custom role
    const isSystemRole = selectedRole.is_system_role || selectedRole.role_type === 'admin' || selectedRole.role_type === 'member';

    // Call compare API
    if (isSystemRole) {
      dispatch(
        compareRoleChanges({
          userId: user.user_id,
          params: { role_type: selectedRole.role_type as 'admin' | 'member' }
        })
      );
    } else {
      dispatch(
        compareRoleChanges({
          userId: user.user_id,
          params: { role_definition_id: selectedRole.id }
        })
      );
    }
  };

  const handleConfirmChange = () => {
    if (!user || !selectedRoleId) return;

    const selectedRole = roleDefinitions.find((r) => r.id === selectedRoleId);
    if (!selectedRole) return;

    const isSystemRole = selectedRole.is_system_role || selectedRole.role_type === 'admin' || selectedRole.role_type === 'member';

    const requestData: { role_definition_id?: string; role_type?: 'admin' | 'member' } = isSystemRole
      ? { role_type: selectedRole.role_type as 'admin' | 'member' }
      : { role_definition_id: selectedRole.id };

    dispatch(changeUserRole({ userId: user.user_id, data: requestData }));
  };

  const handleCancel = () => {
    setSelectedRoleId('');
    dispatch(clearRoleComparison());
    onClose();
  };

  if (!user) return null;

  const currentRole = roleDefinitions.find((r) => r.id === user.role_id);

  return (
    <Dialog open={open} onClose={handleCancel} maxWidth="md" fullWidth>
      <DialogTitle>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Change Role - {user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || user.user_email}
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* User Information */}
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600 }}>
              User Information
            </Typography>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Name
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user.user_name || `${user.first_name || ''} ${user.last_name || ''}`.trim() || 'N/A'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Email
                </Typography>
                <Typography variant="body1" fontWeight={500}>
                  {user.user_email || user.email || 'N/A'}
                </Typography>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Current Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                  <Chip label={user.role_display || 'N/A'} size="small" color="primary" />
                  {currentRole?.is_system_role && <IconShieldCheck size={16} color="#4caf50" />}
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Typography variant="body2" color="text.secondary">
                  Status
                </Typography>
                <Chip
                  label={user.is_active ? 'Active' : 'Inactive'}
                  size="small"
                  color={user.is_active ? 'success' : 'default'}
                  sx={{ mt: 0.5 }}
                />
              </Grid>
            </Grid>
          </Paper>

          {/* Role Selection */}
          <Box>
            <FormControl fullWidth>
              <InputLabel>Select New Role</InputLabel>
              <Select value={selectedRoleId} label="Select New Role" onChange={handleRoleChange}>
                {roleDefinitions.map((role) => (
                  <MenuItem key={role.id} value={role.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {role.is_system_role && <IconShieldCheck size={18} color="#4caf50" />}
                      <Typography>{role.role_display || 'Unnamed Role'}</Typography>
                      {role.id === user.role_id && <Chip label="Current" size="small" sx={{ ml: 'auto' }} />}
                    </Box>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>

          {/* Success/Error Messages */}
          {changeRoleSuccess && (
            <Alert severity="success" icon={<IconCheck size={20} />}>
              User role changed successfully!
            </Alert>
          )}

          {changeRoleError && (
            <Alert severity="error" icon={<IconX size={20} />}>
              {changeRoleError}
            </Alert>
          )}

          {roleComparisonError && (
            <Alert severity="error" icon={<IconX size={20} />}>
              {roleComparisonError}
            </Alert>
          )}

          {/* Role Comparison */}
          {roleComparisonLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 3 }}>
              <CircularProgress />
            </Box>
          )}

          {roleComparison && !roleComparisonLoading && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                  Permission Changes
                </Typography>

                {/* Summary */}
                <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'grey.50' }}>
                  <Grid container spacing={2}>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Modules Gained
                      </Typography>
                      <Typography variant="h6" color="success.main">
                        {roleComparison.summary.modules_gained}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Modules Lost
                      </Typography>
                      <Typography variant="h6" color="error.main">
                        {roleComparison.summary.modules_lost}
                      </Typography>
                    </Grid>
                    <Grid size={{ xs: 4 }}>
                      <Typography variant="body2" color="text.secondary">
                        Modules Changed
                      </Typography>
                      <Typography variant="h6" color="warning.main">
                        {roleComparison.summary.modules_changed}
                      </Typography>
                    </Grid>
                  </Grid>
                </Paper>

                {/* Permissions Gained */}
                {roleComparison.differences.gained.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'success.main' }}>
                      Permissions Gained ({roleComparison.differences.gained.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                      <Stack spacing={0.5}>
                        {roleComparison.differences.gained.map((perm, idx) => (
                          <Typography key={idx} variant="body2">
                            • {getModuleDisplayName(perm.key)} - {perm.view ? 'View' : ''} {perm.manage ? 'Manage' : ''}
                          </Typography>
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
                )}

                {/* Permissions Lost */}
                {roleComparison.differences.lost.length > 0 && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'error.main' }}>
                      Permissions Lost ({roleComparison.differences.lost.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'action.hover' }}>
                      <Stack spacing={0.5}>
                        {roleComparison.differences.lost.map((perm, idx) => (
                          <Typography key={idx} variant="body2">
                            • {getModuleDisplayName(perm.key)} - {perm.view ? 'View' : ''} {perm.manage ? 'Manage' : ''}
                          </Typography>
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
                )}

                {/* Permissions Changed */}
                {roleComparison.differences.changed.length > 0 && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600, color: 'warning.main' }}>
                      Permissions Changed ({roleComparison.differences.changed.length})
                    </Typography>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Stack spacing={1}>
                        {roleComparison.differences.changed.map((change, idx) => (
                          <Box key={idx}>
                            <Typography variant="body2" fontWeight={500}>
                              {getModuleDisplayName(change.key)}:
                            </Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ ml: 2 }}>
                              Current: {change.current.view ? 'View' : 'No View'} {change.current.manage ? 'Manage' : 'No Manage'} → New:{' '}
                              {change.new.view ? 'View' : 'No View'} {change.new.manage ? 'Manage' : 'No Manage'}
                            </Typography>
                          </Box>
                        ))}
                      </Stack>
                    </Paper>
                  </Box>
                )}

                {/* No Changes */}
                {roleComparison.summary.modules_gained === 0 &&
                  roleComparison.summary.modules_lost === 0 &&
                  roleComparison.summary.modules_changed === 0 && (
                    <Alert severity="info">No permission changes - roles have identical permissions.</Alert>
                  )}
              </Box>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCancel} disabled={changeRoleLoading || changeRoleSuccess}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirmChange}
          disabled={changeRoleLoading || changeRoleSuccess || !selectedRoleId || selectedRoleId === user.role_id}
        >
          {changeRoleLoading ? <CircularProgress size={20} /> : 'Change Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
