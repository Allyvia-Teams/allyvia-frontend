import { Box } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';

import type { InsightsPayload } from '../types';

export type InsightsMode = InsightsPayload['mode'];

export const MODE_LABELS: Record<InsightsMode, string> = { save: 'Save mode', growth: 'Growth mode' };

interface ModePillProps {
  mode: InsightsMode;
}

/** "Save mode" (amber) / "Growth mode" (green). A label only: the mode is the payload's, nothing here changes it. */
export default function ModePill({ mode }: ModePillProps) {
  const theme = useTheme();
  const tone = mode === 'save' ? theme.palette.warning : theme.palette.success;

  return (
    <Box
      component="span"
      data-mode={mode}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1,
        px: 1.5,
        height: 36,
        borderRadius: 999,
        fontSize: '0.875rem',
        fontWeight: 600,
        color: 'text.primary',
        bgcolor: alpha(tone.main, 0.14),
        border: `1px solid ${alpha(tone.main, 0.35)}`
      }}
    >
      <Box component="span" aria-hidden sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: tone.main }} />
      {MODE_LABELS[mode]}
    </Box>
  );
}
