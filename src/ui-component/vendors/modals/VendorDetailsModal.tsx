import React from 'react';
import { Dialog, DialogContent, DialogActions, Button, Box, Typography, Grid, IconButton, Chip, useTheme } from '@mui/material';
import { IconX, IconTruck } from '@tabler/icons-react';
import { Vendor } from 'types/vendor';

interface VendorDetailsModalProps {
  open: boolean;
  onClose: () => void;
  vendor: Vendor | null;
}

const VendorDetailsModal: React.FC<VendorDetailsModalProps> = ({ open, onClose, vendor }) => {
  const theme = useTheme();

  if (!vendor) return null;

  const formatDate = (value?: string) => {
    if (!value) return '—';
    const date = new Date(value);
    return isNaN(date.getTime()) ? '—' : date.toLocaleDateString();
  };

  const addressParts = [
    vendor.address_line1,
    vendor.address_line2,
    [vendor.city, vendor.state].filter(Boolean).join(', '),
    vendor.postal_code,
    vendor.country
  ].filter((part) => part && String(part).trim());

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        {/* Header row: Leading icon + title, subtitle shows contact; close on right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconTruck size={44} color={theme.palette.primary.main} />
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                {vendor.name || 'Vendor'}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {vendor.contact_name || '—'}
              </Typography>
            </Box>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Chip
              size="small"
              label={(vendor.status || 'active').toUpperCase()}
              color={vendor.status === 'inactive' ? 'error' : 'success'}
              variant="outlined"
            />
            <IconButton onClick={onClose} size="small">
              <IconX size={20} />
            </IconButton>
          </Box>
        </Box>

        <Grid container spacing={3}>
          {/* Contact Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Contact
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Contact Name
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.contact_name || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Email
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.email || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Phone
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.phone || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Website
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.website || '—'}
                </Typography>
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
              <Grid size={12}>
                <Typography variant="body1" fontWeight="medium">
                  {addressParts.length > 0 ? addressParts.join(', ') : '—'}
                </Typography>
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
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Account Number
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.account_number || '—'}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Tax ID
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.tax_id || '—'}
                </Typography>
              </Grid>
              <Grid size={4}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Payment Terms
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {vendor.payment_terms || '—'}
                </Typography>
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
                <Typography variant="body1">{vendor.notes || '—'}</Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Record Info Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Record Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Created
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(vendor.created_at)}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Last Updated
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {formatDate(vendor.updated_at)}
                </Typography>
              </Grid>
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default VendorDetailsModal;
