import React, { useCallback, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Switch,
  FormControlLabel,
  Avatar,
  Paper,
  Chip,
  Select,
  FormControl,
  InputLabel,
  MenuItem
} from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UndoIcon from '@mui/icons-material/Undo';
import { useDispatch, useSelector } from 'store';
import { MyProfile, UpdateProfilePayload } from 'api/profile';
import { updateProfileAsync } from 'store/profileSlice';

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
  const [stagedAvatar, setStagedAvatar] = useState<string | undefined>(undefined);

  // Sync form when profile updates (e.g., after avatar upload)
  React.useEffect(() => {
    setForm({
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
    setRemoveAvatar(false);
    setStagedAvatar(undefined);
  }, [profile]);

  const isReadOnly = useCallback((key: keyof MyProfile) => readOnlyFields.includes(key), [readOnlyFields]);

  const handleChange = (key: keyof UpdateProfilePayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handlePrefChange = () => {};

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: UpdateProfilePayload = { ...form } as UpdateProfilePayload;
      if (removeAvatar) {
        (payload as any).avatar = null;
      } else if (stagedAvatar !== undefined) {
        (payload as any).avatar = stagedAvatar;
      }
      const result = await dispatch(updateProfileAsync(payload)).unwrap();
      if (removeAvatar) setRemoveAvatar(false);
      setStagedAvatar(undefined);
      onSaved?.(result);
    } catch (err: any) {
      // swallow to avoid uncaught, UI error is managed in slice state
    }
  };

  const onAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fileToDataURL = (f: File) =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = reject;
        reader.readAsDataURL(f);
      });
    try {
      const dataUrl = await fileToDataURL(file);
      setStagedAvatar(dataUrl);
      setRemoveAvatar(false);
    } catch (err) {}
  };

  const canSubmitLive = React.useMemo(() => {
    return (
      (form.first_name === undefined || String(form.first_name).trim() !== '') &&
      (form.last_name === undefined || String(form.last_name).trim() !== '')
    );
  }, [form.first_name, form.last_name]);

  const baseline = React.useMemo<UpdateProfilePayload>(() => {
    return {
      first_name: profile.first_name || '',
      last_name: profile.last_name || '',
      phone: profile.phone || ('' as any),
      email: profile.email || '',
      preferences: profile.preferences || {
        theme: 'system',
        notifications_email: true,
        notifications_push: false,
        language: 'en'
      },
      avatar: profile.avatar
    };
  }, [profile]);

  const isDirty = React.useMemo(() => {
    const namesChanged = (form.first_name || '') !== (baseline.first_name || '') || (form.last_name || '') !== (baseline.last_name || '');
    const emailChanged = (form.email || '') !== (baseline.email || '');
    const phoneChanged = ((form.phone as any) || '') !== ((baseline.phone as any) || '');
    const prefsChanged = JSON.stringify(form.preferences || {}) !== JSON.stringify(baseline.preferences || {});
    const avatarAddedOrChanged = stagedAvatar !== undefined && stagedAvatar !== (profile.avatar || undefined);
    return namesChanged || emailChanged || phoneChanged || prefsChanged || removeAvatar || avatarAddedOrChanged;
  }, [form, baseline, removeAvatar, stagedAvatar, profile.avatar]);

  const handleReset = () => {
    setForm(baseline);
    setRemoveAvatar(false);
    setStagedAvatar(undefined);
  };

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        <Paper
          variant="outlined"
          sx={{
            p: { xs: 2, sm: 3 },
            borderRadius: 2,
            bgcolor: (t) => (t.palette.mode === 'dark' ? t.palette.background.paper : t.palette.background.default)
          }}
        >
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar
              src={!removeAvatar ? (stagedAvatar !== undefined ? stagedAvatar : profile.avatar || undefined) : undefined}
              sx={{ width: (t) => t.spacing(10), height: (t) => t.spacing(10), border: (t) => `2px solid ${t.palette.background.paper}` }}
            />
            <Stack spacing={0.5}>
              <Typography variant="h6">
                {profile.first_name || ''} {profile.last_name || ''}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {profile.email}
              </Typography>
              {!!profile.role && <Chip size="small" label={profile.role} sx={{ alignSelf: 'flex-start' }} color="warning" />}
              <Stack direction="row" spacing={1} sx={{ pt: 0.5 }}>
                {(profile.avatar || stagedAvatar) && !removeAvatar ? (
                  <Button
                    size="small"
                    variant="outlined"
                    color="error"
                    onClick={() => setRemoveAvatar(true)}
                    startIcon={<DeleteOutlineIcon />}
                  >
                    Remove
                  </Button>
                ) : (
                  <Button size="small" variant="outlined" component="label" startIcon={<UploadIcon />}>
                    Upload
                    <input hidden accept="image/*" type="file" onChange={onAvatarChange} />
                  </Button>
                )}
                {(removeAvatar || stagedAvatar !== undefined) && (
                  <Button
                    size="small"
                    variant="text"
                    color="inherit"
                    onClick={() => {
                      setRemoveAvatar(false);
                      setStagedAvatar(undefined);
                    }}
                    startIcon={<UndoIcon />}
                  >
                    Undo
                  </Button>
                )}
              </Stack>
            </Stack>
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
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

        <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, borderRadius: 2 }}>
          <Typography variant="subtitle1" sx={{ mb: 2, color: 'text.secondary' }}>
            Preferences
          </Typography>
          <Stack spacing={2}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="pref-theme-label">Theme</InputLabel>
                <Select
                  labelId="pref-theme-label"
                  label="Theme"
                  value={form.preferences?.theme || 'system'}
                  onChange={(e) => handleChange('preferences', { ...form.preferences, theme: e.target.value as any })}
                >
                  <MenuItem value="light">Light</MenuItem>
                  <MenuItem value="dark">Dark</MenuItem>
                  <MenuItem value="system">System</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth>
                <InputLabel id="pref-language-label">Language</InputLabel>
                <Select
                  labelId="pref-language-label"
                  label="Language"
                  value={form.preferences?.language || 'en'}
                  onChange={(e) => handleChange('preferences', { ...form.preferences, language: e.target.value as any })}
                >
                  <MenuItem value="en">English</MenuItem>
                  <MenuItem value="fr">Français</MenuItem>
                  <MenuItem value="ro">Română</MenuItem>
                  <MenuItem value="zh">中文</MenuItem>
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
          <Button variant="text" color="inherit" onClick={handleReset} disabled={!isDirty || isSaving} startIcon={<RestartAltIcon />}>
            Reset
          </Button>
          <Button type="submit" variant="contained" disabled={isSaving || !canSubmitLive || !isDirty} startIcon={<SaveOutlinedIcon />}>
            Save changes
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
}
