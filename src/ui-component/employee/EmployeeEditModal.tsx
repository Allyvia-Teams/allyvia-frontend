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
  Chip
} from '@mui/material';
import { Employee, UpdateEmployeeData } from 'types/employee';
import { validateEmail, validatePhone } from 'utils/employeeUtils';
import { useSelector } from 'store';

interface EmployeeEditModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onUpdate: (updatedEmployee: Employee) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ open, employee, onClose, onUpdate }) => {
  const { currentRole } = useSelector((state) => state.auth);
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

    if (formData.phone && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (formData.title && !formData.title.trim()) {
      newErrors.title = 'Title cannot be empty';
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
    { value: 'inactive', label: 'Inactive', color: 'error' as const }
  ];

  if (!employee) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ pb: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
              Edit Employee
            </Typography>
            <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
              {employee.full_name} • {employee.title || 'No Title'} • {currentRole?.company_name || 'Unknown Company'}
            </Typography>
          </Box>
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

              {/* Full Name */}
              <TextField
                label="Full Name *"
                value={`${formData.first_name || ''} ${formData.last_name || ''}`.trim()}
                onChange={(e) => {
                  const names = e.target.value.split(' ');
                  handleInputChange('first_name', names[0] || '');
                  handleInputChange('last_name', names.slice(1).join(' ') || '');
                }}
                onBlur={() => {
                  handleBlur('first_name');
                  handleBlur('last_name');
                }}
                error={!!(errors.first_name || errors.last_name) && (touched.first_name || touched.last_name)}
                helperText={
                  (errors.first_name || errors.last_name) && (touched.first_name || touched.last_name)
                    ? errors.first_name || errors.last_name
                    : ''
                }
                fullWidth
                size="small"
                sx={{ mb: 2 }}
              />

              {/* Email */}
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
                sx={{ mb: 2 }}
              />

              {/* Phone */}
              <TextField
                label="Phone"
                value={formData.phone || ''}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                onBlur={() => handleBlur('phone')}
                error={!!errors.phone && touched.phone}
                helperText={errors.phone && touched.phone ? errors.phone : ''}
                fullWidth
                size="small"
                placeholder="(555) 123-4567"
              />
            </Box>
          </Grid>

          {/* Professional Information - Right Side */}
          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Professional Information
              </Typography>

              {/* Title */}
              <TextField
                label="Title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                error={!!errors.title && touched.title}
                helperText={errors.title && touched.title ? errors.title : ''}
                fullWidth
                size="small"
                sx={{ mb: 2 }}
                placeholder="e.g., Senior Developer, Project Manager"
              />

              {/* Status */}
              <FormControl fullWidth size="small" sx={{ mb: 2 }}>
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

              {/* Active Status */}
              <FormControl fullWidth size="small">
                <InputLabel>Active Status</InputLabel>
                <Select
                  value={
                    formData.is_active !== undefined
                      ? formData.is_active
                        ? 'active'
                        : 'inactive'
                      : employee.is_active
                        ? 'active'
                        : 'inactive'
                  }
                  onChange={(e) => handleInputChange('is_active', e.target.value === 'active')}
                  label="Active Status"
                >
                  <MenuItem value="active">
                    <Chip label="Active" size="small" color="success" sx={{ mr: 1 }} />
                    Active
                  </MenuItem>
                  <MenuItem value="inactive">
                    <Chip label="Inactive" size="small" color="error" sx={{ mr: 1 }} />
                    Inactive
                  </MenuItem>
                </Select>
              </FormControl>
            </Box>
          </Grid>

          {/* Address Information - Full Width */}
          {/* <Grid size={12}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Address Information
              </Typography>
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
            </Box>
          </Grid> */}
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
