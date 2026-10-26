// A card the assistant proposes (design §8 as B6 built it). Nothing is written until she confirms; Confirm sends
// the card's own call. A decision card takes her note. A what-if card is dashed and saves nothing; its optional
// Record is its own decision call.

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import visuallyHidden from '@mui/utils/visuallyHidden';

import type { CardState } from '../chat';

interface Props {
  state: CardState;
  onConfirm: (which: 'confirm' | 'record') => void;
  onDismiss: () => void;
  onNote: (note: string) => void;
}

const qtyWords = (side: Record<string, unknown>): string | null => {
  if (side.excluded === true) return 'Left out';
  if (side.excluded === false && side.qty === undefined) return 'In the plan';
  if (typeof side.qty !== 'number') return null;
  const range = typeof side.low === 'number' && typeof side.high === 'number' ? ` (${side.low}–${side.high})` : '';
  return `${side.qty}${range}`;
};

const STATUS_WORDS: Record<string, string> = {
  confirming: 'Saving…',
  confirmed: 'Done',
  dismissed: 'Not now',
  ended: 'This card no longer applies'
};

export default function ConfirmCard({ state, onConfirm, onDismiss, onNote }: Props) {
  const { card, status, sentence } = state;
  const whatIf = card.kind === 'whatif';
  const before = qtyWords(card.before || {});
  const after = qtyWords(card.after || {});
  const open = status === 'proposed';

  return (
    <Box
      data-card-kind={card.kind}
      sx={(theme) => ({
        border: '1px',
        borderStyle: whatIf ? 'dashed' : 'solid',
        borderColor: whatIf ? 'text.disabled' : alpha(theme.palette.primary.main, 0.4),
        borderRadius: '10px',
        p: '12px',
        bgcolor: whatIf ? 'transparent' : alpha(theme.palette.primary.main, 0.03),
        opacity: status === 'dismissed' || status === 'ended' ? 0.7 : 1
      })}
    >
      {whatIf ? (
        <Typography variant="overline" color="text.secondary" component="div" sx={{ lineHeight: 1.6 }}>
          What-if · not saved
        </Typography>
      ) : null}
      {card.line ? <Typography sx={{ fontWeight: 600, fontSize: '0.875rem' }}>{card.line}</Typography> : null}
      <Typography variant="body2" sx={{ mt: 0.25 }}>
        {card.sentence}
      </Typography>
      {before !== null && after !== null ? (
        <Typography sx={{ mt: 0.5, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
          {before} <span aria-hidden="true">→</span>
          <span style={visuallyHidden}>to</span> {after}
        </Typography>
      ) : null}
      {card.kind === 'decision' && open ? (
        <TextField
          size="small"
          fullWidth
          label="Your note (optional)"
          value={state.note}
          onChange={(e) => onNote(e.target.value)}
          sx={{ mt: 1 }}
        />
      ) : null}
      {whatIf && card.record?.sentence ? (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.75 }}>
          {card.record.sentence}
        </Typography>
      ) : null}
      {whatIf && card.record && open ? (
        <TextField
          size="small"
          fullWidth
          label="Your note if you record it (optional)"
          value={state.note}
          onChange={(e) => onNote(e.target.value)}
          sx={{ mt: 1 }}
        />
      ) : null}
      {/* Mounted empty, so a sentence that arrives is announced. */}
      <Typography variant="body2" role="status" color={status === 'ended' ? 'text.secondary' : 'error'} sx={{ mt: sentence ? 0.75 : 0 }}>
        {sentence ?? ''}
      </Typography>
      {open ? (
        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
          {!whatIf && card.confirm ? (
            <Button size="small" variant="contained" onClick={() => onConfirm('confirm')}>
              Confirm
            </Button>
          ) : null}
          {whatIf && card.record ? (
            <Button size="small" variant="outlined" onClick={() => onConfirm('record')}>
              Record
            </Button>
          ) : null}
          <Button size="small" variant="text" color="inherit" onClick={onDismiss}>
            {whatIf ? 'Close' : 'Not now'}
          </Button>
        </Box>
      ) : (
        <Typography variant="caption" color="text.secondary" component="div" sx={{ mt: 0.75 }}>
          {STATUS_WORDS[status] ?? ''}
        </Typography>
      )}
    </Box>
  );
}
