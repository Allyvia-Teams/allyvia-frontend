import { useEffect, useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { IconUser } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { getUserProfile, updateUserProfile } from 'api/settings';
import { UpdateUserProfilePayload } from 'types/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

type FormState = {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
};

export default function AccountSettings() {
  const { data, isLoading, mutate } = useSWR('user-profile', getUserProfile);

  const [form, setForm] = useState<FormState>({ first_name: '', last_name: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailChangedNotice, setEmailChangedNotice] = useState(false);
  const [originalEmail, setOriginalEmail] = useState<string>('');

  useEffect(() => {
    if (data) {
      setForm({
        first_name: data.first_name || '',
        last_name: data.last_name || '',
        phone: data.phone || '',
        email: data.email || ''
      });
      setOriginalEmail(data.email || '');
    }
  }, [data]);

  const handleChange = (field: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const isDirty = !!data && (
    form.first_name !== (data.first_name || '') ||
    form.last_name !== (data.last_name || '') ||
    form.phone !== (data.phone || '') ||
    form.email !== (data.email || '')
  );

  const handleReset = () => {
    if (!data) return;
    setForm({
      first_name: data.first_name || '',
      last_name: data.last_name || '',
      phone: data.phone || '',
      email: data.email || ''
    });
    setError(null);
    setEmailChangedNotice(false);
  };

  const handleSave = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    setEmailChangedNotice(false);

    const payload: UpdateUserProfilePayload = {};
    if (form.first_name !== (data.first_name || '')) payload.first_name = form.first_name.trim();
    if (form.last_name !== (data.last_name || '')) payload.last_name = form.last_name.trim();
    if (form.phone !== (data.phone || '')) payload.phone = form.phone.trim();
    if (form.email !== (data.email || '')) payload.email = form.email.trim();

    const emailChanging = payload.email !== undefined && payload.email !== originalEmail;

    try {
      await updateUserProfile(payload);
      await mutate();
      if (emailChanging) {
        setEmailChangedNotice(true);
      }
      dispatch(
        openSnackbar({
          open: true,
          message: emailChanging ? 'Profile updated. A verification email has been sent to your new address.' : 'Profile updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const data = e?.response?.data;
      let msg = 'Failed to update profile. Please try again.';
      if (data) {
        if (typeof data === 'string') {
          msg = data;
        } else if (data.detail) {
          msg = data.detail;
        } else if (data.email) {
          msg = Array.isArray(data.email) ? data.email.join(' ') : data.email;
        } else if (data.error) {
          msg = data.error;
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard
      title="Account Settings"
      description="Manage your name, contact info, and email"
      icon={<IconUser size={24} stroke={1.5} />}
    >
      {isLoading || !data ? (
        <Box>
          <Skeleton variant="text" width={180} height={40} />
          <Skeleton variant="rounded" height={48} sx={{ mt: 1.5 }} />
          <Skeleton variant="rounded" height={48} sx={{ mt: 1.5 }} />
          <Skeleton variant="rounded" height={48} sx={{ mt: 1.5 }} />
          <Skeleton variant="rounded" height={48} sx={{ mt: 1.5 }} />
        </Box>
      ) : (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {emailChangedNotice && (
            <Alert severity="info" sx={{ mb: 2 }}>
              A verification email has been sent to your new address. Please check your inbox.
            </Alert>
          )}

          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                value={form.first_name}
                onChange={handleChange('first_name')}
                fullWidth
                size="small"
              />
              <TextField
                label="Last name"
                value={form.last_name}
                onChange={handleChange('last_name')}
                fullWidth
                size="small"
              />
            </Stack>
            <TextField
              label="Phone"
              value={form.phone}
              onChange={handleChange('phone')}
              fullWidth
              size="small"
              placeholder="+15551234567"
            />
            <TextField
              label="Email"
              type="email"
              value={form.email}
              onChange={handleChange('email')}
              fullWidth
              size="small"
              helperText={
                form.email !== originalEmail
                  ? 'Changing email will require verification at the new address.'
                  : undefined
              }
            />
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1.5} justifyContent="flex-end">
            <Button
              variant="outlined"
              onClick={handleReset}
              disabled={!isDirty || saving}
            >
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
