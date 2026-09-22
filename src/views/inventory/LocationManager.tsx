// views/inventory/LocationManager.tsx
//
// Stock locations: create, rename, mark the default, link to a Stripe Terminal
// location, deactivate.
//
// Two behaviours worth knowing, both enforced by the backend and surfaced here:
//   * The default location cannot be deactivated. Something has to hold stock.
//   * DELETE deactivates rather than deletes, and reports any units left behind —
//     deleting would cascade the stock levels and silently change history.

import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography
} from '@mui/material';
import { IconPlus, IconStar, IconTrash } from '@tabler/icons-react';

import { Location, createLocation, deactivateLocation, listLocations, updateLocation } from 'api/inventoryStock.api';

const errorMessage = (err: unknown, fallback: string): string => {
  const data = (err as { response?: { data?: Record<string, unknown> } })?.response?.data ?? {};
  if (typeof data.detail === 'string') return data.detail;
  const firstField = Object.values(data).find((value) => Array.isArray(value) && value.length);
  if (Array.isArray(firstField)) return String(firstField[0]);
  return fallback;
};

export default function LocationManager() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setLocations(await listLocations());
      setError(null);
    } catch (err) {
      setError(errorMessage(err, 'Could not load locations.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const submitCreate = async () => {
    if (!newName.trim()) return;
    setBusy(true);
    try {
      await createLocation({ name: newName.trim() });
      setCreateOpen(false);
      setNewName('');
      setNotice(null);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not create the location.'));
    } finally {
      setBusy(false);
    }
  };

  const makeDefault = async (location: Location) => {
    setBusy(true);
    try {
      await updateLocation(location.id, { is_default: true });
      setNotice(`${location.name} is now the default location for new sales.`);
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not change the default location.'));
    } finally {
      setBusy(false);
    }
  };

  const deactivate = async (location: Location) => {
    setBusy(true);
    try {
      const updated = await deactivateLocation(location.id);
      setNotice(
        updated.units_remaining
          ? `${location.name} deactivated. ${updated.units_remaining} unit(s) are still recorded there — transfer them out if the stock has moved.`
          : `${location.name} deactivated.`
      );
      await load();
    } catch (err) {
      setError(errorMessage(err, 'Could not deactivate the location.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="h4">Stock locations</Typography>
        <Box flexGrow={1} />
        {(loading || busy) && <CircularProgress size={18} />}
        <Button startIcon={<IconPlus size={16} />} variant="contained" onClick={() => setCreateOpen(true)}>
          Add location
        </Button>
      </Stack>

      <Typography variant="body2" color="text.secondary">
        Stock is tracked per location. A card sale is attributed to the location its reader belongs to; everything else falls back to the
        default.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      {notice && (
        <Alert severity="info" onClose={() => setNotice(null)}>
          {notice}
        </Alert>
      )}

      <TableContainer sx={{ overflowX: 'auto' }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell>Stripe Terminal location</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locations.map((location) => (
              <TableRow key={location.id} hover>
                <TableCell>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{location.name}</Typography>
                    {location.is_default && <Chip size="small" color="primary" label="Default" />}
                  </Stack>
                </TableCell>
                <TableCell>
                  {location.stripe_terminal_display_name || (
                    <Tooltip title="Card sales taken on a reader registered here would attribute to this location automatically.">
                      <Typography variant="caption" color="text.secondary">
                        Not linked
                      </Typography>
                    </Tooltip>
                  )}
                </TableCell>
                <TableCell>
                  <Chip
                    size="small"
                    variant="outlined"
                    color={location.is_active ? 'success' : 'default'}
                    label={location.is_active ? 'Active' : 'Inactive'}
                  />
                </TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {!location.is_default && location.is_active && (
                      <Button size="small" startIcon={<IconStar size={14} />} onClick={() => makeDefault(location)} disabled={busy}>
                        Make default
                      </Button>
                    )}
                    {location.is_active && (
                      <Tooltip
                        title={
                          location.is_default
                            ? 'The default location cannot be deactivated — make another the default first.'
                            : 'Deactivate. History is kept; the location just stops being sellable.'
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            color="error"
                            startIcon={<IconTrash size={14} />}
                            onClick={() => deactivate(location)}
                            disabled={busy || location.is_default}
                          >
                            Deactivate
                          </Button>
                        </span>
                      </Tooltip>
                    )}
                  </Stack>
                </TableCell>
              </TableRow>
            ))}
            {locations.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={4}>
                  <Typography variant="body2" color="text.secondary">
                    No locations yet.
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add a stock location</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            label="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            sx={{ mt: 1 }}
            helperText="For example: Downtown, Uptown, Warehouse."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitCreate} disabled={busy || !newName.trim()}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
