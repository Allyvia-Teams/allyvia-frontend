import React from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import Barcode from 'react-barcode';

import { InventoryItem } from 'types/inventory';
import { buildInventoryLabelPdf, LABEL_LAYOUTS } from 'utils/reports/inventory/inventoryLabelPdf';

interface Props {
  open: boolean;
  onClose: () => void;
  items: InventoryItem[];
}

const LabelPrintModal: React.FC<Props> = ({ open, onClose, items }) => {
  const barcodeHost = React.useRef<HTMLDivElement>(null);
  const [layoutName, setLayoutName] = React.useState(LABEL_LAYOUTS[0].name);
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [offset, setOffset] = React.useState(0);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [notice, setNotice] = React.useState<string | null>(null);

  const printableItems = items.filter((item) => Boolean(item.barcode?.trim()));
  const missingBarcodeCount = items.length - printableItems.length;
  const layout = LABEL_LAYOUTS.find((candidate) => candidate.name === layoutName) || LABEL_LAYOUTS[0];
  const labelCount = printableItems.reduce((total, item) => total + (quantities[String(item.id)] || 0), 0);

  React.useEffect(() => {
    if (open) {
      setQuantities(Object.fromEntries(items.map((item) => [String(item.id), Math.max(1, item.quantity_on_hand || 1)])));
      setError(null);
      setNotice(null);
    }
  }, [open, items]);

  const submit = () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const host = barcodeHost.current;
      if (!host) throw new Error('Barcodes are still loading. Try again.');
      const rows = printableItems.map((item, index) => {
        const canvas = host.children[index]?.querySelector('canvas');
        if (!canvas) throw new Error(`Could not draw the barcode for ${item.name}.`);
        return {
          id: String(item.id),
          name: item.name,
          sku: item.sku || '',
          barcode: item.barcode || '',
          quantity: quantities[String(item.id)] || 0,
          barcodePng: canvas.toDataURL('image/png')
        };
      });
      const doc = buildInventoryLabelPdf(rows, layout, layout.kind === 'avery' ? offset : 0);
      const url = URL.createObjectURL(doc.output('blob'));
      const tab = window.open(url, '_blank');
      window.setTimeout(() => URL.revokeObjectURL(url), 300000);
      if (!tab) {
        doc.save('inventory-labels.pdf');
        setNotice('The PDF was downloaded because your browser blocked the new tab.');
      } else {
        onClose();
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create the label PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Print labels</DialogTitle>
      <DialogContent>
        <FormControl fullWidth size="small" sx={{ mt: 1 }}>
          <InputLabel>Layout</InputLabel>
          <Select
            value={layoutName}
            label="Layout"
            onChange={(event) => {
              setLayoutName(event.target.value);
              setOffset(0);
            }}
          >
            {LABEL_LAYOUTS.map((option) => (
              <MenuItem key={option.name} value={option.name}>
                {option.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {missingBarcodeCount > 0 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {missingBarcodeCount} selected item(s) have no barcode and will be skipped.
          </Alert>
        )}
        {labelCount > 500 && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            Print up to 500 labels at once. Lower the quantities to continue.
          </Alert>
        )}
        {printableItems.map((item) => (
          <TextField
            key={item.id}
            fullWidth
            size="small"
            type="number"
            label={`${item.name} labels`}
            value={quantities[String(item.id)] ?? 1}
            onChange={(event) => {
              const value = Number(event.target.value);
              setQuantities((current) => ({ ...current, [String(item.id)]: Number.isSafeInteger(value) && value >= 0 ? value : 0 }));
            }}
            inputProps={{ min: 0, step: 1 }}
            helperText={`SKU ${item.sku || '—'} · Barcode ${item.barcode}`}
            sx={{ mt: 2 }}
          />
        ))}
        {layout.kind === 'avery' && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="caption">Start cell on the sheet</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 0.5, mt: 1 }}>
              {Array.from({ length: 30 }, (_, index) => (
                <Button key={index} size="small" variant={offset === index ? 'contained' : 'outlined'} onClick={() => setOffset(index)}>
                  {index + 1}
                </Button>
              ))}
            </Box>
          </Box>
        )}
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="info" sx={{ mt: 2 }}>
            {notice}
          </Alert>
        )}
        <Box ref={barcodeHost} aria-hidden="true" sx={{ position: 'absolute', left: -10000, top: 0 }}>
          {printableItems.map((item) => (
            <Box key={item.id}>
              <Barcode
                value={item.barcode || ''}
                renderer="canvas"
                format="CODE128"
                displayValue={false}
                width={3}
                height={80}
                margin={0}
              />
            </Box>
          ))}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={submit} disabled={busy || labelCount < 1 || labelCount > 500}>
          {busy ? 'Creating PDF…' : 'Open PDF'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default LabelPrintModal;
