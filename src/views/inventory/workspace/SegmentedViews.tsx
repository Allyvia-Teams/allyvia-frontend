// views/inventory/workspace/SegmentedViews.tsx
//
// A tab's sub-views as an exclusive toggle group of links: the URL's ?view=
// is the state, so each button is a link and the selected one comes from it.

import { Link as RouterLink } from 'react-router-dom';

import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';

import { inventoryHref, type InventoryTab } from '../tabs';

export interface SegmentedViewsProps {
  tab: InventoryTab;
  view: string | null;
  options: ReadonlyArray<{ view: string; label: string }>;
  label: string;
}

export default function SegmentedViews({ tab, view, options, label }: SegmentedViewsProps) {
  return (
    <ToggleButtonGroup exclusive size="small" value={view} aria-label={label} sx={{ mb: 2 }}>
      {options.map((option) => (
        <ToggleButton key={option.view} value={option.view} component={RouterLink} to={inventoryHref(tab, option.view)}>
          {option.label}
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}
