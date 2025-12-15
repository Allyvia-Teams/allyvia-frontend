import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  IconButton,
  Alert,
  CircularProgress,
  Box,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Chip,
  Divider
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { IconBuilding, IconShieldCheck, IconCheck, IconX } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { setCurrentRole } from 'store/slices/auth';
import { fetchMyPermissions, fetchAvailableModules, compareRoleChanges, clearRoleComparison } from 'store/slices/role';
import { fetchSubscriptionStatus, updateSubscriptionStatusFromPermissions } from 'store/slices/subscription';
import { NavigationComparisonView } from './parts/NavigationComparisonView';

interface SwitchRoleModalProps {
  open: boolean;
  onClose: () => void;
}

export default function SwitchRoleModal({ open, onClose }: SwitchRoleModalProps) {
  const dispatch = useDispatch();
  const { roles, currentRole, user } = useSelector((s) => s.auth);
  const { myPermissionsLoading, roleComparison, roleComparisonLoading, roleComparisonError, myPermissions, availableModules } = useSelector(
    (s) => s.role
  );
  const { statusLoading } = useSelector((s) => s.subscription);

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showComparison, setShowComparison] = useState(false);

  // Initialize selected role to current role when modal opens
  useEffect(() => {
    if (open && currentRole) {
      setSelectedRoleId(currentRole.id);
      setError(null);
      setSuccess(false);
      setShowComparison(false);
      dispatch(clearRoleComparison());
    }
  }, [open, currentRole, dispatch]);

  const handleRoleSelect = async (roleId: string) => {
    if (switching) return; // Prevent selection while switching
    setSelectedRoleId(roleId);
    setError(null);
    setSuccess(false);
    setShowComparison(false);
    dispatch(clearRoleComparison());

    // If a different role is selected, fetch comparison
    if (roleId !== currentRole?.id && user?.id) {
      const selectedRole = roles.find((r) => r.id === roleId);
      if (selectedRole) {
        try {
          // Determine if it's a system role or custom role
          const isSystemRole = selectedRole.is_system_role || selectedRole.role_type === 'admin' || selectedRole.role_type === 'member';

          // Call compare API
          if (isSystemRole) {
            await dispatch(
              compareRoleChanges({
                userId: user.id,
                params: { role_type: selectedRole.role_type as 'admin' | 'member' }
              })
            ).unwrap();
          } else {
            await dispatch(
              compareRoleChanges({
                userId: user.id,
                params: { role_definition_id: selectedRole.id }
              })
            ).unwrap();
          }
          setShowComparison(true);
        } catch (err: any) {
          console.error('[SwitchRoleModal] Error comparing roles:', err);
          // Don't show error for comparison - just don't show comparison
        }
      }
    }
  };

  const handleSwitchRole = async () => {
    if (!selectedRoleId || selectedRoleId === currentRole?.id) {
      return;
    }

    const selectedRole = roles.find((r) => r.id === selectedRoleId);
    if (!selectedRole) {
      setError('Selected role not found');
      return;
    }

    setSwitching(true);
    setError(null);
    setSuccess(false);

    try {
      // Step 1: Update current role in Redux (this automatically updates X-Role-ID header)
      dispatch(setCurrentRole(selectedRole));

      // Step 2: Fetch permissions for the new role
      const permissionsResponse = await dispatch(fetchMyPermissions()).unwrap();

      // Step 3: Update subscription status from permissions (if company data is present)
      if (permissionsResponse?.company) {
        dispatch(updateSubscriptionStatusFromPermissions({ company: permissionsResponse.company }));
        dispatch(fetchSubscriptionStatus());
      }

      // Step 4: Fetch available modules for the new role
      await dispatch(fetchAvailableModules()).unwrap();

      setSuccess(true);

      // Close modal after a short delay to show success message
      setTimeout(() => {
        onClose();
        setSwitching(false);
        setSuccess(false);
      }, 1500);
    } catch (err: any) {
      console.error('[SwitchRoleModal] Error switching role:', err);
      setError(err?.message || 'Failed to switch role. Please try again.');
      setSwitching(false);
    }
  };

  const handleClose = () => {
    if (switching) return; // Prevent closing while switching
    setError(null);
    setSuccess(false);
    setSelectedRoleId(currentRole?.id || null);
    onClose();
  };

  const isLoading = switching || myPermissionsLoading || statusLoading;
  const canSwitch = selectedRoleId && selectedRoleId !== currentRole?.id && !isLoading;

  // Role type color mapping
  const getRoleColor = (roleType: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
    const type = roleType?.toLowerCase() || '';
    if (type === 'admin') return 'error';
    if (type === 'member') return 'info';
    return 'default';
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth={showComparison && roleComparison ? 'lg' : 'sm'} fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4">Switch Role</Typography>
          <IconButton onClick={handleClose} disabled={isLoading} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        {roles.length === 0 ? (
          <Alert severity="warning">No roles available. Please contact your administrator.</Alert>
        ) : roles.length === 1 ? (
          <Alert severity="info">You only have one role assigned. Role switching is not available.</Alert>
        ) : (
          <>
            {/* Current Role Info */}
            {currentRole && (
              <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: 'action.selected' }}>
                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                  Current Active Role
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  <IconBuilding size={20} />
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {currentRole.company_name || 'Unknown Company'}
                  </Typography>
                  <Chip
                    label={currentRole.role_display || currentRole.role_type}
                    size="small"
                    color={getRoleColor(currentRole.role_type)}
                  />
                  {currentRole.is_system_role && (
                    <Chip icon={<IconShieldCheck size={16} />} label="System" size="small" color="success" variant="outlined" />
                  )}
                </Box>
              </Paper>
            )}

            {/* Role Selection List */}
            <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, mb: 1 }}>
              Select a role to switch to:
            </Typography>

            <List sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              {roles.map((role, index) => {
                const isSelected = selectedRoleId === role.id;
                const isCurrent = currentRole?.id === role.id;

                return (
                  <React.Fragment key={role.id}>
                    {index > 0 && <Divider />}
                    <ListItem disablePadding>
                      <ListItemButton
                        onClick={() => handleRoleSelect(role.id)}
                        selected={isSelected}
                        disabled={isCurrent || isLoading}
                        sx={{
                          py: 1.5,
                          '&.Mui-selected': {
                            bgcolor: 'primary.lighter',
                            '&:hover': {
                              bgcolor: 'primary.lighter'
                            }
                          }
                        }}
                      >
                        <ListItemIcon>
                          {isCurrent ? (
                            <IconCheck size={20} color="#4caf50" />
                          ) : isSelected ? (
                            <IconCheck size={20} color="primary" />
                          ) : (
                            <Box sx={{ width: 20, height: 20, border: '2px solid', borderColor: 'divider', borderRadius: '50%' }} />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <IconBuilding size={18} />
                              <Typography variant="body1" sx={{ fontWeight: isSelected ? 600 : 400 }}>
                                {role.company_name || 'Unknown Company'}
                              </Typography>
                              <Chip label={role.role_display || role.role_type} size="small" color={getRoleColor(role.role_type)} />
                              {role.is_system_role && (
                                <Chip
                                  icon={<IconShieldCheck size={14} />}
                                  label="System"
                                  size="small"
                                  color="success"
                                  variant="outlined"
                                  sx={{ height: 20, fontSize: '0.65rem' }}
                                />
                              )}
                              {isCurrent && <Chip label="Active" size="small" color="success" sx={{ ml: 'auto' }} />}
                            </Box>
                          }
                          secondary={
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                              {role.role_type === 'admin' && 'Full access to all company resources'}
                              {role.role_type === 'member' && 'Can access and modify resources'}
                              {!['admin', 'member'].includes(role.role_type) && 'Custom role permissions'}
                            </Typography>
                          }
                        />
                      </ListItemButton>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>

            {/* Role Comparison */}
            {roleComparisonLoading && (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 3, mt: 2 }}>
                <CircularProgress />
              </Box>
            )}

            {roleComparisonError && (
              <Alert severity="warning" sx={{ mt: 2 }}>
                Could not load permission comparison. You can still switch roles.
              </Alert>
            )}

            {showComparison && roleComparison && !roleComparisonLoading && availableModules && (
              <Box sx={{ mt: 3 }}>
                <Divider sx={{ mb: 2 }} />
                <NavigationComparisonView
                  comparison={roleComparison}
                  availableModules={availableModules.available_modules}
                  currentPermissions={myPermissions?.permissions || null}
                />
              </Box>
            )}

            {/* Success Message */}
            {success && (
              <Alert severity="success" icon={<IconCheck size={20} />} sx={{ mt: 2 }}>
                Role switched successfully! Refreshing permissions...
              </Alert>
            )}

            {/* Error Message */}
            {error && (
              <Alert severity="error" icon={<IconX size={20} />} sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, justifyContent: 'center' }}>
                <CircularProgress size={20} />
                <Typography variant="body2" color="text.secondary">
                  Switching role and fetching permissions...
                </Typography>
              </Box>
            )}
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button
          onClick={handleSwitchRole}
          variant="contained"
          disabled={!canSwitch || isLoading}
          startIcon={isLoading ? <CircularProgress size={16} /> : <IconCheck size={18} />}
        >
          {isLoading ? 'Switching...' : 'Switch Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
