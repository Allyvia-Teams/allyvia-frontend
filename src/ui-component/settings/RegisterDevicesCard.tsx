import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { IconDeviceTablet, IconKey, IconPlus } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import RegisterPairingCodeDialog from './RegisterPairingCodeDialog';
import ConfirmActionDialog from './team/ConfirmActionDialog';
import { deviceStatusChip, formatLastSeen } from './registers';
import useNow from 'hooks/useNow';
import registerApi, { type RegisterDeviceRow, type RegisterDeviceWithCode } from 'api/register.api';
import { listLocations } from 'api/inventoryStock.api';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface RegisterDevicesCardProps {
  companyId: string;
}

/** The inline unwrap every settings section uses; there is no shared helper. */
const messageFrom = (e: any, fallback: string): string => {
  const d = e?.response?.data;
  if (d) {
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    if (d.error) return d.error;
  }
  return fallback;
};

export default function RegisterDevicesCard({ companyId }: RegisterDevicesCardProps) {
  const devicesKey = companyId ? `register-devices-${companyId}` : null;
  const {
    data: devices,
    isLoading,
    error: loadError,
    mutate
  } = useSWR(devicesKey, () => registerApi.listDevices(), { shouldRetryOnError: false });

  // Locations are needed to name a device's store and to pick one on create.
  // The error matters: with locations unloaded the Store select offers only
  // "No store", and a register with no location can read stock but cannot
  // adjust it or receive a delivery -- fixable afterwards, but only by someone
  // who knows that is why.
  const { data: locations, error: locationsError } = useSWR(companyId ? `register-locations-${companyId}` : null, () => listLocations(), {
    shouldRetryOnError: false
  });

  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [newLocationId, setNewLocationId] = useState('');
  const [issued, setIssued] = useState<RegisterDeviceWithCode | null>(null);
  const [issuedAt, setIssuedAt] = useState<Date | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<RegisterDeviceRow | null>(null);
  const [editTarget, setEditTarget] = useState<RegisterDeviceRow | null>(null);
  const [editName, setEditName] = useState('');
  const [editLocationId, setEditLocationId] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Errors raised BY a dialog belong IN that dialog. The card's Alert sits
  // behind the MUI backdrop, so an admin pressing "Add" on a name the server
  // rejects sees the button un-busy itself and nothing else, and presses again.
  const [createError, setCreateError] = useState<string | null>(null);
  const [revokeError, setRevokeError] = useState<string | null>(null);

  // A list refresh whose failure is surfaced on the card, never attributed to
  // whichever write just succeeded.
  const refresh = () => {
    mutate().catch(() => setError('That worked, but the list could not be refreshed. Reload to see the change.'));
  };

  // One clock for the whole table, so a pending device's chip flips to
  // "Code expired" on its own and the last-seen column stays honest.
  const now = useNow(1000);

  // With no company the SWR key is null, which means isLoading false and data
  // undefined -- indistinguishable from loading, and it would render a
  // skeleton for ever.
  const noCompany = !companyId;

  const snack = (message: string) =>
    dispatch(
      openSnackbar({
        open: true,
        message,
        variant: 'alert',
        alert: { color: 'success' },
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        close: true
      })
    );

  const closeCreate = () => {
    if (working) return;
    setCreating(false);
    setNewName('');
    setNewLocationId('');
    setCreateError(null);
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setWorking(true);
    setCreateError(null);
    try {
      const device = await registerApi.createDevice({ name, location_id: newLocationId || null });
      // The dialog opens BEFORE the list refresh: the code is in this response
      // and nowhere else, so it must reach the screen even if the refetch fails.
      setIssued(device);
      setIssuedAt(new Date());
      setCreating(false);
      setNewName('');
      setNewLocationId('');
    } catch (e: any) {
      setCreateError(messageFrom(e, 'Could not add that register.'));
      return;
    } finally {
      setWorking(false);
    }
    // OUTSIDE the try. The register exists and its code is on screen by now, so
    // a failed list refresh must not report the write as having failed -- an
    // admin who reads "Could not add that register" adds a second one, and the
    // shop ends up with two pending tills and two live codes for one iPad.
    refresh();
  };

  const handleReissue = async (device: RegisterDeviceRow) => {
    setWorking(true);
    setError(null);
    try {
      const withCode = await registerApi.reissuePairingCode(device.id);
      setIssued(withCode);
      setIssuedAt(new Date());
    } catch (e: any) {
      setError(messageFrom(e, 'Could not issue a new pairing code.'));
      return;
    } finally {
      setWorking(false);
    }
    refresh();
  };

  const openEdit = (device: RegisterDeviceRow) => {
    setEditTarget(device);
    setEditName(device.name);
    setEditLocationId(device.location?.id || '');
    setEditError(null);
  };

  const handleEdit = async () => {
    if (!editTarget) return;
    const name = editName.trim();
    if (!name) return;
    setWorking(true);
    setEditError(null);
    try {
      // Without this a register created with the wrong store -- or with none,
      // which is what happens when the locations fetch fails -- could only be
      // corrected by revoking it and re-pairing the iPad with a fresh code.
      await registerApi.updateDevice(editTarget.id, { name, location_id: editLocationId || null });
      setEditTarget(null);
    } catch (e: any) {
      setEditError(messageFrom(e, 'Could not update that register.'));
      return;
    } finally {
      setWorking(false);
    }
    snack('Register updated.');
    refresh();
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setWorking(true);
    setRevokeError(null);
    try {
      await registerApi.revokeDevice(revokeTarget.id);
      setRevokeTarget(null);
    } catch (e: any) {
      // Kept in the dialog: the card's Alert would render behind its backdrop.
      setRevokeError(messageFrom(e, 'Could not revoke that register.'));
      return;
    } finally {
      setWorking(false);
    }
    // The revoke has committed. Reporting a failed refresh as a failed revoke
    // is the worst direction for this action: the admin would believe a till
    // they have just killed is still live.
    snack('Register revoked. The iPad will sign out.');
    refresh();
  };

  const activeLocations = (locations || []).filter((location) => location.is_active);

  return (
    <SettingsSectionCard
      title="Registers"
      description="iPads paired to this company as a till"
      icon={<IconDeviceTablet size={24} stroke={1.5} />}
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction="row" justifyContent="flex-end" sx={{ mb: 1.5 }}>
          <Button variant="contained" size="small" startIcon={<IconPlus size={16} />} onClick={() => setCreating(true)}>
            Add a register
          </Button>
        </Stack>

        {noCompany ? (
          <Alert severity="info">Pick a company to manage its registers.</Alert>
        ) : loadError ? (
          // Never an empty table on a failed load: "no registers" is a claim
          // about the company, and this is only a claim about the network.
          <Alert
            severity="error"
            action={
              <Button color="inherit" size="small" onClick={() => mutate()}>
                Retry
              </Button>
            }
          >
            {messageFrom(loadError, "Could not load this company's registers.")}
          </Alert>
        ) : isLoading || !devices ? (
          <Box>
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} />
          </Box>
        ) : devices.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No registers yet. Add one to get a pairing code for an iPad.
          </Typography>
        ) : (
          <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Store</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last seen</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {devices.map((device) => {
                  const chip = deviceStatusChip(device, now);
                  const revoked = device.status === 'revoked';
                  return (
                    <TableRow key={device.id} hover>
                      <TableCell>{device.name}</TableCell>
                      <TableCell>{device.location?.name || '—'}</TableCell>
                      <TableCell>
                        <Chip label={chip.label} size="small" variant="outlined" color={chip.color} />
                      </TableCell>
                      <TableCell>{formatLastSeen(device.last_seen_at, now)}</TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                          <Button size="small" disabled={revoked || working} onClick={() => openEdit(device)}>
                            Edit
                          </Button>
                          <Button
                            size="small"
                            startIcon={<IconKey size={16} />}
                            disabled={revoked || working}
                            onClick={() => handleReissue(device)}
                          >
                            {device.status === 'active' ? 'Re-pair' : 'New code'}
                          </Button>
                          <Button size="small" color="error" disabled={revoked || working} onClick={() => setRevokeTarget(device)}>
                            Revoke
                          </Button>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Box>

      <Dialog open={creating} onClose={closeCreate} maxWidth="xs" fullWidth>
        <DialogTitle>Add a register</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            required
            size="small"
            label="Name"
            value={newName}
            onChange={(event) => setNewName(event.target.value)}
            helperText="What the staff call this till — “Front counter”, “Upstairs”."
            sx={{ mt: 1, mb: 2 }}
          />
          {createError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {createError}
            </Alert>
          )}
          {locationsError && (
            <Alert severity="warning" sx={{ mb: 2 }}>
              Could not load this company&apos;s stores. Add the register without one and set its store afterwards.
            </Alert>
          )}
          <FormControl fullWidth size="small">
            <InputLabel>Store</InputLabel>
            <Select label="Store" value={newLocationId} onChange={(event) => setNewLocationId(String(event.target.value))}>
              <MenuItem value="">
                <em>No store</em>
              </MenuItem>
              {activeLocations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            The store decides which stock and which staff this register sees.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeCreate} disabled={working}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleCreate} disabled={working || !newName.trim()}>
            {working ? 'Adding…' : 'Add and get a code'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={!!editTarget} onClose={() => !working && setEditTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Edit register</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            required
            size="small"
            label="Name"
            value={editName}
            onChange={(event) => setEditName(event.target.value)}
            sx={{ mt: 1, mb: 2 }}
          />
          <FormControl fullWidth size="small">
            <InputLabel>Store</InputLabel>
            <Select label="Store" value={editLocationId} onChange={(event) => setEditLocationId(String(event.target.value))}>
              <MenuItem value="">
                <em>No store</em>
              </MenuItem>
              {activeLocations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
            A register with no store can look stock up but cannot adjust it or receive a delivery.
          </Typography>
          {editError && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {editError}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setEditTarget(null)} disabled={working}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleEdit} disabled={working || !editName.trim()}>
            {working ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <RegisterPairingCodeDialog
        device={issued}
        issuedAt={issuedAt}
        onClose={() => {
          setIssued(null);
          setIssuedAt(null);
        }}
      />

      <ConfirmActionDialog
        open={!!revokeTarget}
        title="Revoke this register"
        message={
          revokeTarget
            ? `“${revokeTarget.name}” will sign out on its next tap and go back to the pairing screen. Any sale in progress on it is lost. You can add it again with a new code.`
            : ''
        }
        confirmLabel="Revoke"
        destructive
        working={working}
        error={revokeError}
        onClose={() => {
          if (working) return;
          setRevokeTarget(null);
          setRevokeError(null);
        }}
        onConfirm={handleRevoke}
      />
    </SettingsSectionCard>
  );
}
