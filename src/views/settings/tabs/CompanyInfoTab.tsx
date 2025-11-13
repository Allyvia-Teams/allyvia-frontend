import React from 'react';
import {
  Grid,
  Card,
  CardContent,
  Stack,
  Typography,
  TextField,
  Button,
  Box,
  Divider,
  Alert,
  Chip,
  Avatar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText
} from '@mui/material';
import { useSelector, useDispatch } from 'store';
import { companyAPI, type UpdateCompanyData } from '../../../api/company.api';
import type { Company } from 'types/company';
import type { Role } from 'types/role';
import type { QuickBooksConnection } from 'store/slices/integrations';
import { getApiErrorMessage, getValidationErrors } from 'types/api';
import { IconEdit, IconCheck, IconX, IconPlugConnected, IconPlug } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';
import { fetchQBConnectionStatus } from 'store/slices/integrations';
import { Country, State } from 'country-state-city';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: string;
  status: 'connected' | 'disconnected' | 'available' | 'coming_soon' | 'expired';
  route?: string;
}

interface ValidationErrors {
  companyName?: string;
  companyUrl?: string;
  industry?: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  [key: string]: string | undefined;
}

// Map Company to form data structure
interface CompanyInfoFormData {
  companyName: string;
  companyUrl?: string;
  industry?: string;
  taxId?: string;
  contactEmail?: string;
  contactPhone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

/**
 * Convert company API response to form data
 * Handles mapping from snake_case (API) to camelCase (form)
 */
const companyToFormData = (company: Company): CompanyInfoFormData => ({
  companyName: company.name ?? '',
  companyUrl: company.company_url ?? undefined,
  industry: company.industry ?? undefined,
  taxId: company.tax_id ?? undefined,
  contactEmail: company.contact_email ?? undefined,
  contactPhone: company.contact_phone ?? undefined,
  addressLine1: company.address_line1 ?? undefined,
  addressLine2: company.address_line2 ?? undefined,
  city: company.city ?? undefined,
  state: company.state ?? undefined,
  postalCode: company.postal_code ?? undefined,
  country: company.country ?? undefined
});

/**
 * Convert form data to company API update payload
 * Maps from camelCase (form) to snake_case (API)
 *
 * Note: Backend API documentation shows only 'name' field is documented.
 * These company info fields need backend support in the Company model.
 * Only includes fields that have values to avoid sending undefined/null unnecessarily.
 */
const formDataToCompanyUpdate = (formData: CompanyInfoFormData): UpdateCompanyData => {
  const payload: UpdateCompanyData = {
    name: formData.companyName?.trim() || ''
  };

  // Only include optional fields that have values (skip empty strings and undefined)
  if (formData.companyUrl && formData.companyUrl.trim()) {
    payload.company_url = formData.companyUrl.trim();
  }
  if (formData.industry && formData.industry.trim()) {
    payload.industry = formData.industry.trim();
  }
  if (formData.taxId && formData.taxId.trim()) {
    payload.tax_id = formData.taxId.trim();
  }
  if (formData.contactEmail && formData.contactEmail.trim()) {
    payload.contact_email = formData.contactEmail.trim();
  }
  if (formData.contactPhone && formData.contactPhone.trim()) {
    payload.contact_phone = formData.contactPhone.trim();
  }
  if (formData.addressLine1 && formData.addressLine1.trim()) {
    payload.address_line1 = formData.addressLine1.trim();
  }
  if (formData.addressLine2 && formData.addressLine2.trim()) {
    payload.address_line2 = formData.addressLine2.trim();
  }
  if (formData.city && formData.city.trim()) {
    payload.city = formData.city.trim();
  }
  if (formData.state && formData.state.trim()) {
    payload.state = formData.state.trim();
  }
  if (formData.postalCode && formData.postalCode.trim()) {
    payload.postal_code = formData.postalCode.trim();
  }
  if (formData.country && formData.country.trim()) {
    payload.country = formData.country.trim();
  }

  return payload;
};

/**
 * CompanyInfoTab Component
 *
 * Displays and allows editing of company information.
 * Data is saved to the company table via PUT /api/v1/company/{id}/
 *
 * Note: Backend API documentation shows only 'name' field is documented
 * for company updates. Company info fields (company_url, industry, tax_id,
 * contact_email, contact_phone, address fields) need backend support.
 *
 * If backend doesn't support these fields yet, the API may:
 * - Return 400 Bad Request with validation errors
 * - Ignore unsupported fields and only update 'name'
 *
 * Backend needs to:
 * 1. Add these fields to Company model
 * 2. Update CompanySerializer to accept these fields
 * 3. Update Company model validation if needed
 */
export default function CompanyInfoTab() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [company, setCompany] = React.useState<Company | null>(null);
  const [editMode, setEditMode] = React.useState(false);
  const [formData, setFormData] = React.useState<CompanyInfoFormData | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [validationErrors, setValidationErrors] = React.useState<ValidationErrors>({});
  const currentRole: Role | null = useSelector((s) => s.auth.currentRole);
  const quickbooksConnection: QuickBooksConnection = useSelector((s) => s.integrations.quickbooks.connection);
  const isAdmin: boolean = currentRole?.role_type === 'admin';
  const companyId: string | null = currentRole?.company_id ?? null;

