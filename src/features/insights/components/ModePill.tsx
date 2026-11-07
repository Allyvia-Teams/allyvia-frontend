import { useState, type MouseEvent } from 'react';

import { Box, ButtonBase, ListItemText, Menu, MenuItem } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import { IconCheck, IconChevronDown } from '@tabler/icons-react';

import type { InsightsPayload } from '../types';
import { pinIcon } from './pinIcon';

export type InsightsMode = InsightsPayload['mode'];

export const MODE_LABELS: Record<InsightsMode, string> = { save: 'Save mode', growth: 'Growth mode' };

const MODES: InsightsMode[] = ['save', 'growth'];

interface ModePillProps {
  mode: InsightsMode;
  onChange: (mode: InsightsMode) => void;
}

/** "Save mode" (amber) / "Growth mode" (green) with a menu to switch. */
export default function ModePill({ mode, onChange }: ModePillProps) {
  const theme = useTheme();
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const tone = mode === 'save' ? theme.palette.warning : theme.palette.success;

  const choose = (next: InsightsMode) => {
    setAnchor(null);
    if (next !== mode) onChange(next);
  };

  return (
    <>
      <ButtonBase
        onClick={(event: MouseEvent<HTMLElement>) => setAnchor(event.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={anchor ? true : undefined}
        aria-label={`${MODE_LABELS[mode]}, change mode`}
        data-mode={mode}
        sx={{
          ...pinIcon(16),
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
        <IconChevronDown size={16} aria-hidden />
      </ButtonBase>
      <Menu
        anchorEl={anchor}
        open={Boolean(anchor)}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        {MODES.map((option) => (
          <MenuItem key={option} selected={option === mode} onClick={() => choose(option)} sx={pinIcon(16)}>
            <ListItemText>{MODE_LABELS[option]}</ListItemText>
            {option === mode && <IconCheck size={16} aria-hidden />}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
