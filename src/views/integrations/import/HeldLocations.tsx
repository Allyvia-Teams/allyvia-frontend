// Store names in the files that match no store: map each to one (never minted).

import { useState } from 'react';

import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { BulkDrop, HeldLocation } from 'api/importDrops.api';

import { useMapLocation, useStores } from './useImportDrops';

function heldCount(held: HeldLocation): string {
  const parts = [];
  if (held.order) parts.push(`${held.order} ${held.order === 1 ? 'sale' : 'sales'}`);
  if (held.inventory_level) parts.push(`${held.inventory_level} stock ${held.inventory_level === 1 ? 'row' : 'rows'}`);
  return parts.join(' and ') || 'rows';
}

function HeldRow({ drop, held }: { drop: BulkDrop; held: HeldLocation }) {
  const stores = useStores(drop.connection_id);
  const mapLocation = useMapLocation(drop.id);
  const [storeId, setStoreId] = useState('');
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <Typography variant="body2" sx={{ minWidth: 220 }}>
        “{held.label}” — {heldCount(held)} waiting
      </Typography>
      <TextField
        select
        size="small"
        label="Is store"
        value={storeId}
        onChange={(event) => setStoreId(event.target.value)}
        sx={{ minWidth: 200 }}
      >
        {(stores.data ?? [])
          .filter((store) => store.is_active && store.kind === 'store')
          .map((store) => (
            <MenuItem key={store.id} value={store.id}>
              {store.name}
            </MenuItem>
          ))}
      </TextField>
      <Button
        variant="outlined"
        size="small"
        disabled={!storeId || !drop.connection_id || mapLocation.isPending}
        onClick={() => mapLocation.mutate({ connectionId: drop.connection_id as string, name: held.label, locationId: storeId })}
      >
        Map
      </Button>
    </Stack>
  );
}

export default function HeldLocations({ drop }: { drop: BulkDrop }) {
  if (!drop.held_locations.length) return null;
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        These store names match none of your stores, so their rows are held rather than guessed. Map each one; the held rows then import to
        that store.
      </Typography>
      {drop.held_locations.map((held) => (
        <HeldRow key={`${held.kind}:${held.value}`} drop={drop} held={held} />
      ))}
    </Stack>
  );
}
