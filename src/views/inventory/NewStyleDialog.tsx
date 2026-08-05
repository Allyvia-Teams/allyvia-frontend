// views/inventory/NewStyleDialog.tsx
//
// Create a style and its whole variant matrix in one pass — the fashion-retail
// case the flat item catalogue could not express: one "Linen Shirt" that exists in
// 4 sizes × 3 colours is 12 sellable things, and typing them one at a time is how
// SKUs end up inconsistent.
//
// Generation, SKU suggestion and validation all live in matrix.ts and are tested
// there; this file is the form around them.

import { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';

import { createProduct } from 'api/inventoryStock.api';

import { GeneratedVariant, generateMatrix, parseAxisInput, toCreatePayload, validateMatrix } from './matrix';

export interface NewStyleDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function NewStyleDialog({ open, onClose, onCreated }: NewStyleDialogProps) {
  const [name, setName] = useState('');
  const [styleCode, setStyleCode] = useState('');
  const [category, setCategory] = useState('');
  const [brand, setBrand] = useState('');
  const [season, setSeason] = useState('');
  const [sizesInput, setSizesInput] = useState('');
  const [colorsInput, setColorsInput] = useState('');
  const [defaultPrice, setDefaultPrice] = useState('');
  const [defaultCost, setDefaultCost] = useState('');
  const [variants, setVariants] = useState<GeneratedVariant[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const sizes = useMemo(() => parseAxisInput(sizesInput), [sizesInput]);
  const colors = useMemo(() => parseAxisInput(colorsInput), [colorsInput]);
  const validation = validateMatrix(variants);

  const reset = () => {
    setName('');
    setStyleCode('');
    setCategory('');
    setBrand('');
    setSeason('');
    setSizesInput('');
    setColorsInput('');
    setDefaultPrice('');
    setDefaultCost('');
    setVariants([]);
    setServerError(null);
  };

  const regenerate = () => {
    // Passing the current variants preserves anything already typed: adding a
    // fifth size must not wipe the prices entered into the first twelve cells.
    setVariants(generateMatrix(styleCode, { sizes, colors }, { unitPrice: defaultPrice, costPrice: defaultCost, openingQty: 0 }, variants));
  };

  const editCell = (key: string, patch: Partial<GeneratedVariant>) =>
    setVariants((current) => current.map((variant) => (variant.key === key ? { ...variant, ...patch } : variant)));

  const submit = async () => {
    if (!validation.valid || !name.trim() || !styleCode.trim()) return;
    setSubmitting(true);
    setServerError(null);
    try {
      await createProduct(toCreatePayload({ name, styleCode, category, brand, season }, variants));
      reset();
      onCreated();
      onClose();
    } catch (err) {
      const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data ?? {};
      const detail = typeof data.detail === 'string' ? data.detail : null;
      const firstField = Object.values(data).find((value) => Array.isArray(value) && value.length);
      setServerError(detail ?? (Array.isArray(firstField) ? String(firstField[0]) : 'Could not create the style.'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>New style</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField fullWidth required label="Style name" value={name} onChange={(event) => setName(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField
                fullWidth
                required
                label="Style code"
                value={styleCode}
                onChange={(event) => setStyleCode(event.target.value)}
                helperText="Drives the suggested SKUs, e.g. LIN-SHIRT → LIN-SHIRT-BLK-M"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Category" value={category} onChange={(event) => setCategory(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField fullWidth label="Brand" value={brand} onChange={(event) => setBrand(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Season"
                value={season}
                onChange={(event) => setSeason(event.target.value)}
                helperText="e.g. SS26"
              />
            </Grid>
          </Grid>

          <Divider />

          <Typography variant="subtitle1">Variant matrix</Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Sizes"
                value={sizesInput}
                onChange={(event) => setSizesInput(event.target.value)}
                helperText="Comma-separated, in the order you want them: XS, S, M, L"
              />
            </Grid>
            <Grid size={{ xs: 12, sm: 4 }}>
              <TextField
                fullWidth
                label="Colours"
                value={colorsInput}
                onChange={(event) => setColorsInput(event.target.value)}
                helperText="Comma-separated: Black, Ivory, Sage"
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                fullWidth
                label="Price"
                value={defaultPrice}
                onChange={(event) => setDefaultPrice(event.target.value)}
                inputProps={{ inputMode: 'decimal' }}
              />
            </Grid>
            <Grid size={{ xs: 6, sm: 2 }}>
              <TextField
                fullWidth
                label="Cost"
                value={defaultCost}
                onChange={(event) => setDefaultCost(event.target.value)}
                inputProps={{ inputMode: 'decimal' }}
              />
            </Grid>
          </Grid>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={regenerate} disabled={!styleCode.trim()}>
              {variants.length ? 'Regenerate grid' : 'Generate grid'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {sizes.length || colors.length
                ? `${Math.max(colors.length, 1)} × ${Math.max(sizes.length, 1)} = ${Math.max(colors.length, 1) * Math.max(sizes.length, 1)} variant(s)`
                : 'No sizes or colours — this will be a single-variant style'}
            </Typography>
            <Box flexGrow={1} />
            <Typography variant="caption" color="text.secondary">
              Edited SKUs survive a regenerate.
            </Typography>
          </Stack>

          {validation.errors.map((message) => (
            <Alert key={message} severity="warning">
              {message}
            </Alert>
          ))}

          {variants.length > 0 && (
            <TableContainer sx={{ maxHeight: 340, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Colour</TableCell>
                    <TableCell>Size</TableCell>
                    <TableCell>SKU</TableCell>
                    <TableCell>Barcode</TableCell>
                    <TableCell align="right">Price</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">Opening qty</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {variants.map((variant) => (
                    <TableRow key={variant.key} hover>
                      <TableCell>{variant.color || '—'}</TableCell>
                      <TableCell>{variant.size || '—'}</TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={variant.sku}
                          error={validation.duplicateSkus.includes(variant.sku)}
                          onChange={(event) => editCell(variant.key, { sku: event.target.value, skuEdited: true })}
                          sx={{ minWidth: 200 }}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          value={variant.barcode}
                          onChange={(event) => editCell(variant.key, { barcode: event.target.value })}
                          sx={{ minWidth: 140 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={variant.unitPrice}
                          onChange={(event) => editCell(variant.key, { unitPrice: event.target.value })}
                          inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={variant.costPrice}
                          onChange={(event) => editCell(variant.key, { costPrice: event.target.value })}
                          inputProps={{ inputMode: 'decimal', style: { textAlign: 'right' } }}
                          sx={{ width: 90 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <TextField
                          size="small"
                          value={String(variant.openingQty)}
                          onChange={(event) => editCell(variant.key, { openingQty: Number(event.target.value) || 0 })}
                          inputProps={{ inputMode: 'numeric', style: { textAlign: 'right' } }}
                          sx={{ width: 80 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {serverError && <Alert severity="error">{serverError}</Alert>}

          <Typography variant="caption" color="text.secondary">
            Opening quantities are recorded as an opening movement in the stock ledger, at the default location — so the count has a
            traceable origin rather than appearing out of nowhere.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={submit}
          disabled={submitting || !variants.length || !validation.valid || !name.trim() || !styleCode.trim()}
        >
          {submitting ? 'Creating…' : `Create ${variants.length || ''} variant(s)`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
