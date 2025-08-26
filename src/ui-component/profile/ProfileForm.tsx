import React, { useCallback, useMemo, useState } from 'react';
import { Box, Button, Grid, Stack, TextField, Typography, MenuItem, Switch, FormControlLabel, Avatar } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { MyProfile, UpdateProfilePayload } from 'api/profile';
import { updateProfileAsync, uploadAvatarAsync } from 'store/profileSlice';

type Props = {
  profile: MyProfile;
  readOnlyFields?: (keyof MyProfile)[];
  onSaved?: (p: MyProfile) => void;
};

export default function ProfileForm({ profile, readOnlyFields = ['role'], onSaved }: Props) {
  const dispatch = useDispatch();
  const isSaving = useSelector((s) => s.profile.isLoading);

  const [form, setForm] = useState<UpdateProfilePayload>({
    first_name: profile.first_name || '',
    last_name: profile.last_name || '',
    phone: profile.phone || ('' as any),
    email: profile.email || ''
  });

  const isReadOnly = useCallback((key: keyof MyProfile) => readOnlyFields.includes(key), [readOnlyFields]);

  const handleChange = (key: keyof UpdateProfilePayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrefChange = () => {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const result = await dispatch(updateProfileAsync(form)).unwrap();
      onSaved?.(result);
    } catch (err: any) {
      // swallow to avoid uncaught, UI error is managed in slice state
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const updated = await dispatch(uploadAvatarAsync(file)).unwrap();
      onSaved?.(updated);
    } catch (err) {}
  };

  const canSubmitLive = React.useMemo(() => {
    return (
      (form.first_name === undefined || String(form.first_name).trim() !== '') &&
      (form.last_name === undefined || String(form.last_name).trim() !== '')
    );
  }, [form.first_name, form.last_name]);

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={2}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar src={profile.avatar || undefined} sx={{ width: 64, height: 64 }} />
          <Button variant="outlined" component="label">
            Upload Avatar
            <input hidden accept="image/*" type="file" onChange={onAvatarChange} />
          </Button>
        </Stack>

        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <TextField
              label="First name"
              fullWidth
              value={form.first_name || ''}
              onChange={(e) => handleChange('first_name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Last name"
              fullWidth
              value={form.last_name || ''}
              onChange={(e) => handleChange('last_name', e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Email" fullWidth value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Role" fullWidth value={profile.role || ''} disabled={isReadOnly('role')} />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField label="Phone" fullWidth value={(form.phone as any) || ''} onChange={(e) => handleChange('phone', e.target.value)} />
          </Grid>
        </Grid>

        <Stack direction="row" spacing={2}>
          <Button type="submit" variant="contained" disabled={isSaving || !canSubmitLive}>
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
