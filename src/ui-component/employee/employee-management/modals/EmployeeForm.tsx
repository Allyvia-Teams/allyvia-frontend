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
  Alert,
  FormControlLabel,
  Switch,
  Divider,
  InputAdornment
} from '@mui/material';
import { IconPlus } from '@tabler/icons-react';
import { CreateEmployeeData } from 'types/employee';
import { validateEmail, validatePhone } from 'utils/employeeUtils';
import { useSelector } from 'store';

interface EmployeeFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateEmployeeData) => Promise<void>; // Make async
  apiError?: string; // Add API error prop
  loading?: boolean; // Add loading prop
}

export const EmployeeForm: React.FC<EmployeeFormProps> = ({ open, onClose, onSubmit, apiError, loading = false }) => {
  const { currentRole } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState<CreateEmployeeData>({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    title: '',
    address: '',
    rate: undefined,
    status: 'active',
    create_user_account: false
  });

  const [errors, setErrors] = useState<Partial<CreateEmployeeData>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof CreateEmployeeData, boolean>>>({});

  const handleInputChange = (field: keyof CreateEmployeeData, value: string | boolean) => {
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

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      // Normalize email before submission: trim whitespace and convert to lowercase
      const normalizedData = {
        ...formData,
        email: formData.email.trim().toLowerCase()
      };

      await onSubmit(normalizedData);
      // Only close if submission was successful (no error thrown)
      handleClose();
    } catch (error) {
      // Don't close the modal on error - let the parent handle the error display
      console.error('Form submission error:', error);
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
      rate: undefined,
      status: 'active'
    });
    setErrors({});
    setTouched({});
    onClose();
  };

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'success' as const },
    { value: 'inactive', label: 'Inactive', color: 'error' as const }
  ];

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle>Add New Employee</DialogTitle>
      {apiError && (
        <Box sx={{ px: 3, pb: 1 }}>
          <Alert severity="error" sx={{ mb: 2 }}>
            {apiError}
          </Alert>
        </Box>
      )}
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          {/* Company Display (Read-only) */}
          <Grid size={12}>
            <Box>
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>
                Company
              </Typography>
              <TextField
                value={currentRole?.company_name || 'No company selected'}
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

          {/* Create User Button */}
          <Grid size={12}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', mb: 1 }}>
              <Button
                variant="text"
                startIcon={<IconPlus size={14} />}
                onClick={handleSubmit}
                disabled={loading || !formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()}
                sx={{
                  py: 0.25,
                  px: 0.5,
                  fontSize: '0.75rem',
                  color: 'text.secondary',
                  textTransform: 'none',
                  minWidth: 'auto',
                  '&:hover': {
                    backgroundColor: 'transparent',
                    color: 'primary.main'
                  }
                }}
              >
                {loading ? 'Creating...' : 'Create User'}
              </Button>
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

          {/* Email - Half Width */}
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

          {/* User Account Creation */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 2, color: 'primary.main' }}>
              User Account Creation
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={formData.create_user_account}
                  onChange={(e) => handleInputChange('create_user_account', e.target.checked)}
                  color="primary"
                />
              }
              label="Create user account for this employee"
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              When enabled, a welcome email with password setup instructions will be sent to the employee.
            </Typography>
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
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              onBlur={() => handleBlur('title')}
              error={!!errors.title && touched.title}
              helperText={errors.title && touched.title ? errors.title : ''}
              fullWidth
              size="small"
              placeholder="e.g., Software Engineer, Project Manager"
            />
          </Grid>

          {/* Hourly Rate */}
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              label="Hourly Rate"
              type="number"
              value={formData.rate ?? ''}
              onChange={(e) => {
                const value = e.target.value === '' ? undefined : parseFloat(e.target.value);
                handleInputChange('rate', value);
              }}
              onBlur={() => handleBlur('rate')}
              error={!!errors.rate && touched.rate}
              helperText={errors.rate && touched.rate ? errors.rate : 'Optional hourly rate for this employee'}
              fullWidth
              size="small"
              inputProps={{ min: 0, step: 0.01 }}
              placeholder="0.00"
              InputProps={{
                startAdornment: <InputAdornment position="start">$</InputAdornment>
              }}
            />
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
          disabled={loading || !formData.first_name.trim() || !formData.last_name.trim() || !formData.email.trim()}
          sx={{
            bgcolor: '#2196F3',
            color: 'white',
            '&:hover': {
              bgcolor: '#2196F3',
              opacity: 0.9
            }
          }}
        >
          {loading ? 'Creating...' : 'Create Employee'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
