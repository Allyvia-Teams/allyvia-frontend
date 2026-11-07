import { Box, ButtonBase } from '@mui/material';

import type { CategoryChip, CategoryFilter } from '../insightsView';

interface CategoryChipsProps {
  chips: readonly CategoryChip[];
  selected: CategoryFilter;
  onSelect: (key: CategoryFilter) => void;
}

/**
 * Filter chips with a count badge. Toggle buttons with aria-pressed, the
 * pattern the repo already uses (SidebarBrand, Header, settings pickers), so
 * each chip is a real button in the tab order and announces whether it is on.
 */
export default function CategoryChips({ chips, selected, onSelect }: CategoryChipsProps) {
  return (
    <Box role="group" aria-label="Filter recommendations by category" sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
      {chips.map((chip) => {
        const on = chip.key === selected;
        return (
          <ButtonBase
            key={chip.key}
            onClick={() => onSelect(chip.key)}
            aria-pressed={on}
            data-chip={chip.key}
            sx={(theme) => ({
              gap: 1,
              height: 34,
              px: 1.5,
              borderRadius: 999,
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: on ? theme.palette.grey[900] : theme.palette.divider,
              bgcolor: on ? theme.palette.grey[900] : theme.palette.background.paper,
              color: on ? theme.palette.common.white : theme.palette.text.primary,
              '&.Mui-focusVisible': { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 }
            })}
          >
            {chip.label}
            <Box
              component="span"
              sx={(theme) => ({
                minWidth: 20,
                height: 20,
                px: 0.75,
                borderRadius: 999,
                fontSize: '0.75rem',
                lineHeight: '20px',
                textAlign: 'center',
                bgcolor: on ? 'rgba(255,255,255,0.2)' : theme.palette.grey[100],
                color: on ? theme.palette.common.white : theme.palette.text.secondary
              })}
            >
              {chip.count}
            </Box>
          </ButtonBase>
        );
      })}
    </Box>
  );
}
