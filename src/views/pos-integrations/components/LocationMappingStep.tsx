// "Your locations": which Allyvia store each of the provider's locations
// imports into.
//
// Used twice: as a step of the connect wizard, before the first import, and on
// the connection's settings screen, where a location opened after the import
// (or one the merchant chose not to import) can be mapped later. Every choice
// is saved as it is made rather than on a final button: mapping releases any
// rows already held for that location, and that should not wait on the
// merchant finding a Save button.

import { useEffect } from 'react';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import ListSubheader from '@mui/material/ListSubheader';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';

import type { ConnectionLocations, ProviderLocationRow } from 'api/posIntegrations.api';
import { useLocations, useMapLocation } from '../hooks/usePosIntegrations';
import {
  addressLine,
  choicePayload,
  currentChoice,
  heldLabel,
  NEW_STORE,
  newStoreNameTaken,
  SKIP,
  storesFor,
  summarize
} from '../locationMapping';

interface Props {
  connectionId: string;
  providerLabel: string;
  /** Re-read the provider's location list before showing it (the wizard does). */
  refresh?: boolean;
  /** Called with the latest listing, so a parent can gate its Continue button. */
  onLoaded?: (locations: ConnectionLocations) => void;
}

export default function LocationMappingStep({ connectionId, providerLabel, refresh = false, onLoaded }: Props) {
  const { data, isLoading, isError } = useLocations(connectionId, { refresh });
  const mapLocation = useMapLocation(connectionId);

  useEffect(() => {
    if (data && onLoaded) onLoaded(data);
  }, [data, onLoaded]);

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  if (isError || !data) {
    return <Alert severity="error">Could not read your {providerLabel} locations. Reload the page to try again.</Alert>;
  }

  const rows = data.locations;
  if (!rows.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        {providerLabel} did not report any locations, so everything imports into your store.
      </Typography>
    );
  }

  const summary = summarize(rows);
  const held = rows.filter((row) => heldLabel(row.held));

  const choose = (row: ProviderLocationRow, value: string) => {
    const payload = choicePayload(value, row);
    if (!payload) return;
    mapLocation.mutate({ provider_location_id: row.provider_location_id, ...payload });
  };

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Pick the Allyvia store each {providerLabel} location’s sales and stock should go into. Choose an existing store, create a new one
        with the same name, or leave a location out. A location you leave out is not lost: its sales and stock wait, and you can map it
        later from this connection’s settings.
      </Typography>

      {summary.undecided > 0 ? (
        <Alert severity="warning">
          {summary.undecided === 1 ? 'One open location still needs' : `${summary.undecided} open locations still need`} a store before the
          import can start.
        </Alert>
      ) : (
        <Alert severity="success">
          {summary.mapped} location{summary.mapped === 1 ? '' : 's'} will import
          {summary.skipped ? `, ${summary.skipped} left out` : ''}.
        </Alert>
      )}

      {held.length > 0 && (
        <Alert severity="info">
          Waiting for a store: {held.map((row) => `${row.name} (${heldLabel(row.held)})`).join('; ')}. Choosing a store for a location
          brings its waiting rows in.
        </Alert>
      )}

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>{providerLabel} location</TableCell>
              <TableCell sx={{ minWidth: 240 }}>Imports into</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const value = currentChoice(row);
              const offered = storesFor(row, rows, data.stores);
              const nameTaken = newStoreNameTaken(row, data.stores);
              return (
                <TableRow key={row.provider_location_id} hover>
                  <TableCell>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                      <Typography variant="subtitle2">{row.name}</Typography>
                      {!row.is_active && <Chip size="small" variant="outlined" label="Closed" />}
                      {row.mapping === 'auto' && <Chip size="small" variant="outlined" color="info" label="Matched automatically" />}
                    </Stack>
                    {addressLine(row) && (
                      <Typography variant="caption" color="text.secondary">
                        {addressLine(row)}
                      </Typography>
                    )}
                    {!row.is_active && !row.store && (
                      <Typography variant="caption" color="text.secondary" display="block">
                        Closed in {providerLabel}. Any past sales or stock it still holds wait until you choose a store.
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <FormControl fullWidth size="small" error={row.needs_decision}>
                      <Select
                        value={value}
                        displayEmpty
                        disabled={mapLocation.isPending}
                        onChange={(event) => choose(row, event.target.value)}
                        renderValue={(selected) => {
                          if (!selected) return <em>Choose a store</em>;
                          if (selected === SKIP) return 'Don’t import this location';
                          return data.stores.find((store) => store.id === selected)?.name ?? row.store?.name ?? '';
                        }}
                      >
                        {offered.length > 0 && <ListSubheader>Your stores</ListSubheader>}
                        {offered.map((store) => (
                          <MenuItem key={store.id} value={store.id}>
                            {store.name}
                          </MenuItem>
                        ))}
                        <Divider />
                        <MenuItem value={NEW_STORE} disabled={nameTaken || Boolean(row.store)}>
                          {nameTaken ? `A store named “${row.name}” already exists` : `Create a new store “${row.name}”`}
                        </MenuItem>
                        <MenuItem value={SKIP} disabled={Boolean(row.store)}>
                          Don’t import this location
                        </MenuItem>
                      </Select>
                    </FormControl>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
}
