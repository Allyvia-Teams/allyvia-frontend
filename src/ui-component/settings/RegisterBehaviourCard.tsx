import { useEffect, useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';

import { IconAdjustments } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import {
  REGISTER_SETTINGS_BOUNDS,
  registerSettingsDirty,
  registerSettingsForm,
  registerSettingsPayload,
  validateRegisterSettings,
  type RegisterSettingsForm
} from './registers';
import { getCompanyBusinessInfo, updateRegisterSettings } from 'api/settings';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface RegisterBehaviourCardProps {
  companyId: string;
}

const EMPTY: RegisterSettingsForm = {
  register_idle_timeout_seconds: '',
  register_low_stock_threshold: '',
  register_discount_limit_pct: ''
};

/**
 * How the registers behave: relock delay, the low-stock badge, and what a
 * keyholder may discount.
 *
 * Shares GET/PUT /company/{id}/ with BusinessInfo but keeps its own form and
 * its own payload — see registers.ts::registerSettingsPayload for why reusing
 * that component's differ would send integers as strings.
 */
export default function RegisterBehaviourCard({ companyId }: RegisterBehaviourCardProps) {
  const {
    data,
    isLoading,
    error: loadError,
    mutate
  } = useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId), {
    // This card is a form, and the effect below adopts whatever `data`
    // becomes. With focus revalidation on, alt-tabbing away and back after
    // anything else wrote to the company row (the onboarding profile step, a
    // QuickBooks connect -- updated_at moves on any of them) silently reverts
    // whatever the owner had typed and not yet saved.
    revalidateOnFocus: false
  });

  const [form, setForm] = useState<RegisterSettingsForm>(EMPTY);
  const [original, setOriginal] = useState<RegisterSettingsForm>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (data) {
      const next = registerSettingsForm(data);
      setForm(next);
      setOriginal(next);
    }
  }, [data]);

  const errors = validateRegisterSettings(form);
  const payload = registerSettingsPayload(form, original);
  // Dirty is asked of the FORM, not of the payload -- registerSettingsPayload
  // is deliberately empty while anything is invalid, and deriving dirty from it
  // greys out Reset exactly when it is needed: clear the idle timeout with
  // backspace and both buttons die with the original value nowhere on screen.
  const dirty = registerSettingsDirty(form, original);
  const canSave = dirty && Object.keys(errors).length === 0 && Object.keys(payload).length > 0 && !saving;

  const handleChange = (field: keyof RegisterSettingsForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await updateRegisterSettings(companyId, payload);
      const next = registerSettingsForm(updated);
      setForm(next);
      setOriginal(next);
      await mutate(updated, { revalidate: false });
      dispatch(
        openSnackbar({
          open: true,
          message: 'Register settings saved.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch (e: any) {
      const d = e?.response?.data;
      let msg = 'Could not save the register settings.';
      if (d) {
        if (typeof d === 'string') msg = d;
        else if (d.detail) msg = d.detail;
        else {
          // The serializer answers {field: ["..."]}; show the sentence rather
          // than a generic failure, since each one names its own range.
          const first = Object.values(d).find((v) => Array.isArray(v) && v.length);
          if (Array.isArray(first)) msg = String(first[0]);
          else if (d.error) msg = d.error;
        }
      }
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setForm(original);
    setError(null);
  };

  return (
    <SettingsSectionCard
      title="Register behaviour"
      description="How the tills lock, warn about stock, and discount"
      icon={<IconAdjustments size={24} stroke={1.5} />}
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!companyId ? (
          <Alert severity="info">Pick a company to change these settings.</Alert>
        ) : loadError ? (
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => mutate()}>
                Retry
              </Button>
            }
          >
            Could not load these settings.
          </Alert>
        ) : isLoading || !data ? (
          <Box>
            <Skeleton variant="rounded" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={56} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Idle timeout (seconds)"
                  value={form.register_idle_timeout_seconds}
                  onChange={handleChange('register_idle_timeout_seconds')}
                  error={!!errors.register_idle_timeout_seconds}
                  helperText={
                    errors.register_idle_timeout_seconds ||
                    `How long before a till relocks to the PIN screen. ${REGISTER_SETTINGS_BOUNDS.register_idle_timeout_seconds.min}–${REGISTER_SETTINGS_BOUNDS.register_idle_timeout_seconds.max}.`
                  }
                  slotProps={{
                    htmlInput: {
                      min: REGISTER_SETTINGS_BOUNDS.register_idle_timeout_seconds.min,
                      max: REGISTER_SETTINGS_BOUNDS.register_idle_timeout_seconds.max,
                      step: 5
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Low-stock threshold"
                  value={form.register_low_stock_threshold}
                  onChange={handleChange('register_low_stock_threshold')}
                  error={!!errors.register_low_stock_threshold}
                  helperText={
                    errors.register_low_stock_threshold || 'On-hand at or below this shows an amber badge. 0 turns the badge off.'
                  }
                  slotProps={{
                    htmlInput: {
                      min: REGISTER_SETTINGS_BOUNDS.register_low_stock_threshold.min,
                      max: REGISTER_SETTINGS_BOUNDS.register_low_stock_threshold.max,
                      step: 1
                    }
                  }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Keyholder discount limit (%)"
                  value={form.register_discount_limit_pct}
                  onChange={handleChange('register_discount_limit_pct')}
                  error={!!errors.register_discount_limit_pct}
                  helperText={
                    errors.register_discount_limit_pct ||
                    'The most a keyholder may take off a sale. Managers have no limit; associates need a code.'
                  }
                  slotProps={{
                    htmlInput: {
                      min: REGISTER_SETTINGS_BOUNDS.register_discount_limit_pct.min,
                      max: REGISTER_SETTINGS_BOUNDS.register_discount_limit_pct.max,
                      step: 1
                    }
                  }}
                />
              </Grid>
            </Grid>

            <Stack direction="row" spacing={1} justifyContent="flex-end" sx={{ mt: 2 }}>
              <Button onClick={handleReset} disabled={!dirty || saving}>
                Reset
              </Button>
              <Button variant="contained" onClick={handleSave} disabled={!canSave}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </Stack>
          </>
        )}
      </Box>
    </SettingsSectionCard>
  );
}
