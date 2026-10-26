// "Add styles you already carry" (design §10): pick styles from the catalogue to plan beside the line sheet.
// They are added as lines; the page then offers Re-size (adding runs nothing).

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { listProducts } from 'api/inventoryStock.api';

interface Props {
  open: boolean;
  busy: boolean;
  error: string | null;
  onClose: () => void;
  onAdd: (productIds: string[]) => void;
}

export default function CataloguePicker({ open, busy, error, onClose, onAdd }: Props) {
  const [search, setSearch] = useState('');
  const [chosen, setChosen] = useState<Set<string>>(new Set());
  const products = useQuery({
    queryKey: ['inventory-products', { search }],
    queryFn: () => listProducts(search.trim() ? { search: search.trim() } : {}),
    enabled: open,
    staleTime: 30_000
  });
  const toggle = (id: string) =>
    setChosen((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Add styles you already carry</DialogTitle>
      <DialogContent>
        <TextField fullWidth size="small" label="Search styles" value={search} onChange={(e) => setSearch(e.target.value)} sx={{ mt: 1 }} />
        <Box sx={{ mt: 1.5, maxHeight: 360, overflowY: 'auto' }}>
          {products.isLoading ? <Skeleton variant="rounded" height={160} /> : null}
          {products.isError ? <Typography color="error">The catalogue could not be read.</Typography> : null}
          {products.data && products.data.length === 0 ? <Typography color="text.secondary">No style matches.</Typography> : null}
          <Stack>
            {(products.data ?? []).map((p) => (
              <FormControlLabel
                key={p.id}
                control={<Checkbox checked={chosen.has(p.id)} onChange={() => toggle(p.id)} />}
                label={
                  <span>
                    {p.name}
                    <Typography component="span" variant="caption" color="text.secondary">
                      {[p.brand, p.style_code].filter(Boolean).length ? ` · ${[p.brand, p.style_code].filter(Boolean).join(' · ')}` : ''}
                    </Typography>
                  </span>
                }
              />
            ))}
          </Stack>
        </Box>
        {error ? (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {error}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          variant="contained"
          disabled={chosen.size === 0 || busy}
          onClick={() => {
            onAdd(Array.from(chosen));
            setChosen(new Set());
          }}
        >
          Add {chosen.size || ''} {chosen.size === 1 ? 'style' : 'styles'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
