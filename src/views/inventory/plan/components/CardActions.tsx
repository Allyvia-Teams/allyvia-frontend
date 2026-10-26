// What she can do on a card of her memo (owner only): her number (Record, or Use ours to clear it), Exclude,
// and See the numbers. Presentational: the page owns the calls; this owns only what she is typing.

import { useState } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { CardView } from '../memo';
import type { RecordState } from '../record';

interface Props {
  card: CardView;
  record: RecordState;
  /** The page read the card and its line again and they still disagree: say so, and offer to read again. */
  stuck?: boolean;
  onReread?: () => void;
  busy: boolean;
  message: { tone: 'info' | 'error'; text: string } | null;
  canEdit: boolean;
  canSee: boolean;
  seeOpen: boolean;
  onRecord: (qty: string, note: string) => void;
  onUseOurs: () => void;
  onExclude: () => void;
  onSeeNumbers: () => void;
}

export default function CardActions({
  card,
  record,
  stuck = false,
  onReread,
  busy,
  message,
  canEdit,
  canSee,
  seeOpen,
  onRecord,
  onUseOurs,
  onExclude,
  onSeeNumbers
}: Props) {
  const [qty, setQty] = useState(record.prefill.qty);
  const [note, setNote] = useState(record.prefill.note);
  const [prefillFor, setPrefillFor] = useState(`${record.prefill.qty}|${record.prefill.note}`);
  // A new decision from elsewhere (a confirm card, another tab) refills the fields; her typing is kept otherwise.
  const key = `${record.prefill.qty}|${record.prefill.note}`;
  if (key !== prefillFor) {
    setPrefillFor(key);
    setQty(record.prefill.qty);
    setNote(record.prefill.note);
  }
  const showRecord = record.enabled || record.refetch || Boolean(record.blocked);

  return (
    <Box>
      {showRecord ? (
        <Box
          component="form"
          onSubmit={(event) => {
            event.preventDefault();
            if (record.enabled && !busy) onRecord(qty, note);
          }}
          sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', alignItems: 'flex-start' }}
        >
          <TextField
            size="small"
            label="Your number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'aria-label': `Your number for ${card.name}` } }}
            sx={{ width: 120 }}
            disabled={!record.enabled || busy}
          />
          <TextField
            size="small"
            label="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ flex: '1 1 180px' }}
            disabled={!record.enabled || busy}
          />
          <Button type="submit" variant="contained" size="small" disabled={!record.enabled || busy} sx={{ height: 40 }}>
            Record
          </Button>
          {record.prefill.decided ? (
            <Button size="small" variant="text" onClick={onUseOurs} disabled={busy} sx={{ height: 40 }}>
              Use ours
            </Button>
          ) : null}
        </Box>
      ) : null}
      {record.blocked ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          {record.blocked}
        </Typography>
      ) : null}
      {record.refetch && !stuck ? (
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
          This card is catching up with the latest sizing; Record is back in a moment.
        </Typography>
      ) : null}
      {record.refetch && stuck ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary" component="p">
            This card is from before the latest sizing.
          </Typography>
          {onReread ? (
            <Button size="small" variant="text" onClick={onReread}>
              Read again
            </Button>
          ) : null}
        </Box>
      ) : null}
      {/* Mounted empty, so a sentence that arrives is announced. */}
      <Typography
        variant="body2"
        role="status"
        color={message?.tone === 'error' ? 'error' : 'text.secondary'}
        sx={{ mt: message ? 0.75 : 0 }}
      >
        {message?.text ?? ''}
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
        {canEdit ? (
          <Button size="small" variant="outlined" color="inherit" onClick={onExclude} disabled={busy}>
            Exclude
          </Button>
        ) : null}
        {canSee ? (
          <Button size="small" variant="text" onClick={onSeeNumbers} aria-expanded={seeOpen}>
            {seeOpen ? 'Hide the numbers' : 'See the numbers'}
          </Button>
        ) : null}
      </Box>
    </Box>
  );
}
