// views/inventory/PoLinePicker.tsx
//
// What to put on a purchase order. Two ways in, because a buyer asks two
// different questions:
//   * "reorder this style" — the size x colour grid, quantities typed into cells,
//     every non-blank cell becoming a line in one pass. This is the normal case in
//     fashion: one style is twelve lines, and adding them one at a time is how a
//     grid ends up missing a size.
//   * "add this SKU" — one variant, found by its code.
//
// THREE API FACTS SHAPE THIS DIALOG.
//
// 1. `GET /inventory/products/?search=` DOES NOT LOOK AT SKU. The view filters on
//    name, style_code, category and brand, and returns the variants nested in each
//    style — so SKU matching has to happen client-side over the styles that came
//    back. A generated SKU is STYLE-COLOUR-SIZE (matrix.ts::suggestSku), so typing
//    one usually still narrows the fetch via `style_code__icontains`; but a
//    supplier's own code need not resemble the style code at all. When the narrowed
//    search finds nothing, this widens to one unfiltered fetch and matches locally,
//    rather than telling a buyer their SKU does not exist.
//
// 2. A VARIANT MAY APPEAR ON A PO ONCE. `_resolve_lines` answers 400 on a repeated
//    inventory_item_id, and on PATCH that 400 costs the whole line grid (`lines` is
//    a wholesale replacement). So anything already on the draft is shown disabled
//    instead of being addable twice — validatePoDraft would catch it, but only
//    after the buyer had typed a quantity that has nowhere to go.
//
// 3. Quantities leave here as RAW TEXT. validatePoDraft is the only thing that
//    judges a quantity, and it lives in purchasing.ts; a second opinion here would
//    eventually disagree with it.

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
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography
} from '@mui/material';
import { IconArrowLeft } from '@tabler/icons-react';

import { Product, ProductVariant, listProducts } from 'api/inventoryStock.api';

import { toGrid } from './matrix';
import { describePurchasingError, formatMoney } from './purchasing';
import { EM_DASH, formatQuantity } from './stockFormat';

/** One line the buyer chose. The parent owns the draft; this is only the pick. */
export interface PoLinePickerRow {
  inventoryItemId: number;
  /** SKU · colour / size. Display only — the API resolves lines by item id. */
  label: string;
  /** The variant's cost price, as a starting unit cost. Editable in the grid. */
  suggestedUnitCost: string;
  /** Exactly what was typed into the cell. Judged by validatePoDraft, not here. */
  qtyOrdered: string;
}

export interface PoLinePickerProps {
  open: boolean;
  onClose: () => void;
  onAdd: (rows: PoLinePickerRow[]) => void;
  /** Item ids already on the draft — offered disabled, because a repeat is a 400. */
  existingItemIds?: number[];
}

type PickerMode = 'style' | 'sku';

/** Cap the flat list: a blank SKU search over a whole catalogue is not a page. */
const MAX_FLAT_ROWS = 100;

const variantLabel = (product: Product, variant: ProductVariant): string => {
  const axes = [variant.color, variant.size].filter(Boolean).join(' / ');
  const base = variant.sku || variant.name || product.name;
  return axes ? `${base} · ${axes}` : base;
};

