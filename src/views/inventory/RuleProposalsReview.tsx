// views/inventory/RuleProposalsReview.tsx
//
// "Review suggested rules (N)": the rules suggested from the owner's notes, one row each, to confirm or dismiss
// (owner trust T7). Used by Inventory > Buying > Vendors (vendor rules) and Settings > Store rules (store rules).
// Every decision about a row (ticks, payload, when Confirm is available) is in ruleProposals.ts.

import * as React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography
} from '@mui/material';

import {
  confirmRuleProposal,
  dismissRuleProposal,
  listRuleProposals,
  type RuleProposal,
  type RuleProposalKind,
  type VendorRuleField,
  type VendorRuleValue
} from 'api/ruleProposals.api';
import { listStoreRuleCategories } from 'api/storeRules.api';

import {
  MAX_STATEMENT_CHARS,
  NEW_VENDOR,
  REVIEW_BLURB,
  REVIEW_TITLE,
  chooseVendor,
  confirmBlocker,
  confirmPayload,
  fieldErrors,
  reviewButtonLabel,
  reviewDraft,
  serverMessage,
  vendorLine,
  vendorOptions,
  type ReviewDraft
} from './ruleProposals';
import { REORDER_POLICY_OPTIONS } from './vendorRules';

export const RULE_PROPOSALS_KEY = ['rule-proposals'];

type VendorRecord = { id: string; name: string } & Partial<Record<VendorRuleField, VendorRuleValue>>;

interface Props {
  kind: RuleProposalKind;
  /** The company's vendors, for the picker on a row whose vendor was not matched by name. */
  vendors?: ReadonlyArray<VendorRecord>;
  /** Called after a confirm, so the page shows what was written. */
  onChanged?: () => void;
}

interface RowProps {
  proposal: RuleProposal;
  vendors: ReadonlyArray<VendorRecord>;
  categories: ReadonlyArray<{ key: string; label: string }>;
  onDone: (confirmed: boolean) => void;
}

