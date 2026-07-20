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
  InputAdornment
} from '@mui/material';
import { Employee, UpdateEmployeeData } from 'types/employee';
import { validateEmail, validatePhone } from 'utils/employeeUtils';
import { useSelector } from 'store';
import { employeeAPI } from 'api/employee.api';

interface EmployeeEditModalProps {
  open: boolean;
  employee: Employee | null;
  onClose: () => void;
  onUpdate: (updatedEmployee: Employee) => void;
}

export const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({ open, employee, onClose, onUpdate }) => {
  const { currentRole } = useSelector((state) => state.auth);
  const [formData, setFormData] = useState<UpdateEmployeeData>({});
  const [errors, setErrors] = useState<Partial<Record<keyof UpdateEmployeeData, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof UpdateEmployeeData, boolean>>>({});
  const [loading, setLoading] = useState(false);
  const [baseEmployee, setBaseEmployee] = useState<Employee | null>(employee);
  // Keep the raw Full Name string so typing a trailing space (before the last
  // name) is not swallowed by join+trim of first/last.
  const [fullNameInput, setFullNameInput] = useState('');

  // Fetch full details on open
  useEffect(() => {
    let cancelled = false;
    const fetchDetail = async () => {
      if (!open || !employee?.id || !currentRole?.company_id) {
        setBaseEmployee(employee || null);
        return;
      }
      setLoading(true);
      try {
        const data = await employeeAPI.getEmployee(employee.id, currentRole.company_id);
        if (!cancelled) setBaseEmployee(data as Employee);
      } catch {
        if (!cancelled) setBaseEmployee(employee || null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [open, employee?.id, currentRole?.company_id]);

  // Initialize form data when baseEmployee changes
  useEffect(() => {
    if (baseEmployee) {
      setFormData({
        first_name: baseEmployee.first_name,
        last_name: baseEmployee.last_name,
        email: baseEmployee.email,
        phone: baseEmployee.phone,
        title: baseEmployee.title,
        address: baseEmployee.address,
        rate: baseEmployee.rate,
        status: baseEmployee.status
      });
      setFullNameInput(`${baseEmployee.first_name || ''} ${baseEmployee.last_name || ''}`.trim());
      setErrors({});
      setTouched({});
    }
  }, [baseEmployee]);

  const handleInputChange = (field: keyof UpdateEmployeeData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const handleFullNameChange = (value: string) => {
    setFullNameInput(value);
    const trimmed = value.trim();
    const spaceIdx = trimmed.indexOf(' ');
    const first = spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx);
    const last = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1).trim();
    setFormData((prev) => ({ ...prev, first_name: first, last_name: last }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next.first_name;
      delete next.last_name;
      return next;
    });
  };

  const handleBlur = (field: keyof UpdateEmployeeData) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof UpdateEmployeeData, string>> = {};

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
    return Object.values(newErrors).every((v) => !v);
  };

  const handleSubmit = () => {
    if (validateForm() && baseEmployee) {
      // Normalize email before submission: trim whitespace and convert to lowercase
      const normalizedFormData = {
        ...formData,
        ...(formData.email && { email: formData.email.trim().toLowerCase() })
      };

      const updatedEmployee: Employee = {
        ...baseEmployee,
        ...normalizedFormData,
        status: (formData.status as Employee['status']) || baseEmployee.status
      };
      onUpdate(updatedEmployee);
    }
  };

  const handleClose = () => {
    setFormData({});
    setFullNameInput('');
    setErrors({});
    setTouched({});
    onClose();
  };

  const hasBlockingErrors = Object.values(errors).some(Boolean);

  const statusOptions = [
    { value: 'active', label: 'Active', color: 'success' as const },
    { value: 'inactive', label: 'Inactive', color: 'warning' as const }
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
              {baseEmployee?.full_name || employee.full_name} • {baseEmployee?.title || employee.title || 'No Title'} •{' '}
              {currentRole?.company_name || 'Unknown Company'}
            </Typography>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 3 }}>
        <Grid container spacing={3}>
          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Personal Information
              </Typography>

              <TextField
                label="Full Name *"
                value={fullNameInput}
                onChange={(e) => handleFullNameChange(e.target.value)}
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

          <Grid size={6}>
            <Box>
              <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                Professional Information
              </Typography>

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
                sx={{ mb: 2 }}
                inputProps={{ min: 0, step: 0.01 }}
                placeholder="0.00"
                InputProps={{
                  startAdornment: <InputAdornment position="start">$</InputAdornment>
                }}
              />

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
            </Box>
          </Grid>

          {/* Address block is optional; keep hidden unless needed */}
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={hasBlockingErrors || loading}
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
