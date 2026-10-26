// The memo's end (design §10, B7's order): "order from your vendors as you always do", and Create draft POs,
// offered only when the server's preview has groups to draft and refuses nothing. A draft is not money spent.

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { OrderPreview, OrderResult } from 'api/buying.api';

import { amountText } from '../memo';

interface Props {
  preview: OrderPreview | null;
  previewError: string | null;
  result: OrderResult | null;
  error: string | null;
  busy: boolean;
  onPlace: () => void;
}

export default function OrderEndcap({ preview, previewError, result, error, busy, onPlace }: Props) {
  const ready = preview !== null && preview.refused === null && preview.groups.length > 0;
  return (
    <Box component="section" aria-label="Order" sx={{ mt: '32px', pt: '20px', borderTop: '1px solid', borderColor: 'divider' }}>
      <Typography color="text.secondary">
        When you are done, order from your vendors as you always do. Create draft POs puts these quantities in draft purchase orders for you
        to review; a draft is not money spent.
      </Typography>
      {preview?.refused ? (
        <Alert severity="info" sx={{ mt: 1.5 }}>
          {preview.refused.sentence}
        </Alert>
      ) : null}
      {previewError ? (
        <Alert severity="warning" sx={{ mt: 1.5 }}>
          {previewError}
        </Alert>
      ) : null}
      {preview && preview.groups.length ? (
        <Stack spacing={0.5} sx={{ mt: 1.5 }}>
          {preview.groups.map((g) => (
            <Typography key={g.supplier_id} variant="body2">
              <strong>{g.supplier}</strong> · {g.units} units · {amountText(g.cost, 'usd')} at cost
            </Typography>
          ))}
        </Stack>
      ) : null}
      {preview?.skipped.length ? (
        <Stack spacing={0.25} sx={{ mt: 1 }}>
          {preview.skipped.map((s) => (
            <Typography key={s.line_id} variant="caption" color="text.secondary" component="div">
              {s.name}: {s.sentence}
            </Typography>
          ))}
        </Stack>
      ) : null}
      {preview?.drift.length ? (
        <Stack spacing={0.25} sx={{ mt: 1 }}>
          {preview.drift.map((d) => (
            <Typography key={`${d.line_id}-${d.kind}`} variant="caption" color="warning.main" component="div">
              {d.sentence}
            </Typography>
          ))}
        </Stack>
      ) : null}
      {ready ? (
        <Button variant="contained" sx={{ mt: 2 }} onClick={onPlace} disabled={busy}>
          Create draft POs
        </Button>
      ) : null}
      {error ? (
        <Alert severity="error" sx={{ mt: 1.5 }}>
          {error}
        </Alert>
      ) : null}
      {result ? (
        <Stack spacing={0.5} sx={{ mt: 1.5 }} role="status">
          {result.placed.map((p) => (
            <Typography key={p.line_id} variant="body2">
              {p.sentence}
            </Typography>
          ))}
          {result.skipped.map((s) => (
            <Typography key={s.line_id} variant="body2" color="text.secondary">
              {s.sentence}
            </Typography>
          ))}
          {result.stopped ? (
            <Typography variant="body2" color="warning.main">
              {result.stopped}
            </Typography>
          ) : null}
        </Stack>
      ) : null}
    </Box>
  );
}
