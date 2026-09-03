import { useEffect, useState } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { IconPlus, IconTrash } from '@tabler/icons-react';

import { parseApiError } from './apiErrors';
import {
  ORIGIN_MAX_LENGTH,
  addMeasurementColumn,
  gridSizeOrder,
  removeMeasurementColumn,
  setMeasurementCell,
  styleDetailForm,
  styleDetailPayload,
  validateStyleDetail,
  type StyleDetailForm
} from './styleDetail';
import { getProduct, updateProduct, type Product } from 'api/inventoryStock.api';

interface EditStyleDialogProps {
  open: boolean;
  /** The row that was clicked; the dialog refetches the full style itself. */
  style: Pick<Product, 'id' | 'name' | 'style_code'> | null;
  onClose: () => void;
  onSaved: (product: Product) => void;
}

/**
 * Edit the style-level detail an iPad till renders on its Lookup sheet:
 * composition, care, origin, fit notes and the per-size measurement table
 * (design 3.5).
 *
 * These five fields existed on the wire with nothing to write them -- there was
 * no style edit surface at all in Allyvia OS, and `updateProduct`/`getProduct`
 * had no callers -- so a boutique could not fill in the sheet its own floor
 * staff read.
 *
 * The dialog refetches on open. The list endpoint does carry these five (both
 * doors go through inventory/product_views.py::_product_payload), so this is
 * for freshness rather than completeness -- the catalogue may have been sitting
 * on screen for a while.
 *
 * PATCH /inventory/products/{id}/ is admin-only server-side; a non-admin sees
 * the 403 rather than a hidden button, per the house rule.
 */
