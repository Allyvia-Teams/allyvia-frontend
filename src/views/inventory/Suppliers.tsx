// views/inventory/Suppliers.tsx
//
// Who a purchase order goes to: lead time, terms, and the optional link to a
// QuickBooks or Square vendor record.
//
// This is deliberately NOT the /vendors screen. A supplier carries a lead time
// and payment terms that neither mirror has, and a boutique's buying list is not
// the same shape as its accounts-payable vendor list. The link exists so the two
// can be reconciled where the merchant maintains both.
//
// Two behaviours the API forces on this screen, both handled in purchasing.ts:
//   * Deleting deactivates. There is no hard delete, and the response is a 200
//     carrying the updated object rather than a 204.
//   * open_po_count is a real number ONLY on the list response. Every other
//     response returns null, so a row refreshed from a PATCH must not overwrite
//     the count it already had — mergeSupplierResponse exists for that.

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Grid,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconPlus, IconRefresh, IconTrash, IconUpload } from '@tabler/icons-react';

import MainCard from 'ui-component/cards/MainCard';

import {
  CatalogImportResult,
  Supplier,
  createSupplier,
  deactivateSupplier,
  importSupplierCatalog,
  listSuppliers,
  updateSupplier
} from 'api/inventoryPurchasing.api';

import {
  describeOpenPos,
  describePurchasingError,
  describeVendorLink,
  mergeSupplierResponse,
  sortSuppliersByName,
  supplierListQuery
} from './purchasing';
import {
  REORDER_POLICY_OPTIONS,
  emptyRulesDraft,
  rulesDraftFrom,
  rulesErrors,
  rulesSummary,
  toPayload as rulesToPayload,
  type ReorderPolicy,
  type VendorRulesDraft
} from './vendorRules';

interface SupplierDraft extends VendorRulesDraft {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
  default_lead_time_days: string;
  payment_terms: string;
  notes: string;
}

const emptyDraft = (): SupplierDraft => ({
  name: '',
  contact_name: '',
  email: '',
  phone: '',
  default_lead_time_days: '14',
  payment_terms: '',
  notes: '',
  ...emptyRulesDraft()
});