function ProposalRow({ proposal, vendors, categories, onDone }: RowProps) {
  const [draft, setDraft] = React.useState<ReviewDraft>(() => reviewDraft(proposal));
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const errors = fieldErrors(draft);
  const blocker = confirmBlocker(draft);

  const act = async (confirm: boolean) => {
    setBusy(true);
    setError(null);
    try {
      if (confirm) await confirmRuleProposal(proposal.id, confirmPayload(draft));
      else await dismissRuleProposal(proposal.id);
      onDone(confirm);
    } catch (err: unknown) {
      const data = (err as { response?: { data?: unknown } })?.response?.data;
      setError(serverMessage(data));
    } finally {
      setBusy(false);
    }
  };

  const setField = (key: string, patch: Partial<{ value: string; ticked: boolean }>) =>
    setDraft({ ...draft, fields: draft.fields.map((f) => (f.key === key ? { ...f, ...patch } : f)) });

  const pickerValue = draft.vendor.mode === 'new' ? NEW_VENDOR : draft.vendor.mode === 'existing' ? draft.vendor.supplierId : '';

  return (
    <Box sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Typography variant="body2" sx={{ fontStyle: 'italic', mb: 1, wordBreak: 'break-word' }}>
        &ldquo;{proposal.quote}&rdquo;
      </Typography>

      {proposal.kind === 'vendor_rule' && (
        <Stack spacing={1.5}>
          {proposal.supplier_id ? (
            <Typography variant="subtitle2">{vendorLine(proposal)}</Typography>
          ) : (
            <>
              <Typography variant="subtitle2">{vendorLine(proposal)}</Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
                <FormControl size="small" sx={{ minWidth: 240 }}>
                  <InputLabel id={`vendor-${proposal.id}`} shrink>
                    Vendor
                  </InputLabel>
                  <Select
                    labelId={`vendor-${proposal.id}`}
                    label="Vendor"
                    displayEmpty
                    notched
                    value={pickerValue}
                    onChange={(e) => setDraft(chooseVendor(draft, proposal, String(e.target.value), vendors))}
                  >
                    <MenuItem value="">Choose a vendor</MenuItem>
                    {vendorOptions(proposal, vendors).map((option) => (
                      <MenuItem key={option.value} value={option.value}>
                        {option.label}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {draft.vendor.mode === 'new' && (
                  <TextField
                    size="small"
                    label="New vendor's name"
                    value={draft.vendor.name}
                    onChange={(e) => setDraft({ ...draft, vendor: { mode: 'new', name: e.target.value } })}
                  />
                )}
              </Stack>
            </>
          )}

          {draft.fields.map((field) => (
            <Stack key={field.key} direction="row" spacing={1} alignItems="center">
              <Checkbox
                size="small"
                checked={field.ticked}
                onChange={(e) => setField(field.key, { ticked: e.target.checked })}
                inputProps={{ 'aria-label': `Save ${field.label}` }}
              />
              {field.key === 'reorder_policy' ? (
                <TextField
                  select
                  size="small"
                  label={field.label}
                  value={field.value}
                  onChange={(e) => setField(field.key, { value: e.target.value })}
                  sx={{ minWidth: 240 }}
                >
                  {REORDER_POLICY_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
              ) : (
                <TextField
                  size="small"
                  label={field.label}
                  value={field.value}
                  onChange={(e) => setField(field.key, { value: e.target.value })}
                  error={!!errors[field.key]}
                  helperText={errors[field.key]}
                  sx={{ minWidth: 240 }}
                />
              )}
              {field.current && (
                <Typography variant="caption" color="text.secondary">
                  {field.current}
                </Typography>
              )}
            </Stack>
          ))}
        </Stack>
      )}

      {proposal.kind === 'store_rule' && (
        <Stack spacing={1.5}>
          <TextField
            label="The rule, in a sentence"
            value={draft.statement}
            onChange={(e) => setDraft({ ...draft, statement: e.target.value })}
            helperText={`${draft.statement.trim().length} of ${MAX_STATEMENT_CHARS} characters`}
            multiline
            fullWidth
          />
          <FormControl fullWidth size="small">
            <InputLabel id={`category-${proposal.id}`} shrink>
              Leave a category out of recommendations
            </InputLabel>
            <Select
              labelId={`category-${proposal.id}`}
              label="Leave a category out of recommendations"
              displayEmpty
              notched
              value={draft.categoryKey}
              onChange={(e) => setDraft({ ...draft, categoryKey: String(e.target.value) })}
            >
              <MenuItem value="">No category</MenuItem>
              {categories.map((option) => (
                <MenuItem key={option.key} value={option.key}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Stack>
      )}

      {error && (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.5 }}>
        <Button size="small" variant="contained" disabled={busy || !!blocker} onClick={() => act(true)}>
          Confirm
        </Button>
        <Button size="small" color="inherit" disabled={busy} onClick={() => act(false)}>
          Dismiss
        </Button>
        {blocker && (
          <Typography variant="caption" color="text.secondary">
            {blocker}
          </Typography>
        )}
      </Stack>
    </Box>
  );
}

export default function RuleProposalsReview({ kind, vendors = [], onChanged }: Props) {
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const proposals = useQuery({ queryKey: [...RULE_PROPOSALS_KEY, kind], queryFn: () => listRuleProposals(kind) });
  const categories = useQuery({
    queryKey: ['store-rules', 'categories'],
    queryFn: listStoreRuleCategories,
    enabled: kind === 'store_rule' && open
  });

  const rows = proposals.data?.results ?? [];
  const label = reviewButtonLabel(rows.length);

  const done = async (confirmed: boolean) => {
    await queryClient.invalidateQueries({ queryKey: [...RULE_PROPOSALS_KEY, kind] });
    if (confirmed) onChanged?.();
  };

  // The last row decided closes the review: nothing is left to show.
  const showing = open && (rows.length > 0 || !proposals.isSuccess);
  if (!label && !showing) return null;

  return (
    <>
      {label && (
        <Button size="small" variant="outlined" onClick={() => setOpen(true)}>
          {label}
        </Button>
      )}
      <Dialog open={showing} onClose={() => setOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{REVIEW_TITLE}</DialogTitle>
        <DialogContent dividers>
          <Typography variant="body2" color="text.secondary">
            {REVIEW_BLURB[kind]}
          </Typography>
          {proposals.isFetching && rows.length === 0 && <CircularProgress size={18} sx={{ mt: 2 }} />}
          {rows.map((proposal) => (
            <ProposalRow key={proposal.id} proposal={proposal} vendors={vendors} categories={categories.data ?? []} onDone={done} />
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} color="inherit">
            Close
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
