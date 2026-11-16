import * as React from 'react';
import { useSnackbar } from 'notistack';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography
} from '@mui/material';

import MainCard from 'ui-component/cards/MainCard';
import { listLocations } from 'api/inventoryStock.api';
import { LOCATIONS_QUERY_KEY } from 'ui-component/settings/LocationTaxRateEditor';
import { createStoreRule, listStoreRuleCategories, listStoreRules, retireStoreRule, type StoreRule } from 'api/storeRules.api';
import {
  EMPTY_FORM,
  MAX_STATEMENT_CHARS,
  STORE_RULES_BLURB,
  categoryOptions,
  formError,
  retireQuestion,
  ruleRow,
  serverMessage,
  showStorePicker,
  storeOptions,
  toPayload,
  type StoreRuleForm
} from './storeRulesView';
import OneOffRule from './OneOffRule';

const RULES_KEY = ['store-rules'];

/**
 * Settings > Store rules (owner trust T6). The owner's rules in her words: the ones in force, who wrote each and
 * when, Retire with a confirm, and a form to add one. Rules are never deleted; retired ones show behind a toggle.
 * Every sentence comes from `storeRulesView.ts`. Above her own rules sits one built-in rule, the one-off switch
 * (owner trust T9, `OneOffRule`).
 */
