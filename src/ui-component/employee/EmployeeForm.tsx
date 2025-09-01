// Employee Form Component for creating new employees
import React, { useState } from 'react';
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
  Alert
} from '@mui/material';
import { CreateEmployeeData } from 'types/employee';
import { validateEmail, validatePhone } from 'utils/employeeUtils';

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeData) => void;
  companyId: string;
  companyName: string;
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ open, onClose, onSubmit, companyId, companyName }) => {
  const [formData, setFormData] = useState<CreateEmployeeData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    address: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<Partial<CreateEmployeeData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CreateEmployeeData, boolean>>>({});

  const handleInputChange = (field: keyof CreateEmployeeData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const handleBlur = (field: keyof CreateEmployeeData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateEmployeeData> = {};

    if (!formData.first_name.trim()) {
      newErrors.first_name = 'First name is required';
    }

    if (!formData.last_name.trim()) {
      newErrors.last_name = 'Last name is required';
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!validateEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone is optional, but if provided, validate format
    if (formData.phone && formData.phone.trim() && !validatePhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    // Title is optional, no validation required

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onSubmit(formData);
      handleClose();
    }
  };

  const handleClose = () => {
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      title: '',
      address: '',
      status: 'active'
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  const titleOptions = [
    'Developer',
    'Senior Developer',
    'Team Lead',
    'Project Manager',
    'Product Manager',
    'Designer',
    'UX Designer',
    'Sales Representative',
    'Sales Manager',
    'Marketing Specialist',
    'Marketing Manager',
    'HR Specialist',
    'HR Manager',
    'Finance Analyst',
    'Finance Manager',
    'Operations Manager',
    'Customer Support',
    'Quality Assurance',
    'DevOps Engineer',
    'Data Analyst',
    'Data Scientist',
    'Business Analyst',
    'Consultant',
    'Intern',
    'Other'
  ];

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'success' as const },
    { value: 'inactive', label: 'Inactive', color: 'error' as const }
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Employee</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Company Display (Read-only) */}
          <Grid size={12}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Company
              </Typography>
              <TextField
                value={companyName}
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
              value={formData.first_name}
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
              value={formData.last_name}
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
              value={formData.email}
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
              label="Phone"
              value={formData.phone}
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
            <FormControl fullWidth size="small">
              <InputLabel>Title</InputLabel>
              <Select
                value={formData.title}
                onChange={(e) => handleInputChange('title', e.target.value)}
                onBlur={() => handleBlur('title')}
                error={!!errors.title && touched.title}
                label="Title"
              >
                {titleOptions.map((title) => (
                  <MenuItem key={title} value={title}>
                    {title}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {errors.title && touched.title && (
              <Typography variant="caption" color="error" sx={{ mt: 0.5, display: 'block' }}>
                {errors.title}
              </Typography>
            )}
          </Grid>

          {/* Status */}
          <Grid size={{ xs: 12, md: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} label="Status">
                {statusOptions.map((status) => (
                  <MenuItem key={status.value} value={status.value}>
                    <Chip label={status.label} size="small" color={status.color} sx={{ mr: 1 }} />
                    {status.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>

          {/* Address */}
          <Grid size={12}>
            <TextField
              label="Address"
              value={formData.address}
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
          disabled={!formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()}
          sx={{
            bgcolor: '#2196F3',
            color: 'white',
            '&:hover': {
              bgcolor: '#2196F3',
              opacity: 0.9
            }
          }}
        >
          Create Employee
        </Button>
      </DialogActions>
    </Dialog>
  );
};
