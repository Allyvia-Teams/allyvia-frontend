// Employee Detail Modal Component
import React, { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Edit, Close, PersonAdd, Email } from '@mui/icons-material';
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
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);

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
      } catch (e) {
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

  const handleCreateUserAccount = async () => {
    if (!effective?.id || !currentRole?.company_id) return;

    setCreatingAccount(true);
    try {
      await employeeAPI.createUserAccount(effective.id, currentRole.company_id);

      // Refresh employee data to get updated user account status
      const updatedEmployee = await employeeAPI.getEmployee(effective.id, currentRole.company_id);
      setFullEmployee(updatedEmployee);

      dispatch(
        openSnackbar({
          open: true,
          message: 'User account created successfully. Welcome email sent.',
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
      dispatch(
        openSnackbar({
          open: true,
          message: error.response?.data?.message || 'Failed to create user account. Please try again.',
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
      setCreatingAccount(false);
    }
  };

  const handleResendWelcomeEmail = async () => {
    if (!effective?.id || !currentRole?.company_id) return;

    setResendingEmail(true);
    try {
      await employeeAPI.resendWelcomeEmail(effective.id, currentRole.company_id);

      dispatch(
        openSnackbar({
          open: true,
          message: 'Welcome email resent successfully.',
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
      dispatch(
        openSnackbar({
          open: true,
          message: error.response?.data?.message || 'Failed to resend welcome email. Please try again.',
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
      setResendingEmail(false);
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
                value={getAccountStatusDisplayText(effective.user_account_status || 'none')}
                isChip
                chipColor={getAccountStatusColor(effective.user_account_status || 'none')}
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

          {!effective.has_user_account ? (
            <Button
              onClick={handleCreateUserAccount}
              variant="outlined"
              startIcon={<PersonAdd />}
              size="medium"
              sx={{
                fontWeight: 600,
                borderColor: 'primary.main',
                color: 'primary.main',
                '&:hover': {
                  borderColor: 'primary.dark',
                  backgroundColor: 'primary.light',
                  color: 'primary.dark'
                }
              }}
              disabled={loading || creatingAccount}
            >
              {creatingAccount ? 'Creating...' : 'Create User Account'}
            </Button>
          ) : (
            <Button
              onClick={handleResendWelcomeEmail}
              variant="outlined"
              startIcon={<Email />}
              size="medium"
              sx={{
                fontWeight: 600,
                borderColor: 'secondary.main',
                color: 'secondary.main',
                '&:hover': {
                  borderColor: 'secondary.dark',
                  backgroundColor: 'secondary.light',
                  color: 'secondary.dark'
                }
              }}
              disabled={loading || resendingEmail}
            >
              {resendingEmail ? 'Sending...' : 'Resend Welcome Email'}
            </Button>
          )}
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
