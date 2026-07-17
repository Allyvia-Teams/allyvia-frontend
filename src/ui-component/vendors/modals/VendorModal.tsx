import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert
} from '@mui/material';
import { IconX, IconTruck } from '@tabler/icons-react';
import { Vendor, VendorFormData } from 'types/vendor';
import { useDispatch, useSelector } from 'store';
import { createVendor, updateVendor, clearError } from 'store/slices/vendors';
import { openSnackbar } from 'store/slices/snackbar';

interface VendorModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  vendor?: Vendor | null; // Required for edit mode
}

const emptyFormData: VendorFormData = {
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: '',
  account_number: '',
  tax_id: '',
  payment_terms: '',
  notes: '',
  status: 'active'
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const VendorModal: React.FC<VendorModalProps> = ({ open, onClose, mode, vendor }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.vendors);

  const [formData, setFormData] = useState<VendorFormData>(emptyFormData);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Initialize form data based on mode
  useEffect(() => {
    if (open) {
      // Clear any previous errors and reset form when modal opens
      dispatch(clearError());
      setValidationErrors({});

      if (mode === 'edit' && vendor) {
        // Edit mode: populate form with existing vendor data
        setFormData({
          name: vendor.name || '',
          contact_name: vendor.contact_name || '',
          email: vendor.email || '',
          phone: vendor.phone || '',
          website: vendor.website || '',
          address_line1: vendor.address_line1 || '',
          address_line2: vendor.address_line2 || '',
          city: vendor.city || '',
          state: vendor.state || '',
          postal_code: vendor.postal_code || '',
          country: vendor.country || '',
          account_number: vendor.account_number || '',
          tax_id: vendor.tax_id || '',
          payment_terms: vendor.payment_terms || '',
          notes: vendor.notes || '',
          status: vendor.status || 'active'
        });
      } else {
        // Add mode: reset to default values
        setFormData(emptyFormData);
      }
    }
  }, [open, mode, vendor, dispatch]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Vendor name is required';
    }

    if (formData.email.trim() && !EMAIL_REGEX.test(formData.email.trim())) {
      errors.email = 'Enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof VendorFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      const action =
        mode === 'add'
          ? await dispatch(createVendor(formData) as any)
          : await dispatch(updateVendor({ vendorId: vendor!.id, vendorData: formData }) as any);

      if (action?.type?.endsWith('/fulfilled')) {
        dispatch(
          openSnackbar({
            open: true,
            message: mode === 'add' ? 'Vendor created successfully' : 'Vendor updated successfully',
            variant: 'alert',
            alert: { color: 'success' }
          })
        );
        onClose();
      } else {
        dispatch(
          openSnackbar({
            open: true,
            message: action?.error?.message || `Failed to ${mode === 'add' ? 'create' : 'update'} vendor`,
            variant: 'alert',
            alert: { color: 'error' }
          })
        );
      }
    } catch (err) {
      console.error(`Failed to ${mode} vendor:`, err);
    }
  };

  const handleClose = () => {
    // Clear errors and reset form state when closing
    dispatch(clearError());
    setValidationErrors({});
    setFormData(emptyFormData);
    onClose();
  };

  // Modal configuration based on mode
  const modalConfig = {
    title: mode === 'add' ? 'Add Vendor' : 'Edit Vendor',
    icon: IconTruck,
    iconColor: '#1976d2',
    buttonText: mode === 'add' ? 'Add Vendor' : 'Update Vendor',
    buttonLoadingText: mode === 'add' ? 'Adding Vendor...' : 'Updating Vendor...',
    subtitle:
      mode === 'add'
        ? 'Create a new vendor with all necessary details'
        : `${vendor?.name || 'Unknown Vendor'} • ${vendor?.contact_name || 'No Contact'} • ${vendor?.email || 'No Email'}`
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <modalConfig.icon size={24} color={modalConfig.iconColor} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {modalConfig.title}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {modalConfig.subtitle}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Basic Information Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Basic Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Vendor Name *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  fullWidth
                  size="small"
                  placeholder="e.g., Acme Supplies Co."
                />
              </Grid>

              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} label="Status">
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </Grid>

          {/* Contact Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Contact
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Contact Name"
                  value={formData.contact_name}
                  onChange={(e) => handleInputChange('contact_name', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Jane Smith"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  error={!!validationErrors.email}
                  helperText={validationErrors.email}
                  fullWidth
                  size="small"
                  placeholder="e.g., orders@acme.com"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Phone"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., (555) 123-4567"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Website"
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., https://acme.com"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Address Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Address
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Address Line 1"
                  value={formData.address_line1}
                  onChange={(e) => handleInputChange('address_line1', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., 123 Main St"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Address Line 2"
                  value={formData.address_line2}
                  onChange={(e) => handleInputChange('address_line2', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Suite 400"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="City"
                  value={formData.city}
                  onChange={(e) => handleInputChange('city', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="State"
                  value={formData.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Postal Code"
                  value={formData.postal_code}
                  onChange={(e) => handleInputChange('postal_code', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Country"
                  value={formData.country}
                  onChange={(e) => handleInputChange('country', e.target.value)}
                  fullWidth
                  size="small"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Financial Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Financial
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Account Number"
                  value={formData.account_number}
                  onChange={(e) => handleInputChange('account_number', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Your account number with this vendor"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Tax ID"
                  value={formData.tax_id}
                  onChange={(e) => handleInputChange('tax_id', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., EIN, ABN or VAT number"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Payment Terms"
                  value={formData.payment_terms}
                  onChange={(e) => handleInputChange('payment_terms', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Net 30"
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Notes Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Notes
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={12}>
                <TextField
                  label="Notes"
                  multiline
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Additional notes about this vendor..."
                />
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? modalConfig.buttonLoadingText : modalConfig.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorModal;