const StoreRulesSettings: React.FC<{ companyId?: string }> = ({ companyId = '' }) => {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();
  const [showRetired, setShowRetired] = React.useState(false);
  const [form, setForm] = React.useState<StoreRuleForm>(EMPTY_FORM);
  const [touched, setTouched] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [confirming, setConfirming] = React.useState<StoreRule | null>(null);
  const [retiring, setRetiring] = React.useState(false);

  const rules = useQuery({ queryKey: [...RULES_KEY, showRetired], queryFn: () => listStoreRules(showRetired) });
  const categories = useQuery({ queryKey: [...RULES_KEY, 'categories'], queryFn: listStoreRuleCategories });
  const locations = useQuery({ queryKey: LOCATIONS_QUERY_KEY, queryFn: listLocations });

  const stores = storeOptions(locations.data);
  const manyStores = showStorePicker(stores);
  const error = touched ? formError(form) : null;

  const refresh = () => queryClient.invalidateQueries({ queryKey: RULES_KEY });

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    setSaveError(null);
    if (formError(form)) return;
    setSaving(true);
    try {
      await createStoreRule(toPayload(form));
      setForm(EMPTY_FORM);
      setTouched(false);
      enqueueSnackbar('Rule added.', { variant: 'success' });
      await refresh();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      setSaveError(serverMessage(data));
    } finally {
      setSaving(false);
    }
  };

  const retire = async () => {
    if (!confirming) return;
    setRetiring(true);
    try {
      await retireStoreRule(confirming.id);
      enqueueSnackbar('Rule retired.', { variant: 'success' });
      setConfirming(null);
      await refresh();
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      enqueueSnackbar(serverMessage(data, 'Could not retire that rule.'), { variant: 'error' });
    } finally {
      setRetiring(false);
    }
  };

  const rows = (rules.data?.results ?? []).map((rule) => ({ rule, row: ruleRow(rule, manyStores) }));

  return (
    <Stack spacing={{ xs: 2, sm: 3 }}>
      <MainCard title="Store rules" content={false}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            {STORE_RULES_BLURB}
          </Typography>

          {companyId && <OneOffRule companyId={companyId} />}

          <FormControlLabel
            control={<Switch size="small" checked={showRetired} onChange={(e) => setShowRetired(e.target.checked)} />}
            label="Show retired"
            sx={{ mb: 1 }}
          />

          {rules.isError && (
            <Alert
              severity="error"
              action={
                <Button size="small" onClick={() => rules.refetch()}>
                  Retry
                </Button>
              }
            >
              Couldn&apos;t load your store rules.
            </Alert>
          )}

          {rules.isPending && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={16} />
              <Typography variant="body2" color="textSecondary">
                Loading…
              </Typography>
            </Stack>
          )}

          {rules.isSuccess && rows.length === 0 && (
            <Typography variant="body2" color="textSecondary">
              {showRetired ? 'No rules yet.' : 'No rules in force. Add one below.'}
            </Typography>
          )}

          {rows.length > 0 && (
            <Stack spacing={1.25}>
              {rows.map(({ rule, row }) => (
                <Stack
                  key={row.id}
                  direction="row"
                  spacing={2}
                  alignItems="flex-start"
                  sx={{ py: 1.25, borderBottom: 1, borderColor: 'divider', opacity: row.canRetire ? 1 : 0.7 }}
                >
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
                      {row.statement}
                    </Typography>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap', rowGap: 0.5 }}>
                      {row.category && <Chip size="small" color="primary" variant="outlined" label={row.category} />}
                      {row.store && <Chip size="small" variant="outlined" label={row.store} />}
                      <Typography variant="caption" color="textSecondary">
                        {row.author}
                      </Typography>
                    </Stack>
                    {row.retired && (
                      <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 0.5 }}>
                        {row.retired}
                      </Typography>
                    )}
                  </Box>
                  {row.canRetire && (
                    <Button size="small" color="inherit" onClick={() => setConfirming(rule)}>
                      Retire
                    </Button>
                  )}
                </Stack>
              ))}
            </Stack>
          )}
        </Box>
      </MainCard>

      <MainCard title="Add a rule" content={false}>
        <Box component="form" noValidate onSubmit={add} sx={{ p: 2.5 }}>
          <Stack spacing={2}>
            <TextField
              label="The rule, in a sentence"
              placeholder="We do not reorder jewelry"
              value={form.statement}
              onChange={(e) => setForm({ ...form, statement: e.target.value })}
              onBlur={() => setTouched(true)}
              error={!!error}
              helperText={error ?? `${form.statement.trim().length} of ${MAX_STATEMENT_CHARS} characters`}
              multiline
              minRows={2}
              fullWidth
            />

            <FormControl fullWidth size="small">
              <InputLabel id="store-rule-category" shrink>
                Leave a category out of recommendations
              </InputLabel>
              <Select
                labelId="store-rule-category"
                label="Leave a category out of recommendations"
                displayEmpty
                notched
                value={form.categoryKey}
                onChange={(e) => setForm({ ...form, categoryKey: String(e.target.value) })}
              >
                <MenuItem value="">No category</MenuItem>
                {categoryOptions(categories.data ?? []).map((option) => (
                  <MenuItem key={option.key} value={option.key}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            {categories.isError && (
              <Typography variant="caption" color="error">
                Couldn&apos;t load your categories. You can still add a rule without one.
              </Typography>
            )}

            {manyStores && (
              <FormControl fullWidth size="small">
                <InputLabel id="store-rule-store" shrink>
                  Store
                </InputLabel>
                <Select
                  labelId="store-rule-store"
                  label="Store"
                  displayEmpty
                  notched
                  value={form.locationId}
                  onChange={(e) => setForm({ ...form, locationId: String(e.target.value) })}
                >
                  <MenuItem value="">Every store</MenuItem>
                  {stores.map((store) => (
                    <MenuItem key={store.id} value={store.id}>
                      {store.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            {saveError && <Alert severity="error">{saveError}</Alert>}

            <Box>
              <Button type="submit" variant="contained" disabled={saving}>
                {saving ? 'Adding…' : 'Add rule'}
              </Button>
            </Box>
          </Stack>
        </Box>
      </MainCard>

      <Dialog open={!!confirming} onClose={() => (retiring ? undefined : setConfirming(null))} maxWidth="xs" fullWidth>
        <DialogTitle>Retire this rule?</DialogTitle>
        <DialogContent>
          <DialogContentText>{confirming ? retireQuestion(confirming) : ''}</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirming(null)} disabled={retiring} color="inherit">
            Keep it
          </Button>
          <Button onClick={retire} disabled={retiring} variant="contained">
            {retiring ? 'Retiring…' : 'Retire'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
};

export default StoreRulesSettings;