export default function EditStyleDialog({ open, style, onClose, onSaved }: EditStyleDialogProps) {
  const [form, setForm] = useState<StyleDetailForm | null>(null);
  // The product as it was loaded. styleDetailPayload diffs against this so a
  // save only carries what this session actually changed -- see its docstring
  // for the lost update an all-fields payload causes.
  const [loaded, setLoaded] = useState<StyleDetailForm | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newColumn, setNewColumn] = useState('');
  const [columnError, setColumnError] = useState<string | null>(null);
  const [sizes, setSizes] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !style) {
      // Cleared on close, so reopening on a DIFFERENT style cannot render the
      // previous one's values while its fetch is in flight.
      setForm(null);
      setLoaded(null);
      setSizes([]);
      setError(null);
      setNewColumn('');
      setColumnError(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    getProduct(style.id)
      .then((product) => {
        if (cancelled) return;
        const initial = styleDetailForm(product);
        setForm(initial);
        setLoaded(initial);
        setSizes(product.sizes || []);
      })
      .catch((err) => {
        if (!cancelled) setError(parseApiError(err).summary);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, style]);

  const errors = form ? validateStyleDetail(form) : {};
  const payload = form ? styleDetailPayload(form, loaded ?? form) : {};
  // Gated on there being something to send, matching the register-settings
  // card. An empty PATCH is harmless server-side, but a Save that is always
  // enabled tells the owner nothing about whether their edit registered.
  const dirty = Object.keys(payload).length > 0;
  const canSave = !!form && !saving && dirty && Object.keys(errors).length === 0;

  const setField = (field: 'composition' | 'care' | 'origin' | 'fitNotesText') => (value: string) =>
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));

  const handleSave = async () => {
    if (!form || !style) return;
    setSaving(true);
    setError(null);
    try {
      const saved = await updateProduct(style.id, payload);
      onSaved(saved);
      onClose();
    } catch (err) {
      // parseApiError flattens a top-level field error into the summary as
      // "origin: Ensure this field has no more than 120 characters." -- the
      // field itself is not painted, which is why origin is capped on the way
      // in as well.
      setError(parseApiError(err).summary);
    } finally {
      setSaving(false);
    }
  };

  const handleAddColumn = () => {
    if (!form) return;
    const next = addMeasurementColumn(form.grid, newColumn);
    // Cleared only on success. addMeasurementColumn refuses a case-insensitive
    // duplicate, and clearing the box anyway would look like the input was
    // swallowed rather than declined.
    if (next.columns.length === form.grid.columns.length) {
      setColumnError(`“${newColumn.trim()}” is already a column.`);
      return;
    }
    setForm({ ...form, grid: next });
    setColumnError(null);
    setNewColumn('');
  };

  const rowSizes = form ? gridSizeOrder(form.grid, sizes) : [];

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        {style?.name || 'Style details'}
        {style?.style_code && (
          <Typography variant="body2" color="text.secondary">
            {style.style_code}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          What the register shows on the Sizing &amp; fit and Details tabs. Anything left blank shows as “not filled in yet” on the iPad
          rather than as an empty field.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {loading || !form ? (
          <Box>
            <Skeleton variant="rounded" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={56} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={120} />
          </Box>
        ) : (
          <>
            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Composition"
                  value={form.composition}
                  onChange={(event) => setField('composition')(event.target.value)}
                  placeholder="100% European linen"
                  multiline
                  minRows={2}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Care"
                  value={form.care}
                  onChange={(event) => setField('care')(event.target.value)}
                  placeholder="Dry clean, cool iron"
                  multiline
                  minRows={2}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Origin"
                  value={form.origin}
                  onChange={(event) => setField('origin')(event.target.value)}
                  placeholder="Made in Portugal"
                  error={!!errors.origin}
                  slotProps={{ htmlInput: { maxLength: ORIGIN_MAX_LENGTH } }}
                  // Trimmed, so the validator and the counter cannot disagree
                  // -- 120 characters plus a trailing space read "121/120"
                  // with no error beside it.
                  helperText={errors.origin || `${form.origin.trim().length}/${ORIGIN_MAX_LENGTH}`}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  fullWidth
                  size="small"
                  label="Fit notes"
                  value={form.fitNotesText}
                  onChange={(event) => setField('fitNotesText')(event.target.value)}
                  placeholder={'Runs small, size up\nModel is 5\'11" wearing a M'}
                  helperText="One note per line. The register shows the first as a hint on the size chips."
                  multiline
                  minRows={3}
                />
              </Grid>
            </Grid>

            <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 3, mb: 1 }}>
              Measurements
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
              One row per size. Add whichever dimensions this style needs — the register shows the row for the size a customer asks about.
            </Typography>

            <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} alignItems="center">
              <TextField
                size="small"
                label="Add a dimension"
                value={newColumn}
                onChange={(event) => setNewColumn(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    handleAddColumn();
                  }
                }}
                placeholder="Chest"
                error={!!columnError}
                helperText={columnError || ' '}
                sx={{ maxWidth: 220 }}
              />
              <Button startIcon={<IconPlus size={16} />} onClick={handleAddColumn} disabled={!newColumn.trim()}>
                Add
              </Button>
            </Stack>

            {form.grid.columns.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                No dimensions yet. Add one above — “Chest”, “Waist”, “Inseam”, “Length”.
              </Typography>
            ) : rowSizes.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 1 }}>
                This style has no sizes, so there is nothing to measure per size.
              </Typography>
            ) : (
              <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1, overflowX: 'auto' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Size</TableCell>
                      {form.grid.columns.map((column) => (
                        <TableCell key={column}>
                          <Stack direction="row" spacing={0.5} alignItems="center">
                            <span>{column}</span>
                            <Tooltip title={`Remove ${column}`}>
                              <IconButton
                                size="small"
                                onClick={() =>
                                  setForm((prev) => (prev ? { ...prev, grid: removeMeasurementColumn(prev.grid, column) } : prev))
                                }
                              >
                                <IconTrash size={14} />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {rowSizes.map((size) => (
                      <TableRow key={size} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{size}</TableCell>
                        {form.grid.columns.map((column) => (
                          <TableCell key={column}>
                            <TextField
                              size="small"
                              value={form.grid.rows[size]?.[column] ?? ''}
                              onChange={(event) =>
                                setForm((prev) =>
                                  prev ? { ...prev, grid: setMeasurementCell(prev.grid, size, column, event.target.value) } : prev
                                )
                              }
                              placeholder="—"
                              sx={{ minWidth: 90 }}
                            />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={handleSave} disabled={!canSave}>
          {saving ? 'Saving…' : 'Save details'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
