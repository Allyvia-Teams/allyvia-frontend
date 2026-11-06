// Store names in the files that match no store: map each to one (never minted).

import { useState } from 'react';

import Button from '@mui/material/Button';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import type { BulkDrop, HeldLocation } from 'api/importDrops.api';

import { releaseInProgress, releaseSentence } from './importDrop';
import { useMapLocation, useStores } from './useImportDrops';

function heldCount(held: HeldLocation): string {
  const parts = [];
  if (held.order) parts.push(`${held.order} ${held.order === 1 ? 'sale' : 'sales'}`);
  if (held.inventory_level) parts.push(`${held.inventory_level} stock ${held.inventory_level === 1 ? 'row' : 'rows'}`);
  return parts.join(' and ') || 'rows';
}

/** A mapped name whose rows a worker job is importing: progress instead of the Map control. */
function Releasing({ held }: { held: HeldLocation }) {
  const release = held.release!;
  const failed = release.state === 'failed';
  const value = release.total ? Math.min(100, (100 * release.done) / release.total) : 0;
  return (
    <Stack spacing={0.75} sx={{ flex: 1, minWidth: 220 }}>
      <Typography variant="body2" color={failed ? 'error' : 'text.secondary'}>
        {releaseSentence(release)}
      </Typography>
      {releaseInProgress(release) ? (
        <LinearProgress
          variant={release.state === 'running' ? 'determinate' : 'indeterminate'}
          value={value}
          aria-label={`Importing ${held.label}`}
        />
      ) : null}
    </Stack>
  );
}

function HeldRow({ drop, held }: { drop: BulkDrop; held: HeldLocation }) {
  const stores = useStores(drop.connection_id);
  const mapLocation = useMapLocation(drop.id);
  // The company's only store, when this name holds most of the file: preselected, never mapped for the merchant.
  const [storeId, setStoreId] = useState(held.suggested_location_id ?? '');
  const choices = (stores.data ?? []).filter((store) => store.is_active && store.kind === 'store');
  // Until the store list arrives, a preselected id has no option to show.
  const value = choices.some((store) => store.id === storeId) ? storeId : '';
  if (held.release && held.release.state !== 'failed' && held.release.state !== 'done') {
    return (
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
        <Typography variant="body2" sx={{ minWidth: 220 }}>
          “{held.label}”
        </Typography>
        <Releasing held={held} />
      </Stack>
    );
  }
  return (
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
      <Typography variant="body2" sx={{ minWidth: 220 }}>
        “{held.label}” — {heldCount(held)} waiting
      </Typography>
      <TextField
        select
        size="small"
        label="Is store"
        value={value}
        onChange={(event) => setStoreId(event.target.value)}
        sx={{ minWidth: 200 }}
      >
        {choices.map((store) => (
          <MenuItem key={store.id} value={store.id}>
            {store.name}
          </MenuItem>
        ))}
      </TextField>
      <Button
        variant="outlined"
        size="small"
        disabled={!value || !drop.connection_id || mapLocation.isPending}
        onClick={() => mapLocation.mutate({ connectionId: drop.connection_id as string, name: held.label, locationId: value })}
      >
        {mapLocation.isPending ? 'Mapping…' : 'Map'}
      </Button>
      {held.release?.state === 'failed' ? <Releasing held={held} /> : null}
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
