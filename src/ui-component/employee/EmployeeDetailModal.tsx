// Employee Detail Modal Component
import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Grid, Box, Typography, Chip, IconButton, Tooltip } from '@mui/material';
import { Edit, Close } from '@mui/icons-material';
import { Employee } from 'types/employee';
import { getStatusColor, formatPhoneNumber } from 'utils/employeeUtils';
import { useIsAdmin } from 'hooks/usePermission';

interface EmployeeDetailModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onEdit: (employee: Employee) => void;
}

export const EmployeeDetailModal: React.FC<EmployeeDetailModalProps> = ({ open, employee, onClose, onEdit }) => {
  if (!employee) return null;

  const isAdmin = useIsAdmin();

  const handleEdit = () => {
    onEdit(employee);
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
              {employee.full_name} • {employee.title}
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
          {/* Personal Information - Left Side */}
          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Personal Information
              </Typography>
              <DetailRow label="Full Name" value={employee.full_name} />
              <DetailRow label="Email" value={employee.email} />
              <DetailRow label="Phone" value={employee.phone ? formatPhoneNumber(employee.phone) : 'Not provided'} />
            </Box>
          </Grid>

          {/* Professional Information - Right Side */}
          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Professional Information
              </Typography>
              <DetailRow label="Title" value={employee.title || 'Not provided'} />
              <DetailRow label="Status" value={employee.status} isChip chipColor={getStatusColor(employee.status)} />
              <DetailRow label="Active" value={employee.is_active} isChip chipColor={employee.is_active ? 'success' : 'error'} />
            </Box>
          </Grid>

          {/* Address Information - Full Width */}
          {/* {employee.address && (
            <Grid size={12}>
              <Box>
                <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                  Address Information
                </Typography>
                <DetailRow label="Address" value={employee.address} />
              </Box>
            </Grid>
          )} */}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        {isAdmin && (
          <Button
            onClick={handleEdit}
            variant="contained"
            startIcon={<Edit />}
            size="medium"
            sx={{
              fontWeight: 600,
              color: 'white'
            }}
          >
            Edit Employee
          </Button>
        )}
        <Button onClick={onClose} variant="outlined" size="medium">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};
