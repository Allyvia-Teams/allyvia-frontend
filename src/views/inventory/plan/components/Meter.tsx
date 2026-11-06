// The range under a card's number: a band from low to high and a mark at the number (meter.ts decides whether
// one is drawn at all; a number outside its own range, a cut line or no number draws nothing).

import Box from '@mui/material/Box';
import { alpha } from '@mui/material/styles';

import { meter, type MeterInput } from '../meter';

export default function Meter({ value, cut = false, label }: { value: MeterInput | null; cut?: boolean; label: string }) {
  const geometry = meter(value, { cut });
  if (!geometry) return null;
  const pct = (x: number) => `${x.toFixed(2)}%`;
  return (
    <Box role="img" aria-label={label} sx={{ position: 'relative', height: 8, width: '100%', maxWidth: 220, mt: '6px' }}>
      <Box sx={{ position: 'absolute', inset: '3px 0', bgcolor: 'divider', borderRadius: 1 }} />
      {geometry.band && (
        <Box
          sx={(theme) => ({
            position: 'absolute',
            top: '1px',
            bottom: '1px',
            left: pct(geometry.band!.left),
            width: pct(geometry.band!.width),
            bgcolor: alpha(theme.palette.primary.main, 0.25),
            borderRadius: 1
          })}
        />
      )}
      <Box sx={{ position: 'absolute', top: 0, bottom: 0, left: pct(geometry.mark), width: '2px', ml: '-1px', bgcolor: 'primary.main' }} />
    </Box>
  );
}
