import { useEffect, useRef, useState } from 'react';
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField, Typography } from '@mui/material';
import Barcode from 'react-barcode';

export interface ReceivingLabelItem {
  id: number;
  name: string;
  sku: string;
  barcode: string;
  quantity: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  items: ReceivingLabelItem[];
}

const escapeHtml = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character
  );

export default function ReceivingLabelsDialog({ open, onClose, items }: Props) {
  const barcodeHost = useRef<HTMLDivElement>(null);
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [size, setSize] = useState<'2.25x1.25' | '2x1' | 'avery5160'>('2.25x1.25');
  const [startCell, setStartCell] = useState(1);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setQuantities(Object.fromEntries(items.map((item) => [item.id, item.quantity])));
      setError(null);
    }
  }, [open, items]);

  const print = () => {
    const host = barcodeHost.current;
    if (!host) return;
    const total = items.reduce((sum, item) => sum + (quantities[item.id] ?? 0), 0);
    if (total > 500) {
      setError('Print up to 500 labels at a time. Lower the counts here, then print the remaining labels in another pass.');
      return;
    }
    const labels = items.flatMap((item, index) => {
      const svg = host.children[index]?.innerHTML;
      const count = quantities[item.id] ?? 0;
      if (!svg || !item.barcode || count < 1) return [];
      return Array.from(
        { length: count },
        () =>
          `<section class="label"><strong>${escapeHtml(item.name)}</strong><div class="code">${svg}</div><span>${escapeHtml(item.barcode)}</span><small>SKU ${escapeHtml(item.sku)}</small></section>`
      );
    });
    if (!labels.length) {
      setError('Choose at least one label to print.');
      return;
    }
    const popup = window.open('', '_blank');
    if (!popup) {
      setError('Your browser blocked the print window. Allow pop-ups for Allyvia and try again.');
      return;
    }
    const isSheet = size === 'avery5160';
    const [width, height] = isSheet ? ['2.625', '1'] : size.split('x');
    const sheetLabels = isSheet
      ? [...Array.from({ length: startCell - 1 }, () => '<section class="label blank"></section>'), ...labels]
      : labels;
    const pages = isSheet
      ? Array.from(
          { length: Math.ceil(sheetLabels.length / 30) },
          (_, index) => `<main class="sheet">${sheetLabels.slice(index * 30, (index + 1) * 30).join('')}</main>`
        ).join('')
      : labels.join('');
    popup.document.write(`<!doctype html><html><head><title>Receiving labels</title><style>
      @page { size: ${isSheet ? 'letter' : `${width}in ${height}in`}; margin: 0; }
      * { box-sizing: border-box; }
      body { margin: 0; font-family: Arial, sans-serif; color: #111; }
      .sheet { width: 8.5in; height: 11in; padding: .5in .1875in; display: grid; grid-template-columns: repeat(3, 2.625in); grid-template-rows: repeat(10, 1in); column-gap: .125in; break-after: page; page-break-after: always; }
      .sheet:last-child { break-after: auto; page-break-after: auto; }
      .label { width: ${width}in; height: ${height}in; padding: .06in .1in; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: hidden; ${isSheet ? '' : 'break-after: page; page-break-after: always;'} }
      ${isSheet ? '' : '.label:last-child { break-after: auto; page-break-after: auto; }'}
      strong { font-size: 8pt; line-height: 1.1; max-width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .code { width: 100%; text-align: center; height: ${isSheet ? '.4' : '.48'}in; }
      .code svg { max-width: 100%; width: auto; height: 100%; }
      span { font-size: 8pt; line-height: 1; }
      small { font-size: 7pt; line-height: 1.2; max-width: 100%; overflow: hidden; white-space: nowrap; }
      @media screen { body { background: #eee; } .label { background: white; } .sheet, body > .label { margin: 8px auto; box-shadow: 0 1px 5px #bbb; } }
    </style></head><body>${pages}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.setTimeout(() => popup.print(), 250);
    setError(null);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Print received stock labels</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Typography variant="body2">
            One label per unit is ready by default. Change the counts if the supplier already labelled some units.
          </Typography>
          <TextField
            select
            label="Label layout"
            value={size}
            onChange={(event) => setSize(event.target.value as typeof size)}
            SelectProps={{ native: true }}
          >
            <option value="2.25x1.25">2¼ × 1¼ inches</option>
            <option value="2x1">2 × 1 inches</option>
            <option value="avery5160">Avery 5160 · 30 per letter sheet</option>
          </TextField>
          {size === 'avery5160' && (
            <TextField
              label="Start at cell (1–30)"
              type="number"
              value={startCell}
              onChange={(event) => {
                const value = Number(event.target.value);
                setStartCell(Number.isInteger(value) ? Math.min(30, Math.max(1, value)) : 1);
              }}
              inputProps={{ min: 1, max: 30, step: 1 }}
              helperText="Use a partially used label sheet. Cell 1 is the top left."
            />
          )}
          {items.map((item) => (
            <TextField
              key={item.id}
              label={`${item.name} · ${item.sku}`}
              type="number"
              value={quantities[item.id] ?? 0}
              onChange={(event) =>
                setQuantities((current) => {
                  const value = Number(event.target.value);
                  return { ...current, [item.id]: Number.isSafeInteger(value) && value >= 0 ? value : 0 };
                })
              }
              inputProps={{ min: 0, step: 1 }}
              helperText={`Barcode ${item.barcode}`}
            />
          ))}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
        <div ref={barcodeHost} aria-hidden="true" style={{ position: 'absolute', left: -10000, top: 0 }}>
          {items.map((item) => (
            <div key={item.id}>
              <Barcode value={item.barcode} format="CODE128" displayValue={false} height={40} width={1.4} margin={0} />
            </div>
          ))}
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Done</Button>
        <Button variant="contained" onClick={print} disabled={!items.length}>
          Print labels
        </Button>
      </DialogActions>
    </Dialog>
  );
}
