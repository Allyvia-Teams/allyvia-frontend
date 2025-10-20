import { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Grid,
  Typography,
  TextField,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions
} from '@mui/material';
import {
  IconBuildingStore,
  IconPlugConnected,
  IconSparkles,
  IconChartBar,
  IconMapPin,
  IconUsers,
  IconPackage,
  IconCalendar,
  IconPencil,
  IconCheck,
  IconX
} from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'store';
import { fetchCompanyProfile, generateCompanyProfile, updateCompanyProfile } from 'store/slices/analytics';
import MainCard from 'ui-component/cards/MainCard';
import ChipSelect from 'ui-component/extended/ChipSelect';
import { CompanyProfile } from 'types/analytics';
import { openSnackbar } from 'store/slices/snackbar';

// Dropdown options
const BUSINESS_TYPE_OPTIONS = ['B2B', 'B2C', 'B2B & B2C'];
const SIZE_OPTIONS = ['Micro (<$50k)', 'Small ($50k-$500k)', 'Medium ($500k-$5M)', 'Large (>$5M)'];

export default function CompanyProfileCard() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const qbStatus = useSelector((state) => state.integrations.quickbooks.connection.status);
  const profile = useSelector((state) => state.analytics.companyProfile);
  const isLoading = useSelector((state) => state.analytics.companyProfileLoading);
  const error = useSelector((state) => state.analytics.companyProfileError);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [editData, setEditData] = useState<Partial<CompanyProfile> | null>(null);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showEmptyFieldsDialog, setShowEmptyFieldsDialog] = useState(false);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);

  useEffect(() => {
    if (qbStatus === 'connected' && !profile && !isLoading && !error) {
      dispatch(fetchCompanyProfile());
    }
  }, [qbStatus, profile, isLoading, error, dispatch]);

  // Initialize edit data when entering edit mode
  useEffect(() => {
    if (isEditMode && profile) {
      setEditData({ ...profile });
    }
  }, [isEditMode, profile]);

  const hasChanges = useCallback(() => {
    if (!editData || !profile) return false;
    return JSON.stringify(editData) !== JSON.stringify(profile);
  }, [editData, profile]);

  const handleGenerate = () => {
    dispatch(generateCompanyProfile());
  };

  const handleRefresh = () => {
    dispatch(generateCompanyProfile());
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    if (hasChanges()) {
      setShowCancelDialog(true);
    } else {
      setIsEditMode(false);
      setEditData(null);
    }
  };

  const confirmCancel = () => {
    setIsEditMode(false);
    setEditData(null);
    setShowCancelDialog(false);
  };

  const handleSave = async (skipValidation = false) => {
    if (!editData || !profile) return;

    // Validate required fields (unless skipped)
    if (!skipValidation) {
      const empty: string[] = [];
      const requiredFields: (keyof CompanyProfile)[] = [
        'business_model',
        'customer_base_description',
        'vendor_base_description',
        'estimated_annual_revenue',
        'location_hint'
      ];

      requiredFields.forEach((field) => {
        if (!editData[field] || (editData[field] as string).trim() === '') {
          empty.push(field);
        }
      });

      // Check if all product_service_description bullets are empty
      if (editData.product_service_description && editData.product_service_description.every((item) => !item || item.trim() === '')) {
        empty.push('product_service_description');
      }

      if (empty.length > 0) {
        setEmptyFields(empty);
        setShowEmptyFieldsDialog(true);
        return;
      }
    }

    // Filter out empty fields - keep old values for those
    const updates: Partial<CompanyProfile> = {};
    Object.keys(editData).forEach((key) => {
      const value = editData[key as keyof CompanyProfile];
      if (value !== undefined && value !== null && value !== '') {
        if (Array.isArray(value)) {
          // For arrays, filter out empty strings
          updates[key as keyof CompanyProfile] = value.filter((item) => item && item.trim() !== '') as any;
        } else {
          updates[key as keyof CompanyProfile] = value as any;
        }
      }
    });

    try {
      await dispatch(updateCompanyProfile(updates)).unwrap();
      dispatch(
        openSnackbar({
          open: true,
          message: 'Company profile updated successfully',
          variant: 'alert',
          alert: { color: 'success' }
        })
      );
      setIsEditMode(false);
      setEditData(null);
    } catch (error: any) {
      dispatch(
        openSnackbar({
          open: true,
          message: error?.message || 'Failed to update company profile',
          variant: 'alert',
          alert: { color: 'error' }
        })
      );
    }
  };

  const handleFieldChange = (field: keyof CompanyProfile, value: any) => {
    setEditData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleBulletChange = (index: number, value: string) => {
    setEditData((prev) => {
      if (!prev || !prev.product_service_description) return prev;
      const newBullets = [...prev.product_service_description];
      newBullets[index] = value;
      return { ...prev, product_service_description: newBullets };
    });
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      if (e.key === 'Escape') {
        e.preventDefault();
        handleCancel();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, hasChanges, handleSave]);

  if (qbStatus === 'disconnected' || qbStatus === 'expired') {
    return (
      <MainCard sx={{ mb: 3 }}>
        <Alert severity="info" icon={<IconPlugConnected />}>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Connect your QuickBooks account to unlock AI-powered company profiling and business insights.
          </Typography>
          <Button variant="contained" color="primary" sx={{ color: 'white' }} onClick={() => navigate('/integrations')}>
            Connect QuickBooks
          </Button>
        </Alert>
      </MainCard>
    );
  }

  if (!profile) {
    return (
      <MainCard sx={{ mb: 3 }}>
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <IconSparkles size={48} style={{ marginBottom: 16, opacity: 0.7, color: '#1976d2' }} />
          <Typography variant="h4" gutterBottom>
            Generate Your AI-Powered Company Profile
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Our AI will analyze your QuickBooks data to create a comprehensive profile including industry classification, business model,
            customer insights, and more.
          </Typography>
          <Button
            variant="contained"
            color="primary"
            size="large"
            sx={{ color: 'white' }}
            startIcon={isLoading ? <CircularProgress size={20} color="inherit" /> : <IconSparkles />}
            disabled={isLoading}
            onClick={handleGenerate}
          >
            {isLoading ? 'Generating Profile...' : 'Generate Company Profile using AI'}
          </Button>
          {error && (
            <Alert severity="error" sx={{ mt: 2, mx: 'auto', maxWidth: 600 }}>
              Failed to generate profile. Please try again.
            </Alert>
          )}
        </Box>
      </MainCard>
    );
  }

  const confidencePercent = Math.round(profile.confidence_score * 100);
  const displayData = isEditMode && editData ? editData : profile;

  // Custom title component with icon, company name, and editable pills
  const cardTitle = (
    <Box display="flex" alignItems="center" gap={1} sx={{ width: '100%' }}>
      <IconBuildingStore size={32} />
      <Box sx={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: 2, flex: 1, flexWrap: 'wrap' }}>
        <Typography variant="h3">{profile.company_name}</Typography>
        <Box display="flex" gap={1} flexWrap="wrap" alignItems="center">
          <ChipSelect
            value={displayData.industry}
            onChange={(val) => handleFieldChange('industry', val)}
            isEditable={isEditMode}
            color="primary"
            size="small"
          />
          <ChipSelect
            value={displayData.business_type}
            onChange={(val) => handleFieldChange('business_type', val)}
            options={BUSINESS_TYPE_OPTIONS}
            isEditable={isEditMode}
            size="small"
          />
          <ChipSelect
            value={displayData.estimated_size}
            onChange={(val) => handleFieldChange('estimated_size', val)}
            options={SIZE_OPTIONS}
            isEditable={isEditMode}
            size="small"
          />
        </Box>
      </Box>
    </Box>
  );

  // Custom secondary actions for edit mode
  const cardActions = (
    <>
      {isEditMode ? (
        <>
          <IconButton onClick={handleSave} title="Save (Ctrl+S)" size="small" color="success" disabled={isLoading}>
            <IconCheck size={20} />
          </IconButton>
          <IconButton onClick={handleCancel} title="Cancel (Esc)" size="small" color="error">
            <IconX size={20} />
          </IconButton>
        </>
      ) : (
        <IconButton onClick={handleEdit} title="Edit Profile" size="small">
          <IconPencil size={20} />
        </IconButton>
      )}
    </>
  );

  return (
    <>
      <MainCard
        sx={{ mb: 3 }}
        title={cardTitle}
        collapsible={!isEditMode}
        defaultCollapsed={false}
        persistenceKey="company-profile-accordion"
        onRefresh={isEditMode ? undefined : handleRefresh}
        isRefreshing={isLoading}
        secondary={cardActions}
        content={false}
      >
        <Box sx={{ p: 3 }}>
          <Grid container spacing={3}>
            {/* Business Overview */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconChartBar size={20} />
                <Typography variant="h6">Business Overview</Typography>
              </Box>
              {isEditMode ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={displayData.business_model || ''}
                  onChange={(e) => handleFieldChange('business_model', e.target.value)}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {profile.business_model || 'Not available'}
                </Typography>
              )}
            </Grid>

            {/* Key Details */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconMapPin size={20} />
                <Typography variant="h6">Key Details</Typography>
              </Box>
              {isEditMode ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <TextField
                    fullWidth
                    label="Revenue"
                    value={displayData.estimated_annual_revenue || ''}
                    onChange={(e) => handleFieldChange('estimated_annual_revenue', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    label="Location"
                    value={displayData.location_hint || ''}
                    onChange={(e) => handleFieldChange('location_hint', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                  <TextField
                    fullWidth
                    multiline
                    rows={3}
                    label="Customer Base"
                    value={displayData.customer_base_description || ''}
                    onChange={(e) => handleFieldChange('customer_base_description', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                </Box>
              ) : (
                <>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Revenue:</strong> {profile.estimated_annual_revenue || 'Not available'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    <strong>Location:</strong> {profile.location_hint || 'Not specified'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    <strong>Customer Base:</strong> {profile.customer_base_description || 'Not available'}
                  </Typography>
                </>
              )}
            </Grid>

            {/* Vendor Relationships */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconUsers size={20} />
                <Typography variant="h6">Vendor Relationships</Typography>
              </Box>
              {isEditMode ? (
                <TextField
                  fullWidth
                  multiline
                  rows={4}
                  value={displayData.vendor_base_description || ''}
                  onChange={(e) => handleFieldChange('vendor_base_description', e.target.value)}
                  variant="outlined"
                  size="small"
                />
              ) : (
                <Typography variant="body2" color="text.secondary">
                  {profile.vendor_base_description || 'Not available'}
                </Typography>
              )}
            </Grid>

            {/* Seasonality Notes */}
            {(profile.seasonality_notes || isEditMode) && (
              <Grid size={{ xs: 12, md: 6 }}>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <IconCalendar size={20} />
                  <Typography variant="h6">Seasonality Notes</Typography>
                </Box>
                {isEditMode ? (
                  <TextField
                    fullWidth
                    multiline
                    rows={4}
                    value={displayData.seasonality_notes || ''}
                    onChange={(e) => handleFieldChange('seasonality_notes', e.target.value)}
                    variant="outlined"
                    size="small"
                  />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    {profile.seasonality_notes}
                  </Typography>
                )}
              </Grid>
            )}

            {/* Products & Services */}
            <Grid size={{ xs: 12 }}>
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <IconPackage size={20} />
                <Typography variant="h6">Products & Services</Typography>
              </Box>
              {isEditMode ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {displayData.product_service_description?.map((item, idx) => (
                    <TextField
                      key={idx}
                      fullWidth
                      value={item || ''}
                      onChange={(e) => handleBulletChange(idx, e.target.value)}
                      variant="outlined"
                      size="small"
                      placeholder={`Product/Service ${idx + 1}`}
                    />
                  ))}
                </Box>
              ) : profile.product_service_description && profile.product_service_description.length > 0 ? (
                <Grid container spacing={0}>
                  {profile.product_service_description.map((item, idx) => (
                    <Grid key={idx} size={{ xs: 12, sm: 6 }}>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        • {item}
                      </Typography>
                    </Grid>
                  ))}
                </Grid>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Not available
                </Typography>
              )}
            </Grid>
          </Grid>

          <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid', borderColor: 'divider', width: '100%' }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={1}>
              <Typography variant="caption" color="text.secondary">
                <strong>Confidence:</strong> {confidencePercent}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Last analyzed: {new Date(profile.updated_at).toLocaleString()}
              </Typography>
            </Box>
          </Box>
        </Box>
      </MainCard>

      {/* Cancel Confirmation Dialog */}
      <Dialog open={showCancelDialog} onClose={() => setShowCancelDialog(false)}>
        <DialogTitle>Discard Changes?</DialogTitle>
        <DialogContent>
          <DialogContentText>You have unsaved changes. Do you want to discard them?</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>Go Back</Button>
          <Button onClick={confirmCancel} color="error" variant="contained">
            Discard Changes
          </Button>
        </DialogActions>
      </Dialog>

      {/* Empty Fields Warning Dialog */}
      <Dialog open={showEmptyFieldsDialog} onClose={() => setShowEmptyFieldsDialog(false)}>
        <DialogTitle>Empty Fields Detected</DialogTitle>
        <DialogContent>
          <DialogContentText>The following fields are empty and will not be updated as they are required for insights:</DialogContentText>
          <Box component="ul" sx={{ mt: 2, mb: 0 }}>
            {emptyFields.map((field) => (
              <li key={field}>{field.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</li>
            ))}
          </Box>
          <DialogContentText sx={{ mt: 2 }}>
            Empty fields will keep their current values in the database. Do you want to proceed with saving the other changes?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowEmptyFieldsDialog(false)}>Go Back</Button>
          <Button
            onClick={() => {
              setShowEmptyFieldsDialog(false);
              // Proceed with save anyway, backend will handle keeping old values
              handleSave(true); // Skip validation on second attempt
            }}
            color="primary"
            variant="contained"
          >
            Save Changes
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