const draftFrom = (supplier: Supplier): SupplierDraft => ({
  name: supplier.name,
  contact_name: supplier.contact_name,
  email: supplier.email,
  phone: supplier.phone,
  default_lead_time_days: String(supplier.default_lead_time_days),
  payment_terms: supplier.payment_terms,
  notes: supplier.notes,
  ...rulesDraftFrom(supplier)
});

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [busy, setBusy] = useState(false);

  const [editing, setEditing] = useState<Supplier | null>(null);
  const [draft, setDraft] = useState<SupplierDraft>(emptyDraft());
  const [formOpen, setFormOpen] = useState(false);
  const [importResult, setImportResult] = useState<CatalogImportResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // The list endpoint annotates a count, which makes it a GROUP BY query and
      // silently drops the model's default ordering — so sort here.
      setSuppliers(sortSuppliersByName(await listSuppliers(supplierListQuery({ includeInactive }))));
      setError(null);
    } catch (err) {
      setError(describePurchasingError(err));
    } finally {
      setLoading(false);
    }
  }, [includeInactive]);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditing(null);
    setDraft(emptyDraft());
    setFormOpen(true);
  };

  const openEdit = (supplier: Supplier) => {
    setEditing(supplier);
    setDraft(draftFrom(supplier));
    setFormOpen(true);
  };

  const leadTimeError = useMemo(() => {
    const raw = draft.default_lead_time_days.trim();
    if (raw === '') return 'Required';
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 0) return 'Whole days, zero or more';
    return null;
  }, [draft.default_lead_time_days]);

  const ruleErrors = useMemo(() => rulesErrors(draft), [draft]);
  const hasRuleErrors = Object.keys(ruleErrors).length > 0;

  const submit = async () => {
    if (!draft.name.trim() || leadTimeError || hasRuleErrors) return;
    setBusy(true);
    setError(null);
    try {
      const payload = {
        name: draft.name.trim(),
        contact_name: draft.contact_name.trim(),
        email: draft.email.trim(),
        phone: draft.phone.trim(),
        default_lead_time_days: Number(draft.default_lead_time_days),
        payment_terms: draft.payment_terms.trim(),
        notes: draft.notes.trim(),
        ...rulesToPayload(draft)
      };
      if (editing) {
        const updated = await updateSupplier(editing.id, payload);
        // The PATCH response carries open_po_count: null. Folding it in naively
        // would replace a real count with "unknown" on every save.
        setSuppliers((current) =>
          sortSuppliersByName(current.map((row) => (row.id === updated.id ? mergeSupplierResponse(row, updated) : row)))
        );
        setNotice(`${updated.name} saved.`);
      } else {
        await createSupplier(payload);
        setNotice(`${payload.name} added.`);
        await load();
      }
      setFormOpen(false);
    } catch (err) {
      setError(describePurchasingError(err));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (supplier: Supplier) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await deactivateSupplier(supplier.id);
      setNotice(`${updated.name} deactivated. Its purchase-order history is kept.`);
      await load();
    } catch (err) {
      // Refused while any PO is open — a supplier with order history must stay
      // resolvable, so the API will not let it go.
      setError(describePurchasingError(err));
    } finally {
      setBusy(false);
    }
  };

  const uploadCatalog = async (supplier: Supplier, file: File) => {
    setBusy(true);
    setError(null);
    setImportResult(null);
    try {
      const result = await importSupplierCatalog(supplier.id, file);
      setImportResult(result);
      setNotice(
        `${supplier.name}: ${result.variants_created} variant(s) created, ${result.variants_updated} updated from ${result.rows} row(s).`
      );
    } catch (err) {
      setError(describePurchasingError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <MainCard
        title="Vendors"
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            {(loading || busy) && <CircularProgress size={18} />}
            <Tooltip title="Reload">
              <IconButton size="small" onClick={load}>
                <IconRefresh size={18} />
              </IconButton>
            </Tooltip>
            <Button size="small" variant="contained" startIcon={<IconPlus size={16} />} onClick={openCreate}>
              Add vendor
            </Button>
          </Stack>
        }
      >
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <FormControlLabel
              control={<Switch size="small" checked={includeInactive} onChange={(event) => setIncludeInactive(event.target.checked)} />}
              label="Show deactivated"
            />
            <Box flexGrow={1} />
            <Typography variant="caption" color="text.secondary">
              Lead time feeds the reorder engine, which overrides it with the observed median once a vendor has enough receipt history.
            </Typography>
          </Stack>

          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}
          {notice && (
            <Alert severity="success" onClose={() => setNotice(null)}>
              {notice}
            </Alert>
          )}

          {importResult && importResult.errors.length > 0 && (
            <Alert severity="warning" onClose={() => setImportResult(null)}>
              {importResult.errors.length} row(s) were skipped:{' '}
              {importResult.errors
                .slice(0, 3)
                .map((row) => `row ${row.row} (${row.field}): ${row.message}`)
                .join('; ')}
              {importResult.errors.length > 3 ? ' …' : ''}
            </Alert>
          )}

          <TableContainer sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Vendor</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell align="right">Lead time</TableCell>
                  <TableCell>Terms</TableCell>
                  <TableCell>Rules</TableCell>
                  <TableCell>Accounting link</TableCell>
                  <TableCell>Open orders</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {suppliers.length === 0 && !loading && (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <Typography variant="body2" color="text.secondary">
                        No vendors yet. Add one before raising a purchase order.
                      </Typography>
                    </TableCell>
                  </TableRow>
                )}
                {suppliers.map((supplier) => (
                  <TableRow key={supplier.id} hover sx={{ opacity: supplier.is_active ? 1 : 0.6 }}>
                    <TableCell>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Stack>
                          <Typography variant="body2">{supplier.name}</Typography>
                          {supplier.description && (
                            <Typography variant="caption" color="text.secondary">
                              {supplier.description}
                            </Typography>
                          )}
                        </Stack>
                        {!supplier.is_active && <Chip size="small" variant="outlined" label="Deactivated" />}
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack>
                        <Typography variant="caption">{supplier.contact_name || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {supplier.email || supplier.phone || ''}
                        </Typography>
                      </Stack>
                    </TableCell>
                    <TableCell align="right">{supplier.default_lead_time_days} days</TableCell>
                    <TableCell>{supplier.payment_terms || '—'}</TableCell>
                    <TableCell>
                      <Typography variant="caption">{rulesSummary(supplier) || '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{describeVendorLink(supplier)}</Typography>
                    </TableCell>
                    <TableCell>
                      {/* An em dash here means "not asked", not "none". */}
                      <Typography variant="caption">{describeOpenPos(supplier.open_po_count)}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                        <Button size="small" onClick={() => openEdit(supplier)} disabled={busy}>
                          Edit
                        </Button>
                        <Tooltip title="Import a line sheet (CSV). Adds styles and variants; never overwrites a real landed cost.">
                          <IconButton size="small" component="label" disabled={busy}>
                            <IconUpload size={16} />
                            <input
                              hidden
                              type="file"
                              accept=".csv,text/csv"
                              onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file) uploadCatalog(supplier, file);
                                // Clear so re-picking the same file fires again.
                                event.target.value = '';
                              }}
                            />
                          </IconButton>
                        </Tooltip>
                        {supplier.is_active && (
                          <Tooltip title="Deactivate. History is kept, and this is refused while any order is open.">
                            <IconButton size="small" color="error" onClick={() => deactivate(supplier)} disabled={busy}>
                              <IconTrash size={16} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      </MainCard>

      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editing ? `Edit ${editing.name}` : 'Add vendor'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                required
                label="Name"
                value={draft.name}
                onChange={(event) => setDraft({ ...draft, name: event.target.value })}
                helperText="Must be unique within the company."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Contact name"
                value={draft.contact_name}
                onChange={(event) => setDraft({ ...draft, contact_name: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Email"
                value={draft.email}
                onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Phone"
                value={draft.phone}
                onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Lead time (days)"
                value={draft.default_lead_time_days}
                onChange={(event) => setDraft({ ...draft, default_lead_time_days: event.target.value })}
                error={Boolean(leadTimeError)}
                helperText={leadTimeError ?? 'Submit to receipt. The reorder engine refines this from real receipts.'}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Payment terms"
                value={draft.payment_terms}
                onChange={(event) => setDraft({ ...draft, payment_terms: event.target.value })}
                helperText="Free text — 'Net 30', '50% deposit', 'COD' are all real."
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                label="What they sell"
                value={draft.description}
                onChange={(event) => setDraft({ ...draft, description: event.target.value })}
                helperText="A few words, for example 'Linen and denim'."
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Minimum order, units"
                value={draft.min_order_units}
                onChange={(event) => setDraft({ ...draft, min_order_units: event.target.value })}
                error={Boolean(ruleErrors.min_order_units)}
                helperText={ruleErrors.min_order_units ?? 'Leave empty if there is none.'}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Minimum order, value"
                value={draft.min_order_value}
                onChange={(event) => setDraft({ ...draft, min_order_value: event.target.value })}
                error={Boolean(ruleErrors.min_order_value)}
                helperText={ruleErrors.min_order_value ?? 'Leave empty if there is none.'}
                inputProps={{ inputMode: 'decimal' }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                select
                fullWidth
                label="Can you reorder?"
                value={draft.reorder_policy}
                onChange={(event) => setDraft({ ...draft, reorder_policy: event.target.value as ReorderPolicy })}
                helperText="One order per season means one order covers the season, with no top-ups."
              >
                {REORDER_POLICY_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="Order this far ahead, days"
                value={draft.order_ahead_days}
                onChange={(event) => setDraft({ ...draft, order_ahead_days: event.target.value })}
                error={Boolean(ruleErrors.order_ahead_days)}
                helperText={ruleErrors.order_ahead_days ?? 'How long before delivery the order must go in.'}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                label="One order lasts, days"
                value={draft.season_cover_days}
                onChange={(event) => setDraft({ ...draft, season_cover_days: event.target.value })}
                error={Boolean(ruleErrors.season_cover_days)}
                helperText={ruleErrors.season_cover_days ?? 'How long one order is meant to last.'}
                inputProps={{ inputMode: 'numeric' }}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Rules and agreements"
                value={draft.notes}
                onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submit} disabled={busy || !draft.name.trim() || Boolean(leadTimeError) || hasRuleErrors}>
            {busy ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
