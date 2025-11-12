// Employee Detail Modal Component
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Edit, Close, PersonAdd, Email, Refresh, CheckCircle } from '@mui/icons-material';
import { Employee } from 'types/employee';
import { getStatusColor, formatPhoneNumber, getAccountStatusColor, getAccountStatusDisplayText } from 'utils/employeeUtils';
import { useIsAdmin } from 'hooks/usePermission';
import { useSelector, useDispatch } from 'store';
import { employeeAPI } from 'api/employee.api';
import { openSnackbar } from 'store/slices/snackbar';

interface EmployeeDetailsModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeDetailsModal: React.FC<EmployeeDetailsModalProps> = ({ open, employee, onClose, onEdit }) => {
  const isAdmin = useIsAdmin();
  const { currentRole } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [fullEmployee, setFullEmployee] = useState<Employee | null>(employee);
  const [loading, setLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const fetchDetail = async () => {
      if (!open || !employee?.id || !currentRole?.company_id) {
        setFullEmployee(employee || null);
        return;
      }
      setLoading(true);
      try {
        const data = await employeeAPI.getEmployee(employee.id, currentRole.company_id);
        if (!cancelled) setFullEmployee(data as Employee);
      } catch {
        if (!cancelled) setFullEmployee(employee);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [open, employee?.id, currentRole?.company_id]);

  if (!employee) return null;

  const effective = fullEmployee || employee;

  const handleEdit = () => {
    onEdit(effective);
  };

  // Get button configuration based on user account status
  const getButtonConfig = (): {
    label: string;
    icon: React.ReactNode;
    variant: 'outlined' | 'contained';
    color: 'primary' | 'secondary' | 'warning';
    showButton: boolean;
    showBadge?: boolean;
  } => {
    const status = effective.user_account_status || 'no_account';

    if (isProcessing) {
      return {
        label: 'Sending...',
        icon: <Email />,
        variant: 'outlined' as const,
        color: 'primary' as const,
        showButton: true
      };
    }

    switch (status) {
      case 'no_account':
        return {
          label: 'Create Account & Send Email',
          icon: <PersonAdd />,
          variant: 'contained' as const,
          color: 'primary' as const,
          showButton: true
        };

      case 'email_sent':
        return {
          label: 'Resend Welcome Email',
          icon: <Email />,
          variant: 'outlined' as const,
          color: 'secondary' as const,
          showButton: true
        };

      case 'email_resent':
        return {
          label: 'Resend Welcome Email',
          icon: <Refresh />,
          variant: 'outlined' as const,
          color: 'secondary' as const,
          showButton: true,
          showBadge: true
        };

      case 'password_changed':
        return {
          label: 'Active',
          icon: <CheckCircle />,
          variant: 'outlined' as const,
          color: 'primary' as const,
          showButton: false // Only show chip, no button
        };

      case 'inactive':
      case 'email_unverified':
      default:
        return {
          label: 'Resend Welcome Email',
          icon: <Email />,
          variant: 'outlined' as const,
          color: 'primary' as const,
          showButton: true
        };
    }
  };

  // Unified handler for both create account and resend email
  const handleUserAccountAction = async () => {
    if (!effective?.id || !currentRole?.company_id) return;

    setIsProcessing(true);

    try {
      // Call resend-welcome endpoint which handles both create and resend
      const response = await employeeAPI.resendWelcomeEmail(effective.id);

      // Refresh employee data to get updated user account status
      const updatedEmployee = await employeeAPI.getEmployee(effective.id, currentRole.company_id);
      setFullEmployee(updatedEmployee);

      // Show success message with action taken
      const successMessage =
        response.action_taken === 'created_user'
          ? 'User account created successfully. Welcome email sent.'
          : 'Welcome email resent successfully with new password.';

      dispatch(
        openSnackbar({
          open: true,
          message: successMessage,
          variant: 'alert',
          alert: {
            color: 'success'
          },
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'right'
          },
          close: true
        })
      );
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.message || error.response?.data?.detail || 'Failed to send welcome email. Please try again.';

      dispatch(
        openSnackbar({
          open: true,
          message: errorMessage,
          variant: 'alert',
          alert: {
            color: 'error'
          },
          anchorOrigin: {
            vertical: 'top',
            horizontal: 'right'
          },
          close: true
        })
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const DetailRow = ({
    label,
    value,
    isChip = false,
    chipColor = 'default'
  }: {
    label: string;
    value: string | boolean;
    isChip?: boolean;
    chipColor?: 'success' | 'error' | 'warning' | 'default';
  }) => (
    <Box sx={{ mb: 3 }}>
      <Typography
        variant="caption"
        color="textSecondary"
        sx={{
          fontWeight: 600,
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
          mb: 1,
          display: 'block'
        }}
      >
        {label}
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {isChip ? (
          <Chip
            label={typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
            size="small"
            color={chipColor}
            sx={{ fontWeight: 600 }}
          />
        ) : (
          <Typography
            variant="body1"
            sx={{
              fontWeight: 500,
              color: 'text.primary'
            }}
          >
            {typeof value === 'boolean' ? (value ? 'Yes' : 'No') : value}
          </Typography>
        )}
      </Box>
    </Box>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Employee Details
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {effective.full_name} • {effective.title}
            </Typography>
          </Box>
          <Tooltip title="Close">
            <IconButton
              onClick={onClose}
              size="small"
              sx={{
                color: 'text.secondary',
                backgroundColor: 'action.hover',
                '&:hover': { backgroundColor: 'action.selected' }
              }}
            >
              <Close />
            </IconButton>
          </Tooltip>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Personal Information
              </Typography>
              <DetailRow label="Full Name" value={effective.full_name} />
              <DetailRow label="Email" value={effective.email} />
              <DetailRow label="Phone" value={effective.phone ? formatPhoneNumber(effective.phone) : 'Not provided'} />
            </Box>
          </Grid>

          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Professional Information
              </Typography>
              <DetailRow label="Title" value={effective.title || 'Not provided'} />
              <DetailRow label="Status" value={effective.status} isChip chipColor={getStatusColor(effective.status)} />
              <DetailRow
                label="User Account Status"
                value={getAccountStatusDisplayText(effective.user_account_status || 'no_account')}
                isChip
                chipColor={getAccountStatusColor(effective.user_account_status || 'no_account')}
              />
            </Box>
          </Grid>

          {effective.address && (
            <Grid size={12}>
              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Address Information
                </Typography>
                <DetailRow label="Address" value={effective.address} />
              </Box>
            </Grid>
          )}

          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            {(() => {
              const config = getButtonConfig();

              // For password_changed, just show a chip (no button)
              if (!config.showButton && effective.user_account_status === 'password_changed') {
                return <Chip icon={<CheckCircle />} label={config.label} color="success" size="medium" sx={{ fontWeight: 600 }} />;
              }

              // For other statuses, show button (and optional badge)
              return (
                <>
                  <Button
                    onClick={handleUserAccountAction}
                    variant={config.variant}
                    startIcon={config.icon}
                    size="medium"
                    color={config.color}
                    sx={{
                      fontWeight: 600,
                      ...(config.variant === 'contained' && { color: 'white' })
                    }}
                    disabled={loading || isProcessing}
                  >
                    {config.label}
                  </Button>

                  {config.showBadge && <Chip label="Already resent once" color="warning" size="small" variant="outlined" />}
                </>
              );
            })()}
          </Box>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {isAdmin && (
          <>
            <Button
              onClick={handleEdit}
              variant="contained"
              startIcon={<Edit />}
              size="medium"
              sx={{
                fontWeight: 600,
                color: 'white'
              }}
              disabled={loading}
            >
              Edit Employee
            </Button>
          </>
        )}
        <Button onClick={onClose} variant="outlined" size="medium">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
