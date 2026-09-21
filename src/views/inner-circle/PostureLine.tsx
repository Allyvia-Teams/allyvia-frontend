import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import type { OutreachHealth } from 'api/innerCircle.api';
import { buildPostureLine, postureChipColor } from './recommendationCards';

// ==============================|| INNER CIRCLE - POSTURE LINE ||============================== //
// Design §3.1: the first thing on This week. A chip naming the mode, one
// sentence giving the figures behind it, and — only when the score is
// provisional — how many of the five signals fired, with a tooltip naming what
// did not.
//
// Composition only. Every word, every omission and the chip's tone come from
// `buildPostureLine`, which is tested: a figure the backend did not send is
// dropped there rather than reaching this file as "0 days" or "NaN%".

export default function PostureLine({ health }: { health: OutreachHealth }) {
  const line = buildPostureLine(health);

  return (
    <Box sx={{ display: 'flex', alignItems: 'baseline', flexWrap: 'wrap', gap: 1, mb: 2 }}>
      <Chip size="small" label={line.chip} color={postureChipColor(line.tone)} sx={{ fontWeight: 600 }} />
      {line.text ? (
        <Typography component="p" sx={{ fontSize: '0.9375rem', lineHeight: 1.5, color: 'text.primary', textWrap: 'pretty', flex: 1 }}>
          {line.text}
        </Typography>
      ) : null}
      {/* The caveat is a separate node, not appended to the sentence, so the
          tooltip attaches to the clause it qualifies rather than to the whole
          reading. A provisional score with nothing missing is impossible, so
          the two always arrive together — but `caveatTooltip` is still checked
          on its own: a tooltip with no title renders an unexplained dotted
          underline, which is worse than no caveat at all. */}
      {line.caveat ? (
        line.caveatTooltip ? (
          <Tooltip title={line.caveatTooltip} placement="top" arrow>
            <Typography
              component="span"
              sx={{
                fontSize: '0.8125rem',
                color: 'text.disabled',
                cursor: 'help',
                textDecoration: 'underline dotted',
                textDecorationColor: 'divider',
                whiteSpace: 'nowrap'
              }}
            >
              {line.caveat}
            </Typography>
          </Tooltip>
        ) : (
          <Typography component="span" sx={{ fontSize: '0.8125rem', color: 'text.disabled', whiteSpace: 'nowrap' }}>
            {line.caveat}
          </Typography>
        )
      ) : null}
    </Box>
  );
}
