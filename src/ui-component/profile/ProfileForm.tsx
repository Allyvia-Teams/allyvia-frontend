import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  MenuItem,
  Switch,
  FormControlLabel,
  Avatar,
  Divider,
  Paper,
  Chip,
  Select,
  FormControl,
  InputLabel
} from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { MyProfile, UpdateProfilePayload } from 'api/profile';
import { updateProfileAsync, uploadAvatarAsync } from 'store/profileSlice';
import { COLORS } from 'styles/colors';

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
    email: profile.email || '',
    preferences: profile.preferences || {
      theme: 'system',
      notifications_email: true,
      notifications_push: false,
      language: 'en'
    }
  });
  const [removeAvatar, setRemoveAvatar] = useState(false);

  const isReadOnly = useCallback((key: keyof MyProfile) => readOnlyFields.includes(key), [readOnlyFields]);

  const handleChange = (key: keyof UpdateProfilePayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrefChange = () => {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = removeAvatar ? { ...form, avatar: null } : form;
      const result = await dispatch(updateProfileAsync(payload)).unwrap();
      if (removeAvatar) setRemoveAvatar(false);
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
      setRemoveAvatar(false);
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
      <Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, backgroundColor: COLORS.greyF5 }}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={!removeAvatar && profile.avatar ? profile.avatar : undefined}
              sx={{ width: 72, height: 72, border: `2px solid ${COLORS.white}` }}
            />
            <Stack spacing={0.5}>
              <Typography variant="h6">
                {profile.first_name || ''} {profile.last_name || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.email}
              </Typography>
              {!!profile.role && <Chip size="small" label={profile.role} sx={{ alignSelf: 'flex-start', backgroundColor: COLORS.gold }} />}
              {profile.avatar && !removeAvatar ? (
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => setRemoveAvatar(true)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Remove Avatar
                </Button>
              ) : (
                <Button size="small" variant="outlined" component="label" sx={{ alignSelf: 'flex-start' }}>
                  Upload Avatar
                  <input hidden accept="image/*" type="file" onChange={onAvatarChange} />
                </Button>
              )}
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
            Personal information
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="First name"
                fullWidth
                value={form.first_name || ''}
                onChange={(e) => handleChange('first_name', e.target.value)}
              />
              <TextField
                label="Last name"
                fullWidth
                value={form.last_name || ''}
                onChange={(e) => handleChange('last_name', e.target.value)}
              />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField label="Email" fullWidth value={form.email || ''} onChange={(e) => handleChange('email', e.target.value)} />
              <TextField label="Role" fullWidth value={profile.role || ''} disabled={isReadOnly('role')} />
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                label="Phone"
                fullWidth
                value={(form.phone as any) || ''}
                onChange={(e) => handleChange('phone', e.target.value)}
              />
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
            Preferences
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="pref-theme-label">Theme</InputLabel>
                <Select
                  native
                  labelId="pref-theme-label"
                  label="Theme"
                  value={form.preferences?.theme || 'system'}
                  onChange={(e) => handleChange('preferences', { ...form.preferences, theme: e.target.value as any })}
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="pref-language-label">Language</InputLabel>
                <Select
                  native
                  labelId="pref-language-label"
                  label="Language"
                  value={form.preferences?.language || 'en'}
                  onChange={(e) => handleChange('preferences', { ...form.preferences, language: e.target.value as any })}
                >
                  <option value="en">English</option>
                  <option value="fr">Français</option>
                  <option value="ro">Română</option>
                  <option value="zh">中文</option>
                </Select>
              </FormControl>
            </Stack>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.preferences?.notifications_email)}
                    onChange={(e) => handleChange('preferences', { ...form.preferences, notifications_email: e.target.checked })}
                  />
                }
                label="Email notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={Boolean(form.preferences?.notifications_push)}
                    onChange={(e) => handleChange('preferences', { ...form.preferences, notifications_push: e.target.checked })}
                  />
                }
                label="Push notifications"
              />
            </Stack>
          </Stack>
        </Paper>

        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={isSaving || !canSubmitLive}>
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
