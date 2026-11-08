import { Box, ButtonBase } from '@mui/material';

import type { CategoryChip, CategoryFilter } from '../insightsView';

interface CategoryChipsProps {
  chips: readonly CategoryChip[];
  selected: CategoryFilter;
  onSelect: (key: CategoryFilter) => void;
}

/** "Inventory, 1 recommendation": the label and count run together otherwise ("Inventory1"). */
export const chipAccessibleName = ({ label, count }: Pick<CategoryChip, 'label' | 'count'>) =>
  `${label}, ${count} ${count === 1 ? 'recommendation' : 'recommendations'}`;

/**
 * Filter chips with a count badge. Toggle buttons with aria-pressed, the
 * pattern the repo already uses (SidebarBrand, Header, settings pickers), so
 * each chip is a real button in the tab order and announces whether it is on.
 *
 * Below md (768px) the chips stay on one row and scroll sideways; from md up
 * they wrap. Focus uses the theme's ButtonBase ring.
 */
export default function CategoryChips({ chips, selected, onSelect }: CategoryChipsProps) {
  return (
    <Box
      role="group"
      aria-label="Filter recommendations by category"
      data-chip-row
      sx={{
        display: 'flex',
        flexWrap: { xs: 'nowrap', md: 'wrap' },
        gap: 1,
        overflowX: { xs: 'auto', md: 'visible' },
        // Room for the focus ring, which overflow would otherwise clip.
        p: '5px',
        m: '-5px',
        scrollbarWidth: 'none',
        '&::-webkit-scrollbar': { display: 'none' }
      }}
    >
      {chips.map((chip) => {
        const on = chip.key === selected;
        return (
          <ButtonBase
            key={chip.key}
            onClick={() => onSelect(chip.key)}
            aria-pressed={on}
            aria-label={chipAccessibleName(chip)}
            data-chip={chip.key}
            sx={(theme) => ({
              flexShrink: 0,
              whiteSpace: 'nowrap',
              gap: 1,
              height: 36,
              px: 1.5,
              borderRadius: 999,
              fontSize: '0.875rem',
              fontWeight: 600,
              border: '1px solid',
              borderColor: on ? theme.palette.grey[900] : theme.palette.divider,
              bgcolor: on ? theme.palette.grey[900] : theme.palette.background.paper,
              color: on ? theme.palette.common.white : theme.palette.text.primary
            })}
          >
            {chip.label}
            <Box
              component="span"
              aria-hidden
              data-chip-count
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