  // Get available states/provinces based on selected country
  const availableStates = React.useMemo(() => {
    if (!formData?.country) return [];
    return State.getStatesOfCountry(formData.country);
  }, [formData?.country]);

  // Fetch company data
  React.useEffect(() => {
    const fetchCompany = async () => {
      if (!companyId) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const companyData = await companyAPI.getCompany(companyId);
        setCompany(companyData);
        setFormData(companyToFormData(companyData));
      } catch (error: unknown) {
        const errorMessage = getApiErrorMessage(error) || 'Failed to load company information';
        setSaveError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompany();
  }, [companyId]);

  // Fetch QuickBooks connection status on mount
  React.useEffect(() => {
    if (companyId && isAdmin) {
      dispatch(fetchQBConnectionStatus(companyId));
    }
  }, [companyId, isAdmin, dispatch]);

  if (isLoading) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Typography>Loading company information...</Typography>
        </CardContent>
      </Card>
    );
  }

  if (!company || !formData || !companyId) {
    return (
      <Card variant="outlined">
        <CardContent>
          <Alert severity="error">No company information available</Alert>
        </CardContent>
      </Card>
    );
  }

  const handleEdit = (): void => {
    if (company) {
      setFormData(companyToFormData(company));
    }
    setEditMode(true);
    setSaveError(null);
    setSaveSuccess(false);
    setValidationErrors({});
  };

  const handleCancel = () => {
    if (company) {
      setFormData(companyToFormData(company));
    }
    setEditMode(false);
    setSaveError(null);
    setSaveSuccess(false);
    setValidationErrors({});
  };

  // Validation function
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {};

    // Company Name validation
    if (!formData?.companyName?.trim()) {
      errors.companyName = 'Company Name is required';
    } else if (formData.companyName.trim().length < 2) {
      errors.companyName = 'Company Name must be at least 2 characters';
    } else if (formData.companyName.trim().length > 255) {
      errors.companyName = 'Company Name must be less than 255 characters';
    }

    // Company URL validation (optional but must be valid if provided)
    if (formData?.companyUrl && formData.companyUrl.trim()) {
      const urlValue = formData.companyUrl.trim();
      // Basic URL validation - accept URLs with or without protocol
      const urlRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i;
      if (!urlRegex.test(urlValue)) {
        errors.companyUrl = 'Please enter a valid URL (e.g., example.com or https://example.com)';
      } else if (urlValue.length > 255) {
        errors.companyUrl = 'URL must be less than 255 characters';
      }
    }

    // Industry validation (optional)
    if (formData?.industry && formData.industry.trim().length > 255) {
      errors.industry = 'Industry must be less than 255 characters';
    }

    // Tax ID / EIN validation (optional but must be valid format if provided)
    if (formData?.taxId && formData.taxId.trim()) {
      // Accept formats like: XX-XXXXXXX, XX-XXX-XXXX, or alphanumeric
      const taxIdRegex = /^[A-Z0-9-]{4,20}$/i;
      if (!taxIdRegex.test(formData.taxId.trim())) {
        errors.taxId = 'Please enter a valid Tax ID / EIN (e.g., 12-3456789)';
      }
    }

    // Contact Email validation (optional but must be valid if provided)
    if (formData?.contactEmail && formData.contactEmail.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contactEmail.trim())) {
        errors.contactEmail = 'Please enter a valid email address';
      } else if (formData.contactEmail.trim().length > 255) {
        errors.contactEmail = 'Email must be less than 255 characters';
      }
    }

    // Contact Phone validation (optional but must be valid if provided)
    if (formData?.contactPhone && formData.contactPhone.trim()) {
      // Accept formats like: +1-234-567-8900, (123) 456-7890, 123-456-7890, or digits only
      const phoneRegex = /^[\d\s\+\-\(\)]{10,20}$/;
      if (!phoneRegex.test(formData.contactPhone.trim())) {
        errors.contactPhone = 'Please enter a valid phone number (10-20 digits)';
      }
    }

    // Address Line 1 validation (required)
    if (!formData?.addressLine1?.trim()) {
      errors.addressLine1 = 'Address Line 1 is required';
    } else if (formData.addressLine1.trim().length < 3) {
      errors.addressLine1 = 'Address Line 1 must be at least 3 characters';
    } else if (formData.addressLine1.trim().length > 255) {
      errors.addressLine1 = 'Address Line 1 must be less than 255 characters';
    }

    // Address Line 2 validation (optional)
    if (formData?.addressLine2 && formData.addressLine2.trim().length > 255) {
      errors.addressLine2 = 'Address Line 2 must be less than 255 characters';
    }

    // City validation (required)
    if (!formData?.city?.trim()) {
      errors.city = 'City is required';
    } else if (formData.city.trim().length < 2) {
      errors.city = 'City must be at least 2 characters';
    } else if (formData.city.trim().length > 100) {
      errors.city = 'City must be less than 100 characters';
    }

    // State/Province validation (required)
    if (!formData?.state?.trim()) {
      errors.state = 'State/Province is required';
    }

    // Postal Code validation (required)
    if (!formData?.postalCode?.trim()) {
      errors.postalCode = 'Postal Code is required';
    } else {
      // Accept various postal code formats (US ZIP, Canadian, UK, etc.)
      const postalCodeRegex = /^[A-Z0-9\s-]{3,12}$/i;
      if (!postalCodeRegex.test(formData.postalCode.trim())) {
        errors.postalCode = 'Please enter a valid postal code (3-12 characters)';
      }
    }

    // Country validation (required)
    if (!formData?.country?.trim()) {
      errors.country = 'Country is required';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async (): Promise<void> => {
    if (!companyId || !formData) {
      setSaveError('Company ID or form data is missing');
      return;
    }

    // Validate form before saving
    if (!validateForm()) {
      setSaveError('Please fix the validation errors before saving');
      return;
    }

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    setValidationErrors({});

    try {
      const updatePayload = formDataToCompanyUpdate(formData);
      const updatedCompany: Company = await companyAPI.updateCompany(companyId, updatePayload);
      setCompany(updatedCompany);
      setFormData(companyToFormData(updatedCompany));
      setEditMode(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error: unknown) {
      // Handle API errors based on API documentation format
      const apiError = error as {
        response?: {
          status?: number;
          data?: Record<string, string | string[] | unknown>;
        };
      };

      // Handle 403 Forbidden (not admin)
      if (apiError.response?.status === 403) {
        setSaveError('Only admins can update company details');
        return;
      }

      // Handle 404 Not Found
      if (apiError.response?.status === 404) {
        setSaveError("Company not found or you don't have access");
        return;
      }

      // Handle 400 Bad Request (validation errors)
      const validationErrorsFromApi = getValidationErrors(error);
      if (validationErrorsFromApi) {
        // Map API validation errors (snake_case) to form fields (camelCase)
        const fieldMap: Record<string, keyof ValidationErrors> = {
          name: 'companyName',
          company_url: 'companyUrl',
          industry: 'industry',
          tax_id: 'taxId',
          contact_email: 'contactEmail',
          contact_phone: 'contactPhone',
          address_line1: 'addressLine1',
          address_line2: 'addressLine2',
          city: 'city',
          state: 'state',
          postal_code: 'postalCode',
          country: 'country'
        };

        const apiValidationErrors: ValidationErrors = {};
        Object.keys(validationErrorsFromApi).forEach((key) => {
          const formField = fieldMap[key];
          if (formField) {
            apiValidationErrors[formField] = validationErrorsFromApi[key];
          }
        });

        if (Object.keys(apiValidationErrors).length > 0) {
          setValidationErrors(apiValidationErrors);
        }
      }

      // Set general error message
      const errorMessage = getApiErrorMessage(error) || 'Failed to update company information';
      setSaveError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFieldChange = (field: keyof CompanyInfoFormData, value: string): void => {
    if (!formData) return;

    setFormData((prev) => {
      if (!prev) return null;
      return { ...prev, [field]: value };
    });

    // Clear validation error for this field when user types
    if (validationErrors[field as keyof ValidationErrors]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof ValidationErrors];
        return newErrors;
      });
    }

    // Clear state when country changes
    if (field === 'country') {
      setFormData((prev) => {
        if (!prev) return null;
        return { ...prev, state: '' };
      });
      // Clear state validation error when country changes
      if (validationErrors.state) {
        setValidationErrors((prev) => {
          const newErrors = { ...prev };
          delete newErrors.state;
          return newErrors;
        });
      }
    }
  };

  const renderReadOnlyField = (label: string, value: string | undefined) => (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        {label}
      </Typography>
      <Typography variant="body1" sx={{ fontWeight: 500 }}>
        {value || '-'}
      </Typography>
    </Box>
  );

  const renderEditField = (
    label: string,
    field: keyof CompanyInfoFormData,
    type: string = 'text',
    placeholder?: string,
    required: boolean = false
  ) => {
    const error = validationErrors[field as keyof ValidationErrors];
    return (
      <TextField
        label={label}
        type={type}
        value={formData[field] || ''}
        onChange={(e) => handleFieldChange(field, e.target.value)}
        fullWidth
        placeholder={placeholder}
        size="small"
        required={required}
        error={!!error}
        helperText={error || ''}
        FormHelperTextProps={{
          sx: {
            margin: error ? '4px 14px 0' : '0',
            fontSize: '0.75rem',
            minHeight: error ? '20px' : '0'
          }
        }}
      />
    );
  };

  const renderCountrySelect = () => {
    const error = validationErrors.country;
    return (
      <FormControl fullWidth size="small" required error={!!error}>
        <InputLabel>Country *</InputLabel>
        <Select value={formData?.country || ''} onChange={(e) => handleFieldChange('country', e.target.value)} label="Country *">
          <MenuItem value="">
            <em>Select a country</em>
          </MenuItem>
          {Country.getAllCountries().map((country) => (
            <MenuItem key={country.isoCode} value={country.isoCode}>
              {country.name}
            </MenuItem>
          ))}
        </Select>
        {error && <FormHelperText sx={{ margin: '4px 14px 0', fontSize: '0.75rem', color: 'error.main' }}>{error}</FormHelperText>}
      </FormControl>
    );
  };

  const renderStateSelect = () => {
    const states = availableStates;
    const hasStates = states.length > 0;
    const error = validationErrors.state;

    if (hasStates) {
      return (
        <FormControl fullWidth size="small" required error={!!error}>
          <InputLabel>State/Province *</InputLabel>
          <Select
            value={formData?.state || ''}
            onChange={(e) => handleFieldChange('state', e.target.value)}
            label="State/Province *"
            disabled={!formData?.country}
          >
            <MenuItem value="">
              <em>Select a state/province</em>
            </MenuItem>
            {states.map((state) => (
              <MenuItem key={state.isoCode} value={state.isoCode}>
                {state.name}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText sx={{ margin: '4px 14px 0', fontSize: '0.75rem', color: 'error.main' }}>{error}</FormHelperText>}
        </FormControl>
      );
    }

    // If no states available for the country, show text field
    return renderEditField('State/Province *', 'state', 'text', undefined, true);
  };

  // Get integration status based on connection state
  const getIntegrationStatus = (integrationId: string): Integration['status'] => {
    if (integrationId === 'quickbooks') {
      const status = quickbooksConnection.status;
      if (status === 'connected' && quickbooksConnection.accessTokenValid) {
        return 'connected';
      } else if (status === 'expired') {
        return 'expired';
      } else if (status === 'disconnected') {
        return 'disconnected';
      }
      return 'available';
    }
    return 'coming_soon';
  };

  const getStatusColor = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'success';
      case 'disconnected':
      case 'available':
        return 'primary';
      case 'expired':
        return 'warning';
      case 'coming_soon':
        return 'default';
      default:
        return 'default';
    }
  };

  const getStatusText = (status: Integration['status']) => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Not Connected';
      case 'available':
        return 'Available';
      case 'expired':
        return 'Expired';
      case 'coming_soon':
        return 'Coming Soon';
      default:
        return status;
    }
  };

  const integrations: Integration[] = [
    {
      id: 'quickbooks',
      name: 'QuickBooks',
      description: 'Sync your financial data with QuickBooks Online',
      icon: QuickBooksIcon,
      status: getIntegrationStatus('quickbooks'),
      route: '/integrations/quickbooks'
    }
    // Add more integrations here as they become available
  ];

  const handleIntegrationClick = (integration: Integration) => {
    if (
      integration.route &&
      (integration.status === 'available' || integration.status === 'disconnected' || integration.status === 'expired')
    ) {
      if (integration.id === 'quickbooks' && !isAdmin) {
        return;
      }
      navigate(integration.route);
    }
  };

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12 }}>
        {!isAdmin && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Only administrators can edit business information.
          </Alert>
        )}

        {saveSuccess && (
          <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSaveSuccess(false)}>
            Business information updated successfully!
          </Alert>
        )}

        {saveError && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setSaveError(null)}>
            {saveError}
          </Alert>
        )}

        <Card variant="outlined">
          <CardContent>
            <Stack spacing={3}>
              {/* Basic Information Section */}
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                    Basic Information
                  </Typography>
                  {isAdmin && !editMode && (
                    <Button variant="outlined" startIcon={<IconEdit size={18} />} onClick={handleEdit} size="small">
                      Edit
                    </Button>
                  )}
                  {isAdmin && editMode && (
                    <Stack direction="row" spacing={1}>
                      <Button variant="outlined" startIcon={<IconX size={18} />} onClick={handleCancel} disabled={isSaving} size="small">
                        Cancel
                      </Button>
                      <Button
                        variant="contained"
                        startIcon={<IconCheck size={18} />}
                        onClick={handleSave}
                        disabled={isSaving}
                        sx={{ color: 'white' }}
                        size="small"
                      >
                        Save
                      </Button>
                    </Stack>
                  )}
                </Box>
                <Stack spacing={2}>
                  {editMode ? (
                    <>
                      {renderEditField('Company Name *', 'companyName', 'text', 'Enter company name', true)}
                      {renderEditField('Company URL', 'companyUrl', 'url', 'https://example.com', false)}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        {renderEditField('Industry', 'industry', 'text', 'e.g., Software, Retail, Manufacturing', false)}
                        {renderEditField('Tax ID / EIN', 'taxId', 'text', '12-3456789', false)}
                      </Stack>
                    </>
                  ) : (
                    <>
                      {renderReadOnlyField('Company Name', formData.companyName)}
                      {renderReadOnlyField('Company URL', formData.companyUrl)}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>{renderReadOnlyField('Industry', formData.industry)}</Box>
                        <Box sx={{ flex: 1 }}>{renderReadOnlyField('Tax ID / EIN', formData.taxId)}</Box>
                      </Stack>
                    </>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Contact Information Section */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Contact Information
                </Typography>
                <Stack spacing={2}>
                  {editMode ? (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      {renderEditField('Contact Email', 'contactEmail', 'email')}
                      {renderEditField('Contact Phone', 'contactPhone', 'tel')}
                    </Stack>
                  ) : (
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                      <Box sx={{ flex: 1 }}>{renderReadOnlyField('Contact Email', formData.contactEmail)}</Box>
                      <Box sx={{ flex: 1 }}>{renderReadOnlyField('Contact Phone', formData.contactPhone)}</Box>
                    </Stack>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Address Information Section */}
              <Box>
                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                  Address Information
                </Typography>
                <Stack spacing={2}>
                  {editMode ? (
                    <>
                      {renderEditField('Address Line 1 *', 'addressLine1', 'text', 'Enter street address', true)}
                      {renderEditField('Address Line 2', 'addressLine2', 'text', 'Apartment, suite, unit, etc. (optional)', false)}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>{renderEditField('City *', 'city', 'text', 'Enter city', true)}</Box>
                        <Box sx={{ flex: 1 }}>{renderStateSelect()}</Box>
                        <Box sx={{ flex: 1 }}>{renderEditField('Postal Code *', 'postalCode', 'text', 'Enter postal code', true)}</Box>
                      </Stack>
                      {renderCountrySelect()}
                    </>
                  ) : (
                    <>
                      {renderReadOnlyField('Address Line 1', formData.addressLine1)}
                      {renderReadOnlyField('Address Line 2', formData.addressLine2)}
                      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Box sx={{ flex: 1 }}>{renderReadOnlyField('City', formData.city)}</Box>
                        <Box sx={{ flex: 1 }}>
                          {renderReadOnlyField(
                            'State/Province',
                            (() => {
                              if (!formData.state) return formData.state;
                              if (formData.country) {
                                const states = State.getStatesOfCountry(formData.country);
                                const state = states.find((s) => s.isoCode === formData.state);
                                return state?.name || formData.state;
                              }
                              return formData.state;
                            })()
                          )}
                        </Box>
                        <Box sx={{ flex: 1 }}>{renderReadOnlyField('Postal Code', formData.postalCode)}</Box>
                      </Stack>
                      {renderReadOnlyField(
                        'Country',
                        formData.country ? Country.getCountryByCode(formData.country)?.name || formData.country : formData.country
                      )}
                    </>
                  )}
                </Stack>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Integrations Section */}
        <Card variant="outlined" sx={{ mt: 2 }}>
          <CardContent>
            <Stack spacing={3}>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Integrations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Connect your favorite tools and services to streamline your workflow
                </Typography>
              </Box>

              <Divider />

              {!isAdmin && (
                <Alert severity="info">
                  Only administrators can manage integrations. Your role: {currentRole?.role_display || currentRole?.role_type || 'N/A'}
                </Alert>
              )}

              <Grid container spacing={2}>
                {integrations.map((integration) => {
                  const statusColor = getStatusColor(integration.status);
                  const statusText = getStatusText(integration.status);
                  const isClickable =
                    integration.route &&
                    (integration.status === 'available' || integration.status === 'disconnected' || integration.status === 'expired') &&
                    isAdmin;

                  return (
                    <Grid key={integration.id} size={{ xs: 12, sm: 6, md: 4 }}>
                      <Card
                        variant="outlined"
                        sx={{
                          height: '100%',
                          cursor: isClickable ? 'pointer' : 'default',
                          transition: 'all 0.2s',
                          '&:hover': isClickable
                            ? {
                                boxShadow: 4,
                                transform: 'translateY(-2px)'
                              }
                            : {},
                          opacity: integration.status === 'coming_soon' ? 0.7 : 1
                        }}
                        onClick={() => handleIntegrationClick(integration)}
                      >
                        <CardContent>
                          <Stack spacing={2}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar
                                variant="rounded"
                                sx={{
                                  width: 56,
                                  height: 56,
                                  bgcolor: 'transparent',
                                  p: 0.5
                                }}
                              >
                                <img
                                  src={integration.icon}
                                  alt={integration.name}
                                  style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                              </Avatar>
                              <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                  {integration.name}
                                </Typography>
                                <Chip
                                  label={statusText}
                                  color={statusColor as any}
                                  size="small"
                                  icon={integration.status === 'connected' ? <IconPlugConnected size={16} /> : <IconPlug size={16} />}
                                  sx={{ mt: 0.5 }}
                                />
                              </Box>
                            </Box>
                            <Typography variant="body2" color="text.secondary">
                              {integration.description}
                            </Typography>
                            {integration.status === 'expired' && (
                              <Alert severity="warning" sx={{ mt: 1 }}>
                                Connection expired. Please reconnect.
                              </Alert>
                            )}
                            {integration.status === 'connected' && quickbooksConnection.companyId && (
                              <Box>
                                <Typography variant="caption" color="text.secondary">
                                  Company ID: {quickbooksConnection.companyId}
                                </Typography>
                                {quickbooksConnection.lastAuth && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                                    Last connected: {new Date(quickbooksConnection.lastAuth).toLocaleDateString()}
                                  </Typography>
                                )}
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>

              {integrations.length === 0 && (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No integrations available at this time.
                  </Typography>
                </Box>
              )}
            </Stack>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}
