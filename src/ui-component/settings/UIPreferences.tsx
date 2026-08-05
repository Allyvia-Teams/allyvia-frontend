import { useEffect, useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

import { IconPalette } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { getUserPreferences, updateUserPreferences } from 'api/settings';
import { ThemePreference, UserPreferences } from 'types/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';
import useConfig from 'hooks/useConfig';
import { ThemeMode } from 'config';

const prefersDark = () => typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

export default function UIPreferences() {
  const { data, isLoading, mutate } = useSWR<UserPreferences>('user-preferences', getUserPreferences);
  const { mode, onChangeMode } = useConfig();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedMode = (preference: ThemePreference): ThemeMode => {
    if (preference === 'dark') return ThemeMode.DARK;
    if (preference === 'light') return ThemeMode.LIGHT;
    return prefersDark() ? ThemeMode.DARK : ThemeMode.LIGHT;
  };

  // On mount / when saved preference loads, sync live theme to match backend.
  useEffect(() => {
    if (!data) return;
    const desired = resolvedMode(data.theme);
    if (desired !== mode) {
      onChangeMode(desired);
    }
  }, [data?.theme]);

  const handleChange = async (_: React.MouseEvent<HTMLElement>, value: ThemePreference | null) => {
    if (!data || !value || value === data.theme) return;
    setSaving(true);
    setError(null);
    // Apply live theme immediately for snappy UX.
    onChangeMode(resolvedMode(value));
    try {
      await mutate(
        async () => {
          const updated = await updateUserPreferences({ theme: value });
          return updated;
        },
        { optimisticData: { ...data, theme: value }, rollbackOnError: true, revalidate: false }
      );
      dispatch(
        openSnackbar({
          open: true,
          message: 'Theme updated.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to update theme. Please try again.';
      setError(msg);
      // Rollback live theme to the previously saved preference.
      onChangeMode(resolvedMode(data.theme));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SettingsSectionCard title="Appearance" description="Customize how Allyvia looks for you" icon={<IconPalette size={24} stroke={1.5} />}>
      {isLoading || !data ? (
        <Box>
          <Skeleton variant="text" width={120} />
          <Skeleton variant="rounded" height={40} width={260} sx={{ mt: 1 }} />
        </Box>
      ) : (
        <Box>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Stack spacing={1}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
              Theme
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a light or dark mode, or follow your system setting.
            </Typography>
            <ToggleButtonGroup value={data.theme} exclusive onChange={handleChange} size="small" disabled={saving} sx={{ mt: 0.5 }}>
              <ToggleButton value="light">Light</ToggleButton>
              <ToggleButton value="dark">Dark</ToggleButton>
              <ToggleButton value="system">System</ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>
      )}
    </SettingsSectionCard>
  );
}
