import { Box, Chip } from '@mui/material';
import React from 'react';

import type { POSCategory } from '../types/pos.types';

export interface CategoryFilterProps {
  categories: POSCategory[];
  activeCategoryId: string; // 'all' or category id
  onChange: (nextId: string) => void;
}

const ALL_ID = 'all';

export default function CategoryFilter({ categories, activeCategoryId, onChange }: CategoryFilterProps) {
  const items = [{ id: ALL_ID, name: 'All' }, ...categories.map((c) => ({ id: c.id, name: c.name }))];

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1,
        overflowX: 'auto',
        pb: 0.5,
        '&::-webkit-scrollbar': { height: 4 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'divider', borderRadius: 2 }
      }}
    >
      {items.map((item) => {
        const selected = activeCategoryId === item.id;
        return (
          <Chip
            key={item.id}
            label={item.name}
            onClick={() => onChange(item.id)}
            variant={selected ? 'filled' : 'outlined'}
            sx={{
              flexShrink: 0,
              borderRadius: '8px',
              fontWeight: selected ? 600 : 500,
              bgcolor: selected ? 'primary.light' : 'transparent',
              color: selected ? 'primary.dark' : 'text.secondary',
              borderColor: selected ? 'primary.light' : 'divider',
              '&:hover': {
                bgcolor: selected ? 'primary.light' : 'action.hover'
              }
            }}
          />
        );
      })}
    </Box>
  );
}
