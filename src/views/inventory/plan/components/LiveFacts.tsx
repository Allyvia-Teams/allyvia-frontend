// What has happened since the plan froze (design §16.6, B8's live facts): when it froze, the purchase orders
// made from it, the deliveries matched back to its lines (each with Unlink), and what is still to come.

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import type { Live } from 'api/buying.api';

interface Props {
  live: Live;
  names: Record<string, string>;
  busy: boolean;
  onUnlink: (path: string) => void;
}

const when = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function LiveFacts({ live, names, busy, onUnlink }: Props) {
  if (!live.frozen_at && !live.orders.length && !live.matches.length && !live.waiting) return null;
  return (
    <Box sx={{ mt: '16px', border: '1px solid', borderColor: 'divider', borderRadius: '10px', p: '14px', bgcolor: 'background.paper' }}>
      {live.frozen_at ? <Typography sx={{ fontWeight: 600 }}>Frozen {when(live.frozen_at)}</Typography> : null}
      {live.orders.length ? (
        <Stack spacing={0.25} sx={{ mt: 1 }}>
          {live.orders.map((o) => (
            <Typography key={`${o.line_id}-${o.po_number}`} variant="body2">
              {names[o.line_id] ?? 'A line'}: {o.po_number} ({o.po_status})
            </Typography>
          ))}
        </Stack>
      ) : null}
      {live.matches.length ? (
        <Stack spacing={0.5} sx={{ mt: 1 }}>
          {live.matches.map((m) => (
            <Box key={`${m.line_id}-${m.product_id}`} sx={{ display: 'flex', gap: 1, alignItems: 'baseline', flexWrap: 'wrap' }}>
              <Typography variant="body2" sx={{ flex: 1 }}>
                {m.sentence}
              </Typography>
              {live.actions.link ? (
                <Button size="small" variant="text" onClick={() => onUnlink(m.unlink)} disabled={busy}>
                  Unlink
                </Button>
              ) : null}
            </Box>
          ))}
        </Stack>
      ) : null}
      {live.waiting ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {live.waiting}
        </Typography>
      ) : null}
    </Box>
  );
}
