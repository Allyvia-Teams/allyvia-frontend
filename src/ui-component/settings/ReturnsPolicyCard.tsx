import { useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { IconArrowsExchange } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import {
  RESTOCKING_FEE_PERCENT_MAX,
  defaultReturnsPolicyForm,
  describeApprovalThreshold,
  describeRestockingFee,
  describeWindow,
  returnsPolicyDirty,
  returnsPolicyForm,
  returnsPolicyRules,
  validateReturnsPolicy,
  type ReturnsPolicyForm
} from './returnsPolicyHelpers';
import stripeApi, { DEFAULT_REFUND_POLICY_RULES, type RefundPolicy } from 'api/stripe.api';
import { useCategories } from 'features/pos/hooks/usePOSProducts';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface ReturnsPolicyCardProps {
  companyId: string;
}

const snack = (message: string, color: 'success' | 'info') =>
  dispatch(
    openSnackbar({
      open: true,
      message,
      variant: 'alert',
      alert: { color },
      anchorOrigin: { vertical: 'top', horizontal: 'right' },
      close: true
    })
  );

const saveErrorMessage = (e: unknown): string => {
  const d = (e as { response?: { data?: unknown } })?.response?.data;
  if (!d) return 'Could not save the returns policy.';
  if (typeof d === 'string') return d;
  const obj = d as Record<string, unknown>;
  if (typeof obj.detail === 'string') return obj.detail;
  // The serializer answers {field: ["..."]}; show the sentence rather than a
  // generic failure, since each one names its own range.
  const first = Object.values(obj).find((v) => Array.isArray(v) && v.length);
  if (Array.isArray(first)) return String(first[0]);
  return 'Could not save the returns policy.';
};

/**
 * Settings → Returns: the store's return policy (ALL-69).
 *
 * Absence is a rule, not a gap. A store with no policy row allows every
 * return, and that is what most stores have chosen by never setting one — so
 * this card NEVER writes a policy on load. It shows what the absence means and
 * offers one button that writes the documented defaults, which is the moment a
 * store starts refusing returns and must be the owner's click.
 *
 * Everything the admin types is in percentages and dollars; the wire is basis
 * points and minor units. The conversions live in returnsPolicyHelpers.ts with
 * their own tests, because a slip there is a refund refused at a counter.
 */
export default function ReturnsPolicyCard({ companyId }: ReturnsPolicyCardProps) {
  const {
    data: policy,
    isLoading,
    error: loadError,
    mutate
  } = useSWR<RefundPolicy | null>(companyId ? `refund-policy-${companyId}` : null, () => stripeApi.getRefundPolicy(companyId), {
    // A form: adopting a refetched row over half-typed rules would revert
    // the owner's edits (see RegisterBehaviourCard for the same reasoning).
    revalidateOnFocus: false
  });

  const categories = useCategories();

  const [form, setForm] = useState<ReturnsPolicyForm>(defaultReturnsPolicyForm);
  const [original, setOriginal] = useState<ReturnsPolicyForm>(defaultReturnsPolicyForm);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (policy) {
      const next = returnsPolicyForm(policy);
      setForm(next);
      setOriginal(next);
    }
  }, [policy]);

  const errors = validateReturnsPolicy(form);
  const rules = returnsPolicyRules(form);
  const dirty = returnsPolicyDirty(form, original);
  const canSave = dirty && rules !== null && !saving;

  // Options are the live catalogue PLUS whatever the policy already names. A
  // final-sale category with no active stock today must stay selected — if it
  // vanished from the picker it would vanish from the next PUT, and a rule the
  // owner set would be dropped by a screen that never showed it.
  const categoryOptions = useMemo(() => {
    const names = new Set<string>((categories.data ?? []).map((c) => c.name));
    form.final_sale_categories.forEach((name) => names.add(name));
    return [...names].sort((a, b) => a.localeCompare(b));
  }, [categories.data, form.final_sale_categories]);

  const setField = <K extends keyof ReturnsPolicyForm>(field: K, value: ReturnsPolicyForm[K]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSave = async () => {
    if (!rules) return;
    setSaving(true);
    setError(null);
    try {
      const result = await stripeApi.putRefundPolicy(companyId, rules);
      const next = returnsPolicyForm(result);
      setForm(next);
      setOriginal(next);
      await mutate(result, { revalidate: false });
      // `changed` is the server's own account of what moved; an empty list
      // means the rules were already exactly this, and the version did not bump.
      if (result.changed.length === 0) snack('No rules changed — the policy was already set this way.', 'info');
      else snack(`Returns policy saved (version ${result.version}).`, 'success');
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const handleCreateDefault = async () => {
    setCreating(true);
    setError(null);
    try {
      const result = await stripeApi.putRefundPolicy(companyId, DEFAULT_REFUND_POLICY_RULES);
      await mutate(result, { revalidate: false });
      snack('Returns policy created with the default rules. Adjust them below.', 'success');
    } catch (e) {
      setError(saveErrorMessage(e));
    } finally {
      setCreating(false);
    }
  };

  const handleReset = () => {
    setForm(original);
    setError(null);
  };

  const headerAction = policy ? <Chip size="small" variant="outlined" label={`Version ${policy.version}`} /> : undefined;

  return (
    <SettingsSectionCard
      title="Returns policy"
      description="What the till may refund, and when a manager has to agree"
      icon={<IconArrowsExchange size={24} stroke={1.5} />}
      action={headerAction}
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
          // A real failure. Deliberately NOT the "no policy" state below: an
          // admin who saw "no policy set" over a network error might create
          // one on top of rules they could not see.
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => mutate()}>
                Retry
              </Button>
            }
          >
            Could not load the returns policy. This does not mean there isn&apos;t one.
          </Alert>
        ) : isLoading || policy === undefined ? (
          <Box>
            <Skeleton variant="rounded" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={56} />
          </Box>
        ) : policy === null ? (
          <Stack spacing={2} alignItems="flex-start">
            <Alert severity="info" sx={{ width: '100%' }}>
              <strong>No returns policy set — every return is allowed.</strong> Any completed sale can be refunded in full at any register,
              with no time limit, receipt, fee or approval. Creating a policy starts with the defaults below and you can change them before
              anything is refused.
            </Alert>
            <Typography variant="body2" color="text.secondary">
              Defaults: a 30-day window, receipt required for card and cash refunds, no restocking fee, no approval threshold, returns
              accepted at any location, no final-sale categories.
            </Typography>
            <Button
              variant="contained"
              onClick={handleCreateDefault}
              disabled={creating}
              startIcon={creating ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
            >
              {creating ? 'Creating…' : 'Create default policy'}
            </Button>
          </Stack>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Return window (days)"
                  value={form.window_days}
                  onChange={(e) => setField('window_days', e.target.value)}
                  error={!!errors.window_days}
                  helperText={errors.window_days || 'Days after purchase a return is accepted. 0 means the day of purchase only.'}
                  slotProps={{ htmlInput: { min: 0, step: 1 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Restocking fee (%)"
                  value={form.restocking_fee_percent}
                  onChange={(e) => setField('restocking_fee_percent', e.target.value)}
                  error={!!errors.restocking_fee_percent}
                  helperText={errors.restocking_fee_percent || 'Withheld from every refund. 0 for none; up to two decimal places.'}
                  slotProps={{ htmlInput: { min: 0, max: RESTOCKING_FEE_PERCENT_MAX, step: 0.01 } }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 4 }}>
                <TextField
                  fullWidth
                  size="small"
                  type="number"
                  label="Approval threshold ($)"
                  value={form.approval_threshold_dollars}
                  onChange={(e) => setField('approval_threshold_dollars', e.target.value)}
                  error={!!errors.approval_threshold_dollars}
                  helperText={
                    errors.approval_threshold_dollars ||
                    'Refunds at or above this need a second manager. Leave blank for none; 0 means every refund.'
                  }
                  slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={<Switch checked={form.receipt_required} onChange={(e) => setField('receipt_required', e.target.checked)} />}
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Receipt required
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        For refunds to the original card or in cash. Store credit never needs one.
                      </Typography>
                    </Box>
                  }
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch checked={form.allow_cross_location} onChange={(e) => setField('allow_cross_location', e.target.checked)} />
                  }
                  label={
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        Accept returns at any location
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Off means an item must go back to the store that sold it.
                      </Typography>
                    </Box>
                  }
                />
              </Grid>

              <Grid size={12}>
                <Autocomplete
                  multiple
                  freeSolo
                  size="small"
                  options={categoryOptions}
                  value={form.final_sale_categories}
                  loading={categories.isLoading}
                  onChange={(_e, value) => setField('final_sale_categories', value.map((v) => String(v).trim()).filter(Boolean))}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => {
                      // getTagProps carries its own `key`; React wants it ahead of the spread.
                      const { key, ...tagProps } = getTagProps({ index });
                      return <Chip key={key} {...tagProps} size="small" label={option} />;
                    })
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Final-sale categories"
                      helperText={
                        categories.isError
                          ? 'Could not load the catalogue categories — you can still type one.'
                          : 'Items in these categories can never be returned. Pick from the catalogue or type a category name.'
                      }
                    />
                  )}
                />
              </Grid>
            </Grid>

            {/* The rules read back in words, off the CONVERTED values — so
                what the owner is about to save is what they read, null and
                zero thresholds included. */}
            {rules && (
              <Alert severity="info" icon={false} sx={{ mt: 2 }}>
                <Typography variant="body2">{describeWindow(rules.window_days)}</Typography>
                <Typography variant="body2">{describeRestockingFee(rules.restocking_fee_bps)}</Typography>
                <Typography variant="body2">{describeApprovalThreshold(rules.approval_threshold_minor)}</Typography>
                {rules.final_sale_categories.length > 0 && (
                  <Typography variant="body2">Final sale: {rules.final_sale_categories.join(', ')}.</Typography>
                )}
              </Alert>
            )}

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
