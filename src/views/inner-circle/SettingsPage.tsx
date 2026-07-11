import { useEffect, useState, type ReactNode, type SyntheticEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import {
  Box,
  Button,
  CircularProgress,
  Divider,
  Grid,
  InputAdornment,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Tabs,
  TextField,
  Typography
} from '@mui/material';

import MainCard from 'ui-component/cards/MainCard';
import { gridSpacing } from 'store/constant';
import {
  fetchInnerCircleSettings,
  updateInnerCircleSettings,
  type InnerCircleSettings,
  type InnerCircleSettingsUpdate
} from 'api/innerCircle.api';

const SETTINGS_QUERY_KEY = ['inner-circle-settings'];

const COMMON_TIMEZONES = [
  'America/Los_Angeles',
  'America/Denver',
  'America/Chicago',
  'America/New_York',
  'America/Phoenix',
  'America/Anchorage',
  'Pacific/Honolulu',
  'UTC',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Singapore',
  'Asia/Tokyo',
  'Australia/Sydney'
];

const HEX_COLOR_RE = /^#[0-9A-Fa-f]{6}$/;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface TabPanelProps {
  children?: ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  if (value !== index) return null;
  return (
    <Box role="tabpanel" sx={{ pt: 3 }}>
      {children}
    </Box>
  );
}

