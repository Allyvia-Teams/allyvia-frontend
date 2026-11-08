// views/inventory/workspace/TabRow.tsx
//
// The workspace's five sections as pill links. The URL is the state, so each
// pill is a plain link to its tab; the selected one is dark and carries
// aria-current. Today and Buying may carry a count; a null count (loading or
// failed) draws no chip rather than a zero.

import { Link as RouterLink } from 'react-router-dom';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';

import { INVENTORY_TABS, TAB_LABELS, inventoryHref, type InventoryTab } from '../tabs';

export interface TabRowProps {
  tab: InventoryTab;
  counts?: Partial<Record<InventoryTab, number | null>>;
}

export default function TabRow({ tab, counts = {} }: TabRowProps) {
  return (
    <Stack component="nav" direction="row" aria-label="Inventory sections" sx={{ gap: 1, flexWrap: 'wrap' }}>
      {INVENTORY_TABS.map((t) => {
        const selected = t === tab;
        const count = counts[t];
        return (
          <Link
            key={t}
            component={RouterLink}
            to={inventoryHref(t)}
            underline="none"
            aria-current={selected ? 'page' : undefined}
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 1,
              height: 40,
              px: 2,
              borderRadius: '999px',
              border: '1px solid',
              borderColor: selected ? 'grey.900' : 'divider',
              bgcolor: selected ? 'grey.900' : 'common.white',
              color: selected ? 'common.white' : 'text.primary',
              fontWeight: selected ? 600 : 500,
              fontSize: '0.875rem',
              whiteSpace: 'nowrap',
              '&:hover': { borderColor: selected ? 'grey.900' : 'grey.400' }
            }}
          >
            {TAB_LABELS[t]}
            {count !== null && count !== undefined ? (
              <Box
                component="span"
                sx={{
                  bgcolor: 'grey.100',
                  color: 'text.primary',
                  borderRadius: '999px',
                  px: 1,
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  lineHeight: '20px'
                }}
              >
                {count}
              </Box>
            ) : null}
          </Link>
        );
      })}
    </Stack>
  );
}
