import { Tabs, Tab } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import React from 'react';

import type { POSCategory } from '../types/pos.types';

export interface CategoryFilterProps {
  categories: POSCategory[];
  activeCategoryId: string; // 'all' or category id
  onChange: (nextId: string) => void;
}

const ALL_ID = 'all';

export default function CategoryFilter({ categories, activeCategoryId, onChange }: CategoryFilterProps) {
  const theme = useTheme();

  return (
    <Tabs
      value={activeCategoryId}
      onChange={(_, nextValue) => onChange(String(nextValue))}
      variant="scrollable"
      scrollButtons="auto"
      sx={{
        borderRadius: 1,
        '& .MuiTabs-indicator': { backgroundColor: theme.palette.primary.main },
        '& .MuiTab-root': { textTransform: 'none', minHeight: 40 }
      }}
    >
      <Tab
        value={ALL_ID}
        label="All"
        sx={{
          color: activeCategoryId === ALL_ID ? theme.palette.primary.main : 'text.secondary',
          fontWeight: activeCategoryId === ALL_ID ? 700 : 500
        }}
      />
      {categories.map((c) => (
        <Tab
          key={c.id}
          value={c.id}
          label={c.name}
          sx={{
            color: activeCategoryId === c.id ? theme.palette.primary.main : 'text.secondary',
            fontWeight: activeCategoryId === c.id ? 700 : 500
          }}
        />
      ))}
    </Tabs>
  );
}
