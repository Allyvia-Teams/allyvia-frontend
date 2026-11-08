// views/inventory/workspace/WorkspaceHeader.tsx
//
// The workspace's right-hand controls: one scan/search field, the tab's two
// actions, and (I1 only) a Setup menu for the two pages Settings will absorb.
// In I1 the field only hands its text to Stock's search; I3 resolves a
// scanned barcode to its item.

import { lazy, useState, type KeyboardEvent } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';

import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { IconDotsVertical } from '@tabler/icons-react';

import Loadable from 'ui-component/Loadable';
import { useSelector } from 'store';

import { canOpenPlan } from '../flowLinks';
import { inventoryHref, type InventoryTab } from '../tabs';

const NewStyleDialog = Loadable(lazy(() => import('views/inventory/NewStyleDialog')));

export const SCAN_PLACEHOLDER = 'Scan a tag or type a style, SKU or barcode';

export interface WorkspaceHeaderProps {
  tab: InventoryTab;
}

export default function WorkspaceHeader({ tab }: WorkspaceHeaderProps) {
  const navigate = useNavigate();
  const roleType = useSelector((s) => s.auth?.currentRole?.role_type as string | undefined);
  const [scan, setScan] = useState('');
  const [styleOpen, setStyleOpen] = useState(false);
  const [setupAnchor, setSetupAnchor] = useState<HTMLElement | null>(null);

  const onScanKey = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return;
    const q = scan.trim();
    if (!q) return;
    event.preventDefault();
    navigate(inventoryHref('stock', null, { q }));
  };

  let actions;
  if (tab === 'buying') {
    actions = (
      <>
        {canOpenPlan(roleType) ? (
          <Button size="small" variant="outlined" component={RouterLink} to={inventoryHref('buying', 'plan', { new: '1' })}>
            New plan from a line sheet
          </Button>
        ) : null}
        <Button size="small" variant="contained" component={RouterLink} to="/inventory/purchase-orders/new">
          New purchase order
        </Button>
      </>
    );
  } else if (tab === 'counts') {
    actions = (
      <>
        <Button size="small" variant="outlined" component={RouterLink} to={inventoryHref('counts', 'transfers', { new: '1' })}>
          New transfer
        </Button>
        <Button size="small" variant="contained" component={RouterLink} to={inventoryHref('counts', 'counts', { new: '1' })}>
          Start a count
        </Button>
      </>
    );
  } else {
    actions = (
      <>
        <Button size="small" variant="outlined" onClick={() => setStyleOpen(true)}>
          New style
        </Button>
        <Button size="small" variant="contained" component={RouterLink} to="/inventory/update">
          Receive delivery
        </Button>
      </>
    );
  }

  return (
    <>
      <TextField
        size="small"
        value={scan}
        onChange={(event) => setScan(event.target.value)}
        onKeyDown={onScanKey}
        placeholder={SCAN_PLACEHOLDER}
        slotProps={{ htmlInput: { 'aria-label': SCAN_PLACEHOLDER } }}
        sx={{ width: { xs: '100%', sm: 320 } }}
      />
      {actions}
      {/* I1 only: I5 moves these into Settings › Inventory and removes this menu. */}
      <IconButton size="small" aria-label="Setup" onClick={(event) => setSetupAnchor(event.currentTarget)}>
        <IconDotsVertical size={18} />
      </IconButton>
      <Menu anchorEl={setupAnchor} open={setupAnchor !== null} onClose={() => setSetupAnchor(null)}>
        <MenuItem component={RouterLink} to="/inventory/locations" onClick={() => setSetupAnchor(null)}>
          Locations
        </MenuItem>
        <MenuItem component={RouterLink} to="/inventory/size-scales" onClick={() => setSetupAnchor(null)}>
          Size scales
        </MenuItem>
      </Menu>
      {styleOpen ? <NewStyleDialog open onClose={() => setStyleOpen(false)} onCreated={() => setStyleOpen(false)} /> : null}
    </>
  );
}
