import React, { useEffect, useMemo, useState } from 'react';
import { Box, Button, Stack, TextField, Typography, Avatar, Chip } from '@mui/material';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import UploadIcon from '@mui/icons-material/Upload';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import UndoIcon from '@mui/icons-material/Undo';
import LockResetIcon from '@mui/icons-material/LockReset';
import { useDispatch, useSelector } from 'store';
import { MyProfile, UpdateProfilePayload } from 'api/profile';
import { updateProfileAsync } from 'store/profileSlice';
import ChangePasswordDialog from './ChangePasswordDialog';

type Props = {
  profile: MyProfile;
  onSaved?: (p: MyProfile) => void;
  editMode?: boolean;
  onCancel?: () => void;
};

export default function ProfileForm({ profile, onSaved, editMode = true, onCancel }: Props) {
  const dispatch = useDispatch();
  const isSaving = useSelector((s) => s.profile.isLoading);
  const currentRole = useSelector((s) => s.auth.currentRole);

  // Get role display name from auth state (prefer role_display, fallback to role_type)
  const roleDisplay = currentRole?.role_display || currentRole?.role_type || profile.role || '';

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
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

  // Sync form when profile updates (e.g., after avatar upload)
  useEffect(() => {
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

  const handleChange = (key: keyof UpdateProfilePayload, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { email, ...formWithoutEmail } = form;
      const payload: UpdateProfilePayload = { ...formWithoutEmail } as UpdateProfilePayload;
      if (removeAvatar) {
        (payload as any).avatar = null;
      } else if (stagedAvatar !== undefined) {
        (payload as any).avatar = stagedAvatar;
      }
      const result = await dispatch(updateProfileAsync(payload)).unwrap();
      if (removeAvatar) setRemoveAvatar(false);
      setStagedAvatar(undefined);
      onSaved?.(result);
    } catch {
      // swallow to avoid uncaught, UI error is managed in slice state
    }
  };

  const baseline = useMemo<UpdateProfilePayload>(() => {
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

  // Reset form when cancel is triggered
  useEffect(() => {
    const handleCancel = () => {
      setForm(baseline);
      setRemoveAvatar(false);
      setStagedAvatar(undefined);
    };
    window.addEventListener('cancel-edit', handleCancel);
    return () => window.removeEventListener('cancel-edit', handleCancel);
  }, [baseline]);

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
    } catch {}
  };

  const canSubmitLive = useMemo(() => {
    return (
      (form.first_name === undefined || String(form.first_name).trim() !== '') &&
      (form.last_name === undefined || String(form.last_name).trim() !== '')
    );
  }, [form.first_name, form.last_name]);

  const isDirty = useMemo(() => {
    const namesChanged = (form.first_name || '') !== (baseline.first_name || '') || (form.last_name || '') !== (baseline.last_name || '');
    const phoneChanged = ((form.phone as any) || '') !== ((baseline.phone as any) || '');
    const prefsChanged = JSON.stringify(form.preferences || {}) !== JSON.stringify(baseline.preferences || {});
    const avatarAddedOrChanged = stagedAvatar !== undefined && stagedAvatar !== (profile.avatar || undefined);
    return namesChanged || phoneChanged || prefsChanged || removeAvatar || avatarAddedOrChanged;
  }, [form, baseline, removeAvatar, stagedAvatar, profile.avatar]);

  const handleReset = () => {
    setForm(baseline);
    setRemoveAvatar(false);
    setStagedAvatar(undefined);
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

  return (
    <Box component="form" onSubmit={handleSubmit} noValidate>
      <Stack spacing={3}>
        {/* Avatar and User Info */}
        <Stack direction="row" spacing={2} alignItems="center">
          <Avatar
            src={!removeAvatar ? (stagedAvatar !== undefined ? stagedAvatar : profile.avatar || undefined) : undefined}
            sx={{ width: (t) => t.spacing(10), height: (t) => t.spacing(10) }}
          />
          <Stack spacing={0.5} sx={{ flex: 1 }}>
            <Typography variant="h6">
              {profile.first_name || ''} {profile.last_name || ''}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {profile.email}
            </Typography>
            {!!profile.role && <Chip size="small" label={profile.role} sx={{ alignSelf: 'flex-start', mt: 0.5 }} color="warning" />}
            {editMode && (
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
            )}
          </Stack>
        </Stack>

        {/* Personal Information Fields */}
        <Stack spacing={2}>
          {editMode ? (
            <>
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
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Email', profile.email || '')}</Box>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Role', roleDisplay)}</Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Phone"
                  fullWidth
                  value={(form.phone as any) || ''}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </Stack>
            </>
          ) : (
            <>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('First name', profile.first_name || '')}</Box>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Last name', profile.last_name || '')}</Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Email', profile.email || '')}</Box>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Role', roleDisplay)}</Box>
              </Stack>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Box sx={{ flex: 1 }}>{renderReadOnlyField('Phone', (profile.phone as any) || '')}</Box>
              </Stack>
            </>
          )}
        </Stack>

        {/* Security */}
        {editMode && (
          <Box>
            <Button variant="outlined" onClick={() => setPasswordDialogOpen(true)} startIcon={<LockResetIcon />}>
              Change Password
            </Button>
          </Box>
        )}

        {/* Action Buttons */}
        {editMode && (
          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="text" color="inherit" onClick={handleReset} disabled={!isDirty || isSaving} startIcon={<RestartAltIcon />}>
              Reset
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSaving || !canSubmitLive || !isDirty}
              startIcon={<SaveOutlinedIcon />}
              sx={{ color: 'white' }}
            >
              Save changes
            </Button>
          </Stack>
        )}
      </Stack>
      <ChangePasswordDialog open={passwordDialogOpen} onClose={() => setPasswordDialogOpen(false)} />
    </Box>
  );
}