export default function PoLinePicker({ open, onClose, onAdd, existingItemIds = [] }: PoLinePickerProps) {
  const [mode, setMode] = useState<PickerMode>('style');
  const [search, setSearch] = useState('');
  const [applied, setApplied] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // True when the SKU search had to fall back to an unfiltered fetch (fact 1).
  const [widened, setWidened] = useState(false);
  // The chosen style is HELD, not looked up by id in `products`: refining the
  // search mid-grid would otherwise drop it from the result set and throw the buyer
  // back to the list while they were typing quantities into it.
  const [style, setStyle] = useState<Product | null>(null);
  // Likewise the whole picked row is kept rather than just the quantity, so a pick
  // survives its product leaving the result set.
  const [picked, setPicked] = useState<Record<number, PoLinePickerRow>>({});

  const already = useMemo(() => new Set(existingItemIds), [existingItemIds]);

  useEffect(() => {
    const timer = setTimeout(() => setApplied(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      let rows = await listProducts(applied ? { search: applied } : {});
      let widenedNow = false;
      if (mode === 'sku' && applied !== '' && rows.length === 0) {
        // The search never reached the SKU column; widen once and match locally.
        rows = await listProducts({});
        widenedNow = true;
      }
      setProducts(rows);
      setWidened(widenedNow);
    } catch (err) {
      setError(describePurchasingError(err));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [applied, mode]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    setPicked({});
    setStyle(null);
  }, [open]);

  const flatMatches = useMemo(() => {
    const needle = applied.toLowerCase();
    const out: Array<{ product: Product; variant: ProductVariant }> = [];
    products.forEach((product) =>
      product.variants.forEach((variant) => {
        if (!needle) {
          out.push({ product, variant });
          return;
        }
        const haystack = [variant.sku ?? '', variant.name, variant.size, variant.color, variant.barcode ?? '', product.style_code]
          .join(' ')
          .toLowerCase();
        if (haystack.includes(needle)) out.push({ product, variant });
      })
    );
    return out;
  }, [products, applied]);

  const setCell = (product: Product, variant: ProductVariant, value: string) => {
    // Digits only, enforced by ignoring anything else rather than by stripping it:
    // silently rewriting what someone typed is how a quantity nobody chose ends up
    // on a purchase order.
    if (!/^\d*$/.test(value)) return;
    setPicked((current) => {
      const next = { ...current };
      if (value === '') delete next[variant.inventory_item_id];
      else
        next[variant.inventory_item_id] = {
          inventoryItemId: variant.inventory_item_id,
          label: variantLabel(product, variant),
          suggestedUnitCost: variant.cost_price,
          qtyOrdered: value
        };
      return next;
    });
  };

  const chosen = useMemo(() => Object.values(picked), [picked]);
  const chosenUnits = chosen.reduce((total, row) => total + (Number(row.qtyOrdered) || 0), 0);

  const qtyField = (product: Product, variant: ProductVariant) => {
    const isOn = already.has(variant.inventory_item_id);
    return (
      <Tooltip
        title={
          isOn
            ? 'Already on this order — change the quantity on the line instead. A variant listed twice is rejected outright.'
            : `${variantLabel(product, variant)} · ${formatQuantity(variant.quantity_on_hand)} on hand · cost ${formatMoney(variant.cost_price)}`
        }
      >
        <span>
          <TextField
            size="small"
            disabled={isOn}
            value={picked[variant.inventory_item_id]?.qtyOrdered ?? ''}
            onChange={(event) => setCell(product, variant, event.target.value)}
            inputProps={{ inputMode: 'numeric', style: { textAlign: 'center' } }}
            sx={{ width: 72 }}
          />
        </span>
      </Tooltip>
    );
  };

  const grid = toGrid(style?.variants ?? []);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth>
      <DialogTitle>Add lines</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_event, next: PickerMode | null) => {
                if (!next) return;
                setMode(next);
                setStyle(null);
              }}
            >
              <ToggleButton value="style">By style (matrix)</ToggleButton>
              <ToggleButton value="sku">By SKU</ToggleButton>
            </ToggleButtonGroup>
            <TextField
              size="small"
              label={mode === 'style' ? 'Search styles' : 'Search SKU, colour or size'}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              sx={{ minWidth: 280 }}
              helperText={
                mode === 'style'
                  ? 'Matches style name, code, category or brand.'
                  : 'SKU matching happens on the styles found — the API search does not read the SKU column.'
              }
            />
            <Box flexGrow={1} />
            {loading && <CircularProgress size={18} />}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {widened && (
            <Alert severity="info">
              No style matched “{applied}”, so every style was loaded and the SKUs matched here instead. Narrow the text if the list is
              long.
            </Alert>
          )}

          {mode === 'style' && !style && (
            <TableContainer sx={{ maxHeight: 420, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Style</TableCell>
                    <TableCell>Code</TableCell>
                    <TableCell>Brand</TableCell>
                    <TableCell align="right">Variants</TableCell>
                    <TableCell align="right">On hand</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {products.length === 0 && !loading && (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Typography variant="body2" color="text.secondary">
                          No styles match. Create the style first — a purchase order can only be raised against variants that exist.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                  {products.map((product) => (
                    <TableRow key={product.id} hover sx={{ cursor: 'pointer' }} onClick={() => setStyle(product)}>
                      <TableCell>
                        <Typography variant="body2">{product.name}</Typography>
                      </TableCell>
                      <TableCell>{product.style_code || EM_DASH}</TableCell>
                      <TableCell>{product.brand || EM_DASH}</TableCell>
                      <TableCell align="right">{product.variant_count}</TableCell>
                      <TableCell align="right">{formatQuantity(product.total_on_hand)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}

          {mode === 'style' && style && (
            <Stack spacing={1.5}>
              <Stack direction="row" spacing={1} alignItems="center">
                <Button size="small" startIcon={<IconArrowLeft size={16} />} onClick={() => setStyle(null)}>
                  All styles
                </Button>
                <Typography variant="subtitle1">{style.name}</Typography>
                {style.style_code && <Chip size="small" variant="outlined" label={style.style_code} />}
              </Stack>

              {grid.isGrid ? (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Colour \ Size</TableCell>
                        {grid.sizes.map((size) => (
                          <TableCell key={size} align="center" sx={{ fontWeight: 600 }}>
                            {size}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {grid.colors.map((color) => (
                        <TableRow key={color}>
                          <TableCell sx={{ fontWeight: 600 }}>{color}</TableCell>
                          {grid.sizes.map((size) => {
                            const variant = grid.cell(color, size);
                            // A gap is a real fact: that size/colour was never
                            // created, so there is nothing to order. An input here
                            // would offer a line the API cannot resolve.
                            if (!variant)
                              return (
                                <TableCell key={size} align="center" sx={{ color: 'text.disabled' }}>
                                  {EM_DASH}
                                </TableCell>
                              );
                            return (
                              <TableCell key={size} align="center">
                                <Stack spacing={0.25} alignItems="center">
                                  {qtyField(style, variant)}
                                  <Typography variant="caption" color="text.secondary">
                                    {formatQuantity(variant.quantity_on_hand)} on hand
                                  </Typography>
                                </Stack>
                              </TableCell>
                            );
                          })}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                // Single-variant styles are the backfilled majority; a 1x1 matrix
                // reads worse than a list.
                <Stack spacing={1}>
                  {style.variants.map((variant) => (
                    <Stack key={variant.inventory_item_id} direction="row" spacing={1.5} alignItems="center">
                      {qtyField(style, variant)}
                      <Typography variant="body2">{variantLabel(style, variant)}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatQuantity(variant.quantity_on_hand)} on hand · cost {formatMoney(variant.cost_price)}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </Stack>
          )}

          {mode === 'sku' && (
            <>
              {flatMatches.length > MAX_FLAT_ROWS && (
                <Typography variant="caption" color="text.secondary">
                  Showing the first {MAX_FLAT_ROWS} of {flatMatches.length} variants — narrow the search.
                </Typography>
              )}
              <TableContainer sx={{ maxHeight: 420, overflow: 'auto' }}>
                <Table size="small" stickyHeader>
                  <TableHead>
                    <TableRow>
                      <TableCell align="center">Order</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Style</TableCell>
                      <TableCell>Colour / size</TableCell>
                      <TableCell align="right">On hand</TableCell>
                      <TableCell align="right">Cost</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {flatMatches.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={6}>
                          <Typography variant="body2" color="text.secondary">
                            No variant matches that code.
                          </Typography>
                        </TableCell>
                      </TableRow>
                    )}
                    {flatMatches.slice(0, MAX_FLAT_ROWS).map(({ product, variant }) => (
                      <TableRow key={variant.inventory_item_id} hover>
                        <TableCell align="center">{qtyField(product, variant)}</TableCell>
                        <TableCell>{variant.sku || EM_DASH}</TableCell>
                        <TableCell>{product.name}</TableCell>
                        <TableCell>{[variant.color, variant.size].filter(Boolean).join(' / ') || EM_DASH}</TableCell>
                        <TableCell align="right">{formatQuantity(variant.quantity_on_hand)}</TableCell>
                        <TableCell align="right">{formatMoney(variant.cost_price)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </>
          )}

          <Typography variant="caption" color="text.secondary">
            Cost prices become the starting unit cost of each line and stay editable there — the supplier's price for this season wins over
            whatever was last paid.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 'auto', ml: 2 }}>
          {chosen.length === 0
            ? 'Type a quantity to choose a variant.'
            : `${chosen.length} variant(s), ${chosenUnits} unit(s) — picks are kept while you search.`}
        </Typography>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={chosen.length === 0}
          onClick={() => {
            onAdd(chosen);
            onClose();
          }}
        >
          Add {chosen.length || ''} line(s)
        </Button>
      </DialogActions>
    </Dialog>
  );
}