function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="h4">{title}</Typography>
      {description && (
        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
          {description}
        </Typography>
      )}
    </Box>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  children
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  children?: ReactNode;
}) {
  return (
    <Box
      sx={{
        p: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider'
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle1" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mt: 0.25 }}>
            {description}
          </Typography>
        </Box>
        <Switch checked={checked} onChange={(e) => onChange(e.target.checked)} />
      </Stack>
      {children && <Box sx={{ mt: 2 }}>{children}</Box>}
    </Box>
  );
}

function SaveBar({ onSave, saving, disabled }: { onSave: () => void; saving: boolean; disabled?: boolean }) {
  return (
    <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
      <Button variant="contained" onClick={onSave} disabled={saving || disabled}>
        {saving ? 'Saving…' : 'Save changes'}
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);

  const { data: settings, isLoading, isError } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchInnerCircleSettings
  });

  // Local editable copy — hydrated from the fetched settings.
  const [form, setForm] = useState<InnerCircleSettings | null>(null);

  useEffect(() => {
    if (settings) setForm(settings);
  }, [settings]);

  const mutation = useMutation({
    mutationFn: (data: InnerCircleSettingsUpdate) => updateInnerCircleSettings(data),
    onSuccess: (updated) => {
      queryClient.setQueryData(SETTINGS_QUERY_KEY, updated);
      setForm(updated);
      enqueueSnackbar('Settings saved', { variant: 'success' });
    },
    onError: () => {
      enqueueSnackbar('Could not save settings. Please try again.', { variant: 'error' });
    }
  });

  const setField = <K extends keyof InnerCircleSettings>(key: K, value: InnerCircleSettings[K]) => {
    setForm((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const saveFields = (keys: (keyof InnerCircleSettings)[]) => {
    if (!form) return;
    const payload: InnerCircleSettingsUpdate = {};
    keys.forEach((key) => {
      (payload as Record<string, unknown>)[key] = form[key];
    });
    mutation.mutate(payload);
  };

  if (isLoading || !form) {
    return (
      <MainCard title="Inner Circle Settings">
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress />
        </Box>
      </MainCard>
    );
  }

  if (isError) {
    return (
      <MainCard title="Inner Circle Settings">
        <Typography color="error" sx={{ py: 4, textAlign: 'center' }}>
          Failed to load settings. Please refresh the page.
        </Typography>
      </MainCard>
    );
  }

  const brandColorValid = !form.brand_color || HEX_COLOR_RE.test(form.brand_color);
  const saving = mutation.isPending;

  return (
    <MainCard title="Inner Circle Settings" content={false}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', px: gridSpacing }}>
        <Tabs
          value={activeTab}
          onChange={(_e: SyntheticEvent, v: number) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Branding" />
          <Tab label="Automations" />
          <Tab label="Surveys" />
          <Tab label="Notifications" />
        </Tabs>
      </Box>

      <Box sx={{ p: gridSpacing }}>
        {/* ---- Tab 1: Branding ---- */}
        <TabPanel value={activeTab} index={0}>
          <SectionHeading title="Branding" description="Customize how your store appears in Inner Circle emails and pages." />
          <Grid container spacing={gridSpacing} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={8}>
              <TextField
                fullWidth
                label="Logo URL"
                placeholder="https://example.com/logo.png"
                value={form.logo_url ?? ''}
                onChange={(e) => setField('logo_url', e.target.value || null)}
                helperText="Direct link to your logo image (PNG or SVG recommended)."
              />
            </Grid>
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Brand color"
                placeholder="#69a1ea"
                value={form.brand_color ?? ''}
                onChange={(e) => setField('brand_color', e.target.value || null)}
                error={!brandColorValid}
                helperText={brandColorValid ? 'Hex format, e.g. #69a1ea' : 'Must be #RRGGBB'}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Box
                        sx={{
                          width: 22,
                          height: 22,
                          borderRadius: '50%',
                          border: '1px solid',
                          borderColor: 'divider',
                          bgcolor: brandColorValid && form.brand_color ? form.brand_color : 'transparent'
                        }}
                      />
                    </InputAdornment>
                  )
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                select
                fullWidth
                label="Timezone"
                value={form.timezone}
                onChange={(e) => setField('timezone', e.target.value)}
              >
                {COMMON_TIMEZONES.map((tz) => (
                  <MenuItem key={tz} value={tz}>
                    {tz}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>
          <SaveBar onSave={() => saveFields(['logo_url', 'brand_color', 'timezone'])} saving={saving} disabled={!brandColorValid} />
        </TabPanel>

        {/* ---- Tab 2: Automations ---- */}
        <TabPanel value={activeTab} index={1}>
          <SectionHeading title="Automations" description="Control which Inner Circle emails send automatically." />
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ToggleRow
              label="Welcome email"
              description="Sent to first-time shoppers when they join your Inner Circle."
              checked={form.automation_welcome_enabled}
              onChange={(v) => setField('automation_welcome_enabled', v)}
            />
            <ToggleRow
              label="Vault upgrade"
              description="Congratulates a shopper when they reach Vault tier."
              checked={form.automation_vault_upgrade_enabled}
              onChange={(v) => setField('automation_vault_upgrade_enabled', v)}
            />
            <ToggleRow
              label="Birthday perk"
              description="Sends a birthday treat ahead of a shopper's birthday."
              checked={form.automation_birthday_enabled}
              onChange={(v) => setField('automation_birthday_enabled', v)}
            />
            <ToggleRow
              label="Tiered early access"
              description="Gives higher tiers a head start on new arrivals."
              checked={form.automation_early_access_enabled}
              onChange={(v) => setField('automation_early_access_enabled', v)}
            >
              <Grid container spacing={gridSpacing}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Regular delay (hours)"
                    value={form.early_access_regular_delay_hours ?? ''}
                    onChange={(e) =>
                      setField('early_access_regular_delay_hours', e.target.value === '' ? null : Number(e.target.value))
                    }
                    disabled={!form.automation_early_access_enabled}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Shopper delay (hours)"
                    value={form.early_access_shopper_delay_hours ?? ''}
                    onChange={(e) =>
                      setField('early_access_shopper_delay_hours', e.target.value === '' ? null : Number(e.target.value))
                    }
                    disabled={!form.automation_early_access_enabled}
                    inputProps={{ min: 0 }}
                  />
                </Grid>
              </Grid>
            </ToggleRow>
            <ToggleRow
              label="Win-back"
              description="Re-engages shoppers who have gone quiet."
              checked={form.automation_winback_enabled}
              onChange={(v) => setField('automation_winback_enabled', v)}
            >
              <TextField
                type="number"
                label="Inactivity threshold (days)"
                value={form.winback_inactivity_days}
                onChange={(e) => setField('winback_inactivity_days', Number(e.target.value))}
                disabled={!form.automation_winback_enabled}
                inputProps={{ min: 1 }}
                sx={{ maxWidth: 260 }}
                fullWidth
              />
            </ToggleRow>
            <ToggleRow
              label="Owner digest"
              description="Monthly CRM summary emailed to you."
              checked={form.automation_owner_digest_enabled}
              onChange={(v) => setField('automation_owner_digest_enabled', v)}
            />
          </Stack>
          <SaveBar
            onSave={() =>
              saveFields([
                'automation_welcome_enabled',
                'automation_vault_upgrade_enabled',
                'automation_birthday_enabled',
                'automation_early_access_enabled',
                'early_access_regular_delay_hours',
                'early_access_shopper_delay_hours',
                'automation_winback_enabled',
                'winback_inactivity_days',
                'automation_owner_digest_enabled'
              ])
            }
            saving={saving}
            disabled={form.winback_inactivity_days < 1}
          />
        </TabPanel>

        {/* ---- Tab 3: Surveys ---- */}
        <TabPanel value={activeTab} index={2}>
          <SectionHeading title="Surveys" description="Trend-signal survey delivery settings." />
          <Stack spacing={2} sx={{ mt: 1 }}>
            <ToggleRow
              label="Surveys enabled"
              description="Master switch for generating and sending trend surveys."
              checked={form.survey_enabled}
              onChange={(v) => setField('survey_enabled', v)}
            />
            <Divider />
            <Grid container spacing={gridSpacing}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Non-Vault reservation (%)"
                  value={form.survey_non_vault_reservation_pct}
                  onChange={(e) => setField('survey_non_vault_reservation_pct', Number(e.target.value))}
                  disabled={!form.survey_enabled}
                  inputProps={{ min: 10, max: 100 }}
                  helperText="Minimum share of surveys reserved for non-Vault shoppers (10–100)."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  type="number"
                  label="Default delivery cadence (days)"
                  value={form.survey_default_cadence_days}
                  onChange={(e) => setField('survey_default_cadence_days', Number(e.target.value))}
                  disabled={!form.survey_enabled}
                  inputProps={{ min: 1 }}
                  helperText="Days between survey sends."
                />
              </Grid>
            </Grid>
          </Stack>
          <SaveBar
            onSave={() => saveFields(['survey_enabled', 'survey_non_vault_reservation_pct', 'survey_default_cadence_days'])}
            saving={saving}
            disabled={
              form.survey_non_vault_reservation_pct < 10 ||
              form.survey_non_vault_reservation_pct > 100 ||
              form.survey_default_cadence_days < 1
            }
          />
        </TabPanel>

        {/* ---- Tab 4: Notifications ---- */}
        <TabPanel value={activeTab} index={3}>
          <SectionHeading title="Notifications" description="Sender identity for Inner Circle emails." />
          <Grid container spacing={gridSpacing} sx={{ mt: 0.5 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                type="email"
                label="From email address"
                placeholder="hello@yourstore.com"
                value={form.email_from_address ?? ''}
                onChange={(e) => setField('email_from_address', e.target.value || null)}
                helperText="Must be a verified sender in your email provider."
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="From display name"
                placeholder="Your Store"
                value={form.email_from_name ?? ''}
                onChange={(e) => setField('email_from_name', e.target.value || null)}
                helperText="Falls back to your company name when left blank."
              />
            </Grid>
          </Grid>
          <SaveBar onSave={() => saveFields(['email_from_address', 'email_from_name'])} saving={saving} />
        </TabPanel>
      </Box>
    </MainCard>
  );
}
