import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Typography from '@mui/material/Typography';

import { IconBell } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { getUserPreferences, updateUserPreferences } from 'api/settings';
import { UserPreferences } from 'types/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

type ToggleKey = 'email_notifications' | 'sms_notifications' | 'marketing_opt_in';

const TOGGLES: Array<{ key: ToggleKey; label: string; description: string }> = [
  {
    key: 'email_notifications',
    label: 'Email notifications',
    description: 'Receive account and activity updates by email.'
  },
  {
    key: 'sms_notifications',
    label: 'SMS notifications',
    description: 'Get time-sensitive alerts sent to your phone.'
  },
  {
    key: 'marketing_opt_in',
    label: 'Marketing updates',
    description: 'Product news, tips, and occasional promotions.'
  }
];

export default function Notifications() {
  const { data, isLoading, mutate } = useSWR<UserPreferences>('user-preferences', getUserPreferences);
  const [pendingKey, setPendingKey] = useState<ToggleKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (key: ToggleKey) => {
    if (!data) return;
    const nextValue = !data[key];
    setPendingKey(key);
    setError(null);
    const optimistic: UserPreferences = { ...data, [key]: nextValue };
    try {
      await mutate(
        async () => {
          const updated = await updateUserPreferences({ [key]: nextValue });
          return updated;
        },
        { optimisticData: optimistic, rollbackOnError: true, revalidate: false }
      );
      dispatch(
        openSnackbar({
          open: true,
          message: 'Preferences updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to update preference. Please try again.';
      setError(msg);
    } finally {
      setPendingKey(null);
    }
  };

  return (
    <SettingsSectionCard
      title="Notifications"
      description="Choose how you'd like to hear from us"
      icon={<IconBell size={24} stroke={1.5} />}
    >
      {isLoading || !data ? (
        <Box>
          <Skeleton variant="rounded" height={40} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={40} sx={{ mb: 1.5 }} />
          <Skeleton variant="rounded" height={40} />
        </Box>
      ) : (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={1.5}>
            {TOGGLES.map(({ key, label, description }) => (
              <Box key={key} sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {label}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {description}
                  </Typography>
                </Box>
                <FormControlLabel
                  sx={{ m: 0 }}
                  control={<Switch checked={!!data[key]} onChange={() => handleToggle(key)} disabled={pendingKey !== null} />}
                  label=""
                />
              </Box>
            ))}
          </Stack>
        </Box>
      )}
    </SettingsSectionCard>
  );
}
