import * as React from 'react';
import { useSnackbar } from 'notistack';
import useSWR from 'swr';

import { Alert, Box, Button, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';

import { getCompanyBusinessInfo, updateOneOffSettings } from 'api/settings';
import {
  ONE_OFF_BLURB,
  ONE_OFF_MAX_UNITS,
  ONE_OFF_MIN_UNITS,
  ONE_OFF_TITLE,
  oneOffError,
  oneOffForm,
  oneOffPayload,
  unitsWords,
  type OneOffForm
} from './oneOffSettings';
import { serverMessage } from './storeRulesView';

/**
 * The built-in rule above the owner's own rules on Settings > Store rules (owner trust T9): a switch and "N units
 * or fewer". Off writes 0. Hidden when the company payload does not carry the setting (an older backend), so the
 * screen never shows a switch nobody can save. Every sentence and the payload come from `oneOffSettings.ts`.
 */
const OneOffRule: React.FC<{ companyId: string }> = ({ companyId }) => {
  const { enqueueSnackbar } = useSnackbar();
  const {
    data,
    error: loadError,
    mutate
  } = useSWR(companyId ? `company-${companyId}` : null, () => getCompanyBusinessInfo(companyId), {
    revalidateOnFocus: false
  });
  const stored = data?.one_off_max_units;
  const [form, setForm] = React.useState<OneOffForm>(oneOffForm(stored));
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Follows the stored value when it loads or is saved; a draft in progress is replaced only then.
  React.useEffect(() => {
    setForm(oneOffForm(stored));
  }, [stored]);

  if (loadError || !data || typeof stored !== 'number') return null;

  const error = oneOffError(form);
  const payload = oneOffPayload(form, stored);

  const save = async () => {
    if (!payload) return;
    setSaving(true);
    setSaveError(null);
    try {
      const updated = await updateOneOffSettings(companyId, payload);
      await mutate(updated, { revalidate: false });
      enqueueSnackbar(payload.one_off_max_units === 0 ? 'One-offs switched off.' : 'One-off rule saved.', { variant: 'success' });
    } catch (err: unknown) {
      const body = (err as { response?: { data?: unknown } })?.response?.data;
      setSaveError(serverMessage(body, 'Could not save that.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box data-testid="one-off-rule" sx={{ pb: 2, mb: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', sm: 'center' }} sx={{ rowGap: 1 }}>
        <FormControlLabel
          sx={{ flex: 1, mr: 0, alignItems: 'flex-start' }}
          control={<Switch size="small" checked={form.on} onChange={(e) => setForm({ ...form, on: e.target.checked })} />}
          label={
            <Typography variant="body2" fontWeight={600}>
              {ONE_OFF_TITLE}
            </Typography>
          }
        />
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            type="number"
            value={form.units}
            disabled={!form.on}
            error={!!error}
            onChange={(e) => setForm({ ...form, units: e.target.value })}
            slotProps={{ htmlInput: { min: ONE_OFF_MIN_UNITS, max: ONE_OFF_MAX_UNITS, step: 1, 'aria-label': 'Units' } }}
            sx={{ width: 84 }}
          />
          <Typography variant="body2" color={form.on ? 'textPrimary' : 'textSecondary'} sx={{ whiteSpace: 'nowrap' }}>
            {unitsWords(form.units)}
          </Typography>
          <Button size="small" variant="contained" onClick={save} disabled={!payload || saving}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </Stack>
      </Stack>
      <Typography variant="caption" color={error ? 'error' : 'textSecondary'} sx={{ display: 'block', mt: 0.75 }}>
        {error ?? ONE_OFF_BLURB}
      </Typography>
      {saveError && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {saveError}
        </Alert>
      )}
    </Box>
  );
};

export default OneOffRule;
