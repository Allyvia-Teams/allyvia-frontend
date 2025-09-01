// Employee Edit Modal Component
import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Switch,
  FormControlLabel
} from '@mui/material';
import { Employee, UpdateEmployeeData } from 'types/employee';
import { validateEmail, validatePhone } from 'utils/employeeUtils';

interface EmployeeEditModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onUpdate: (updatedEmployee: Employee) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ open, employee, onClose, onUpdate }) => {
  const [formData, setFormData] = useState<UpdateEmployeeData>({});
  const [errors, setErrors] = useState<Partial<UpdateEmployeeData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof UpdateEmployeeData, boolean>>>({});

  // Initialize form data when employee changes
  useEffect(() => {
    if (employee) {
      setFormData({
        first_name: employee.first_name,
        last_name: employee.last_name,
        email: employee.email,
        phone: employee.phone,
        title: employee.title,
        address: employee.address,
        status: employee.status,
        is_active: employee.is_active
      });
      setErrors({});
      setTouched({});
    }
  }, [employee]);

  const handleInputChange = (field: keyof UpdateEmployeeData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof UpdateEmployeeData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<UpdateEmployeeData> = {};

    if (formData.first_name !== undefined && !formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (formData.last_name !== undefined && !formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (formData.email !== undefined && !formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (formData.email && !validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone !== undefined && !formData.phone.trim()) {
      newErrors.phone = 'Phone is required';
    } else if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.title !== undefined && !formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm() && employee) {
      // Create updated employee object
      const updatedEmployee: Employee = {
        ...employee,
        ...formData,
        status: (formData.status as Employee['status']) || employee.status
      };
      console.log('updatedEmployee', updatedEmployee);
      onUpdate(updatedEmployee);
    }
  };

  const handleClose = () => {
    setFormData({});
    setErrors({});
    setTouched({});
    onClose();
  };

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'success' as const },
    { value: 'inactive', label: 'Inactive', color: 'error' as const },
    { value: 'on_leave', label: 'On Leave', color: 'warning' as const },
    { value: 'terminated', label: 'Terminated', color: 'error' as const }
  ];

  if (!employee) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Edit Employee</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Company Display (Read-only) */}
          <Grid size={12}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Company
              </Typography>
              <TextField
                value={employee.company_name}
                disabled
                fullWidth
                variant="outlined"
                size="small"
                sx={{
                  '& .MuiInputBase-input.Mui-disabled': {
                    WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
              />
            </Box>
          </Grid>

          {/* First Name */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="First Name *"
              value={formData.first_name || ''}
              onChange={(e) => handleInputChange('first_name', e.target.value)}
              onBlur={() => handleBlur('first_name')}
              error={!!errors.first_name && touched.first_name}
              helperText={errors.first_name && touched.first_name ? errors.first_name : ''}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Last Name */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Last Name *"
              value={formData.last_name || ''}
              onChange={(e) => handleInputChange('last_name', e.target.value)}
              onBlur={() => handleBlur('last_name')}
              error={!!errors.last_name && touched.last_name}
              helperText={errors.last_name && touched.last_name ? errors.last_name : ''}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Email */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Email *"
              type="email"
              value={formData.email || ''}
              onChange={(e) => handleInputChange('email', e.target.value)}
              onBlur={() => handleBlur('email')}
              error={!!errors.email && touched.email}
              helperText={errors.email && touched.email ? errors.email : ''}
              fullWidth
              size="small"
            />
          </Grid>

          {/* Phone */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Phone *"
              value={formData.phone || ''}
              onChange={(e) => handleInputChange('phone', e.target.value)}
              onBlur={() => handleBlur('phone')}
              error={!!errors.phone && touched.phone}
              helperText={errors.phone && touched.phone ? errors.phone : ''}
              fullWidth
              size="small"
              placeholder="(555) 123-4567"
            />
          </Grid>

          {/* Title */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Title *"
              value={formData.title || ''}
              onChange={(e) => handleInputChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              error={!!errors.title && touched.title}
              helperText={errors.title && touched.title ? errors.title : ''}
              fullWidth
              size="small"
              placeholder="e.g., Senior Developer, Project Manager"
            />
          </Grid>

          {/* Company Name (Read-only) */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Company Name"
              value={employee?.company_name || ''}
              fullWidth
              size="small"
              disabled
              sx={{
                '& .MuiInputBase-input.Mui-disabled': {
                  WebkitTextFillColor: 'rgba(0, 0, 0, 0.87)',
                  backgroundColor: 'rgba(0, 0, 0, 0.04)'
                }
              }}
            />
          </Grid>

          {/* Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={formData.status || ''} onChange={(e) => handleInputChange('status', e.target.value)} label="Status">
                {statusOptions.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Chip label={status.label} size="small" color={status.color} sx={{ mr: 1 }} />
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Active Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.is_active !== undefined ? formData.is_active : employee.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  color="primary"
                />
              }
              label="Employee is Active"
            />
          </Grid>

          {/* Address */}
          <Grid size={12}>
            <TextField
              label="Address"
              value={formData.address || ''}
              onChange={(e) => handleInputChange('address', e.target.value)}
              fullWidth
              size="small"
              multiline
              rows={2}
              placeholder="123 Main St, City, State, ZIP"
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={Object.keys(errors).length > 0}
          sx={{
            bgcolor: '#2196F3',
            color: 'white',
            '&:hover': {
              bgcolor: '#2196F3',
              opacity: 0.9
            }
          }}
        >
          Update Employee
        </Button>
      </DialogActions>
    </Dialog>
  );
};
