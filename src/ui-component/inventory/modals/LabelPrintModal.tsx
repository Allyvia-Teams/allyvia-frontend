import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, TextField, Box, Typography } from '@mui/material';
import { getLabelSpecs, renderLabels } from 'api/inventory.api';
import { InventoryItem, LabelSpec } from 'types/inventory';

interface Props { open: boolean; onClose: () => void; items: InventoryItem[]; }

const LabelPrintModal: React.FC<Props> = ({ open, onClose, items }) => {
  const [specs, setSpecs] = React.useState<LabelSpec[]>([]);
  const [spec, setSpec] = React.useState('');
  const [quantities, setQuantities] = React.useState<Record<string, number>>({});
  const [offset, setOffset] = React.useState(0);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { if (open) getLabelSpecs().then((v) => { setSpecs(v); if (!spec && v[0]) setSpec(v[0].name); }).catch(() => setSpecs([])); }, [open]);
  React.useEffect(() => { if (open) setQuantities(Object.fromEntries(items.map((i) => [String(i.id), Math.max(1, i.quantity_on_hand || 1)]))); }, [open, items]);
  const selected = specs.find((s) => s.name === spec);
  const isAvery = selected?.kind === 'avery' || /avery/i.test(spec);
  const submit = async () => {
    setBusy(true);
    try {
      const blob = await renderLabels({ spec_name: spec, start_offset: isAvery ? offset : 0, items: items.map((i) => ({ item_id: String(i.id), quantity: quantities[String(i.id)] || 1 })) });
      const url = URL.createObjectURL(blob); window.open(url, '_blank', 'noopener,noreferrer'); window.setTimeout(() => URL.revokeObjectURL(url), 60000); onClose();
    } finally { setBusy(false); }
  };
  return <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>Print labels</DialogTitle>
    <DialogContent>
      <FormControl fullWidth size="small" sx={{ mt: 1 }}><InputLabel>Layout</InputLabel><Select value={spec} label="Layout" onChange={(e) => { setSpec(e.target.value); setOffset(0); }}>{specs.map((s) => <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>)}</Select></FormControl>
      {items.map((item) => <TextField key={item.id} fullWidth size="small" type="number" label={`${item.name} quantity`} value={quantities[String(item.id)] || 1} onChange={(e) => setQuantities((q) => ({ ...q, [String(item.id)]: Math.max(1, Number(e.target.value) || 1) }))} sx={{ mt: 2 }} />)}
      {isAvery && <Box sx={{ mt: 2 }}><Typography variant="caption">Start cell</Typography><Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: .5, mt: 1 }}>{Array.from({ length: 30 }, (_, i) => <Button key={i} size="small" variant={offset === i ? 'contained' : 'outlined'} onClick={() => setOffset(i)}>{i + 1}</Button>)}</Box></Box>}
    </DialogContent>
    <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" onClick={submit} disabled={!spec || busy}>Open PDF</Button></DialogActions>
  </Dialog>;
};
export default LabelPrintModal;
