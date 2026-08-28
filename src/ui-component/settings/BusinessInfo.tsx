import { useEffect, useRef, useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { IconBuildingSkyscraper } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { getCompanyBusinessInfo, updateCompanyBusinessInfo } from 'api/settings';
import { CompanyBusinessInfo, UpdateCompanyPayload } from 'types/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface BusinessInfoProps {
  companyId: string;
}

type FormState = {
  name: string;
  industry: string;
  tax_id: string;
  business_phone: string;
  business_email: string;
  website: string;
  address_line1: string;
  address_line2: string;
  city: string;
  state: string;
  postal_code: string;
  country: string;
};

const EMPTY_FORM: FormState = {
  name: '',
  industry: '',
  tax_id: '',
  business_phone: '',
  business_email: '',
  website: '',
  address_line1: '',
  address_line2: '',
  city: '',
  state: '',
  postal_code: '',
  country: ''
};

const fieldsFromData = (data: CompanyBusinessInfo): FormState => ({
  name: data.name || '',
  industry: data.industry || '',
  tax_id: data.tax_id || '',
  business_phone: data.business_phone || '',
  business_email: data.business_email || '',
  website: data.website || '',
  address_line1: data.address_line1 || '',
  address_line2: data.address_line2 || '',
  city: data.city || '',
  state: data.state || '',
  postal_code: data.postal_code || '',
  country: data.country || ''
});

export default function BusinessInfo({ companyId }: BusinessInfoProps) {
  const { data, isLoading, mutate } = useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId));

  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // This card shares its SWR key with the marketplace listing card, so a
  // revalidation can arrive while somebody is mid-sentence in one of these
  // fields. Without the guard, `data` changing identity re-seeds the form and
  // silently discards what they typed.
  const dirtyRef = useRef(false);

  useEffect(() => {
    if (!data) return;
    if (dirtyRef.current) return;
    setForm(fieldsFromData(data));
  }, [data]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isDirty = !!data && (Object.keys(form) as Array<keyof FormState>).some((k) => form[k] !== fieldsFromData(data)[k]);
  // Assigned AFTER isDirty exists — reading it above would be a TDZ error.
  dirtyRef.current = isDirty;

  const handleReset = () => {
    if (data) setForm(fieldsFromData(data));
    setError(null);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);

    const original = fieldsFromData(data);
    const payload: UpdateCompanyPayload = {};
    (Object.keys(form) as Array<keyof FormState>).forEach((key) => {
      if (form[key] !== original[key]) {
        (payload as Record<string, string>)[key] = form[key].trim();
      }
    });

    try {
      await updateCompanyBusinessInfo(companyId, payload);
      await mutate();
      dispatch(
        openSnackbar({
          open: true,
          message: 'Business info updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Failed to update business info. Please try again.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else if (d.error) msg = d.error;
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Business Info"
      description="Company details used across invoices, documents, and contacts"
      icon={<IconBuildingSkyscraper size={24} stroke={1.5} />}
    >
      {isLoading || !data ? (
        <Box>
          <Skeleton variant="rounded" height={48} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={48} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={48} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={48} />
        </Box>
      ) : (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Company name" value={form.name} onChange={handleChange('name')} fullWidth size="small" />
              <TextField label="Industry" value={form.industry} onChange={handleChange('industry')} fullWidth size="small" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Tax ID" value={form.tax_id} onChange={handleChange('tax_id')} fullWidth size="small" />
              <TextField
                label="Website"
                value={form.website}
                onChange={handleChange('website')}
                fullWidth
                size="small"
                placeholder="https://example.com"
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Business phone"
                value={form.business_phone}
                onChange={handleChange('business_phone')}
                fullWidth
                size="small"
              />
              <TextField
                label="Business email"
                type="email"
                value={form.business_email}
                onChange={handleChange('business_email')}
                fullWidth
                size="small"
              />
            </Stack>

            <Divider sx={{ my: 1 }} />

            <TextField label="Address line 1" value={form.address_line1} onChange={handleChange('address_line1')} fullWidth size="small" />
            <TextField label="Address line 2" value={form.address_line2} onChange={handleChange('address_line2')} fullWidth size="small" />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="City" value={form.city} onChange={handleChange('city')} fullWidth size="small" />
              <TextField label="State" value={form.state} onChange={handleChange('state')} fullWidth size="small" />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Postal code" value={form.postal_code} onChange={handleChange('postal_code')} fullWidth size="small" />
              <TextField label="Country" value={form.country} onChange={handleChange('country')} fullWidth size="small" />
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button variant="outlined" onClick={handleReset} disabled={!isDirty || saving}>
              Reset
            </Button>
            <Button
              variant="contained"
              onClick={handleSave}
              disabled={!isDirty || saving}
              startIcon={saving ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
            >
              {saving ? 'Saving...' : 'Save changes'}
            </Button>
          </Stack>
        </Box>
      )}
    </SettingsSectionCard>
  );
}
