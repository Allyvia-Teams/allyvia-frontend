// ui-component/settings/Registers.tsx
//
// The page the Allyvia Register iPad sends the owner to. Its pairing screen reads
// "In Allyvia OS, open Settings › Registers and add this iPad. Enter the
// 8-character code it shows." (ios-app/src/app/pair.tsx) — so this tab exists to
// answer exactly that sentence, and its wording deliberately mirrors it.
//
// The pairing code is a one-time secret: the backend hashes it and returns the
// plaintext only from the request that minted it, never from the list. Everything
// here follows from that — the code lives in component state for as long as the
// dialog is open and is never read back from the table.

import { useCallback, useEffect, useMemo, useState } from 'react';
import useSWR from 'swr';
import { formatDistanceToNow } from 'date-fns';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import { IconCopy, IconDeviceTablet, IconPlus } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import SettingsPermissionDenied from './SettingsPermissionDenied';
import ConfirmActionDialog from './team/ConfirmActionDialog';
import {
  createRegisterDevice,
  listRegisterDevices,
  reissuePairingCode,
  revokeRegisterDevice,
  updateRegisterDevice,
  type RegisterDevice,
  type RegisterDeviceStatus
} from 'api/register.api';
import { listLocations, type Location } from 'api/inventoryStock.api';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

export const REGISTERS_INTRO = 'Pair an iPad running Allyvia Register. Add a device here, then enter the code it shows on the iPad.';

const ONE_TIME_NOTICE = 'This code is shown once. If you close this window you will need to generate a new one.';

const NAME_MAX_LENGTH = 120;

// Active first: the tills someone is standing at matter more than the ones
// waiting to be set up, and revoked rows are history.
const STATUS_RANK: Record<RegisterDeviceStatus, number> = { active: 0, pending: 1, revoked: 2 };

const STATUS_LABEL: Record<RegisterDeviceStatus, string> = { active: 'Active', pending: 'Pending', revoked: 'Revoked' };

const STATUS_COLOR: Record<RegisterDeviceStatus, 'success' | 'warning' | 'default'> = {
  active: 'success',
  pending: 'warning',
  revoked: 'default'
};

// ---------------------------------------------------------------------------
// Pure helpers — exported so the contract can be tested without a DOM
// ---------------------------------------------------------------------------

/** Active, then pending, then revoked; stable within a status. */
export const sortDevices = (devices: RegisterDevice[]): RegisterDevice[] =>
  [...devices].sort((a, b) => (STATUS_RANK[a.status] ?? 99) - (STATUS_RANK[b.status] ?? 99));

/** m:ss, floored at zero — a tab left open past expiry must not count backwards. */
export const formatCountdown = (seconds: number): string => {
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  return `${minutes}:${String(total % 60).padStart(2, '0')}`;
};

/** Relative time, an em dash for an iPad that has never checked in. */
export const formatLastSeen = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return formatDistanceToNow(date, { addSuffix: true });
  } catch {
    return iso;
  }
};

/** Re-issuing on an ACTIVE device un-pairs the till that is running right now. */
export const rePairWarning = (name: string): string => `The iPad currently paired as ${name} will be signed out.`;

const formatDate = (iso: string | null): string => {
  if (!iso) return '—';
  try {
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return iso;
    return date.toLocaleDateString();
  } catch {
    return iso;
  }
};

const errorDetail = (e: unknown, fallback: string): string => {
  const data = (e as { response?: { data?: unknown } })?.response?.data;
  if (typeof data === 'string' && data) return data;
  const detail = (data as { detail?: unknown } | undefined)?.detail;
  return typeof detail === 'string' && detail ? detail : fallback;
};

const isAdminDenied = (e: unknown): boolean => {
  const response = (e as { response?: { status?: number; data?: { detail?: string } } })?.response;
  return response?.status === 403 && typeof response?.data?.detail === 'string' && response.data.detail.includes('Admin role required');
};

// ---------------------------------------------------------------------------
// The one-time code
// ---------------------------------------------------------------------------
export interface PairingCodePanelProps {
  code: string;
  secondsRemaining: number;
  onRefresh: () => void;
  refreshing?: boolean;
  error?: string | null;
}

/**
 * Deliberately free of MUI's Dialog/Portal so it renders under
 * renderToStaticMarkup: a portal's children are dropped on the server, and this
 * is the part of the flow most worth pinning down in a test.
 */
export function PairingCodePanel({ code, secondsRemaining, onRefresh, refreshing = false, error = null }: PairingCodePanelProps) {
  const expired = secondsRemaining <= 0;

  return (
    <Stack spacing={2} sx={{ alignItems: 'center', textAlign: 'center', py: 1 }}>
      <Typography variant="body2" color="text.secondary">
        Enter this code on the iPad.
      </Typography>

      <Box
        sx={{
          px: 3,
          py: 2,
          width: '100%',
          borderRadius: 2,
          border: (t) => `1px dashed ${t.palette.divider}`,
          bgcolor: 'action.hover',
          opacity: expired ? 0.5 : 1
        }}
      >
        <Typography
          component="p"
          sx={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
            fontSize: { xs: 30, sm: 38 },
            fontWeight: 700,
            letterSpacing: '0.22em',
            // The letter-spacing is applied to the right of each glyph, which
            // would otherwise push the block visibly off centre.
            textIndent: '0.22em',
            color: 'text.primary'
          }}
        >
          {code}
        </Typography>
      </Box>

      {expired ? (
        <Stack spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="error">
            Code expired
          </Typography>
          <Button variant="contained" onClick={onRefresh} disabled={refreshing} sx={{ textTransform: 'none' }}>
            {refreshing ? 'Working...' : 'Get a new code'}
          </Button>
        </Stack>
      ) : (
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            {`Expires in ${formatCountdown(secondsRemaining)}`}
          </Typography>
          <Tooltip title="Copy code">
            <Button
              size="small"
              startIcon={<IconCopy size={16} stroke={1.5} />}
              onClick={() => navigator?.clipboard?.writeText(code)}
              sx={{ textTransform: 'none' }}
            >
              Copy
            </Button>
          </Tooltip>
        </Stack>
      )}

      <Alert severity="info" sx={{ width: '100%', textAlign: 'left' }}>
        {ONE_TIME_NOTICE}
      </Alert>

      {error && (
        <Alert severity="error" sx={{ width: '100%', textAlign: 'left' }}>
          {error}
        </Alert>
      )}
    </Stack>
  );
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------
export interface RegisterDeviceTableProps {
  devices: RegisterDevice[];
  onAdd: () => void;
  onRename: (device: RegisterDevice) => void;
  onRelocate: (device: RegisterDevice) => void;
  onShowCode: (device: RegisterDevice) => void;
  onRePair: (device: RegisterDevice) => void;
  onRevoke: (device: RegisterDevice) => void;
  busyId?: string | null;
}

export function RegisterDeviceTable({
  devices,
  onAdd,
  onRename,
  onRelocate,
  onShowCode,
  onRePair,
  onRevoke,
  busyId = null
}: RegisterDeviceTableProps) {
  const rows = sortDevices(devices);

  if (rows.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
        <Box sx={{ color: 'text.disabled', display: 'flex', justifyContent: 'center', mb: 1.5 }}>
          <IconDeviceTablet size={40} stroke={1.5} />
        </Box>
        <Typography variant="h5" sx={{ fontWeight: 600, mb: 0.5 }}>
          No iPads yet
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
          Add the first one to get a pairing code.
        </Typography>
        <Button variant="contained" startIcon={<IconPlus size={18} stroke={1.5} />} onClick={onAdd} sx={{ textTransform: 'none' }}>
          Add iPad
        </Button>
      </Box>
    );
  }

  return (
    <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Location</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Last seen</TableCell>
            <TableCell>Paired</TableCell>
            <TableCell align="right">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((device) => {
            const revoked = device.status === 'revoked';
            const busy = busyId === device.id;
            return (
              <TableRow key={device.id} hover>
                <TableCell sx={{ fontWeight: 500 }}>{device.name}</TableCell>
                <TableCell>{device.location?.name || 'Any location'}</TableCell>
                <TableCell>
                  <Chip size="small" label={STATUS_LABEL[device.status]} color={STATUS_COLOR[device.status]} variant="outlined" />
                </TableCell>
                <TableCell>{formatLastSeen(device.last_seen_at)}</TableCell>
                <TableCell>{formatDate(device.paired_at)}</TableCell>
                <TableCell align="right">
                  {revoked ? (
                    // Never offer pairing here: the backend 409s a revoked device.
                    <Button size="small" disabled sx={{ textTransform: 'none' }}>
                      Revoked
                    </Button>
                  ) : (
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      <Button size="small" disabled={busy} onClick={() => onRename(device)} sx={{ textTransform: 'none' }}>
                        Rename
                      </Button>
                      <Button size="small" disabled={busy} onClick={() => onRelocate(device)} sx={{ textTransform: 'none' }}>
                        Location
                      </Button>
                      {device.status === 'active' ? (
                        <Button size="small" disabled={busy} onClick={() => onRePair(device)} sx={{ textTransform: 'none' }}>
                          Re-pair
                        </Button>
                      ) : (
                        <Button size="small" disabled={busy} onClick={() => onShowCode(device)} sx={{ textTransform: 'none' }}>
                          Show pairing code
                        </Button>
                      )}
                      <Button size="small" color="error" disabled={busy} onClick={() => onRevoke(device)} sx={{ textTransform: 'none' }}>
                        Revoke
                      </Button>
                    </Stack>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ---------------------------------------------------------------------------
// The tab
// ---------------------------------------------------------------------------
interface PairingState {
  deviceName: string;
  code: string;
  /** Wall-clock deadline: a backgrounded tab that stops ticking still tells the truth. */
  expiresAt: number;
  deviceId: string;
}

const notify = (message: string) =>
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

export default function Registers() {
  const { data, error: loadError, isLoading, mutate } = useSWR('register-devices', listRegisterDevices);
  const { data: locations } = useSWR('register-locations', listLocations);

  const [addOpen, setAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [locationId, setLocationId] = useState('');
  const [pairing, setPairing] = useState<PairingState | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const [renameTarget, setRenameTarget] = useState<RegisterDevice | null>(null);
  const [relocateTarget, setRelocateTarget] = useState<RegisterDevice | null>(null);
  const [revokeTarget, setRevokeTarget] = useState<RegisterDevice | null>(null);
  const [rePairTarget, setRePairTarget] = useState<RegisterDevice | null>(null);

  const [working, setWorking] = useState(false);
  const [dialogError, setDialogError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);

  const activeLocations = useMemo(() => (locations || []).filter((l: Location) => l.is_active), [locations]);

  // One ticker for the open code, driven off the wall-clock deadline.
  useEffect(() => {
    if (!pairing) return undefined;
    const tick = () => setSecondsLeft(Math.max(0, Math.round((pairing.expiresAt - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [pairing]);

  const showCode = useCallback((device: { id: string; name: string }, code: string, ttlSeconds: number) => {
    setPairing({ deviceId: device.id, deviceName: device.name, code, expiresAt: Date.now() + ttlSeconds * 1000 });
  }, []);

  const closeAll = () => {
    setAddOpen(false);
    setPairing(null);
    setName('');
    setLocationId('');
    setDialogError(null);
    // The row that just paired (or did not) may have changed status.
    mutate();
  };

  const handleCreate = async () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogError('name is required.');
      return;
    }
    setWorking(true);
    setDialogError(null);
    try {
      const created = await createRegisterDevice(locationId ? { name: trimmed, location_id: locationId } : { name: trimmed });
      showCode(created, created.pairing_code, created.pairing_code_ttl_seconds);
      mutate();
    } catch (e) {
      setDialogError(errorDetail(e, 'Could not add this iPad. Please try again.'));
    } finally {
      setWorking(false);
    }
  };

  // Takes only what it needs: the re-issue from an open code dialog knows the id
  // and name but may not have a row for it yet, and casting one up to a full
  // RegisterDevice would be a lie about data we do not have.
  const handleIssueCode = async (device: { id: string; name: string }) => {
    setWorking(true);
    setDialogError(null);
    setRowError(null);
    try {
      const issued = await reissuePairingCode(device.id);
      showCode(device, issued.pairing_code, issued.pairing_code_ttl_seconds);
      setRePairTarget(null);
      mutate();
    } catch (e) {
      // Includes the 409 a revoked device returns, which the table should never
      // reach — surfaced verbatim if the row was stale.
      const detail = errorDetail(e, 'Could not issue a pairing code. Please try again.');
      if (pairing) setDialogError(detail);
      else setRowError(detail);
      setRePairTarget(null);
    } finally {
      setWorking(false);
    }
  };

  const handleRename = async () => {
    if (!renameTarget) return;
    const trimmed = name.trim();
    if (!trimmed) {
      setDialogError('name cannot be blank.');
      return;
    }
    setWorking(true);
    setDialogError(null);
    try {
      await updateRegisterDevice(renameTarget.id, { name: trimmed });
      await mutate();
      notify('Register renamed.');
      setRenameTarget(null);
      setName('');
    } catch (e) {
      setDialogError(errorDetail(e, 'Could not rename this iPad. Please try again.'));
    } finally {
      setWorking(false);
    }
  };

  const handleRelocate = async () => {
    if (!relocateTarget) return;
    setWorking(true);
    setDialogError(null);
    try {
      await updateRegisterDevice(relocateTarget.id, { location_id: locationId || null });
      await mutate();
      notify('Location updated.');
      setRelocateTarget(null);
      setLocationId('');
    } catch (e) {
      setDialogError(errorDetail(e, 'Could not change the location. Please try again.'));
    } finally {
      setWorking(false);
    }
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    setWorking(true);
    setRowError(null);
    try {
      await revokeRegisterDevice(revokeTarget.id);
      await mutate();
      notify('Register revoked.');
      setRevokeTarget(null);
    } catch (e) {
      setRowError(errorDetail(e, 'Could not revoke this iPad. Please try again.'));
      setRevokeTarget(null);
    } finally {
      setWorking(false);
    }
  };

  // The tab is admin-gated in settings/index.tsx, so this should be unreachable —
  // but an empty table would be the wrong story if a role changed mid-session.
  if (isAdminDenied(loadError)) {
    return <SettingsPermissionDenied />;
  }

  const devices = data || [];
  const codeOpen = pairing !== null;

  return (
    <SettingsSectionCard title="Registers" description={REGISTERS_INTRO} icon={<IconDeviceTablet size={24} stroke={1.5} />}>
      {rowError && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setRowError(null)}>
          {rowError}
        </Alert>
      )}
      {loadError && !isAdminDenied(loadError) && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {errorDetail(loadError, 'Could not load your registers.')}
        </Alert>
      )}

      {devices.length > 0 && (
        <Stack direction="row" sx={{ justifyContent: 'flex-end', mb: 2 }}>
          <Button
            variant="contained"
            startIcon={<IconPlus size={18} stroke={1.5} />}
            onClick={() => setAddOpen(true)}
            sx={{ textTransform: 'none' }}
          >
            Add iPad
          </Button>
        </Stack>
      )}

      {isLoading ? (
        <Box>
          <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
          <Skeleton variant="rounded" height={44} />
        </Box>
      ) : (
        <RegisterDeviceTable
          devices={devices}
          busyId={working ? revokeTarget?.id || renameTarget?.id || null : null}
          onAdd={() => setAddOpen(true)}
          onRename={(d) => {
            setName(d.name);
            setDialogError(null);
            setRenameTarget(d);
          }}
          onRelocate={(d) => {
            setLocationId(d.location?.id || '');
            setDialogError(null);
            setRelocateTarget(d);
          }}
          onShowCode={(d) => handleIssueCode(d)}
          onRePair={(d) => setRePairTarget(d)}
          onRevoke={(d) => setRevokeTarget(d)}
        />
      )}

      {/* Add an iPad, then show its one-time code without leaving the dialog. */}
      <Dialog open={addOpen || codeOpen} onClose={working ? undefined : closeAll} maxWidth="xs" fullWidth>
        <DialogTitle>{codeOpen ? `Pairing code for ${pairing?.deviceName}` : 'Add iPad'}</DialogTitle>
        <DialogContent>
          {codeOpen && pairing ? (
            <PairingCodePanel
              code={pairing.code}
              secondsRemaining={secondsLeft}
              refreshing={working}
              error={dialogError}
              onRefresh={() => handleIssueCode({ id: pairing.deviceId, name: pairing.deviceName })}
            />
          ) : (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <TextField
                autoFocus
                label="Name"
                placeholder="Front till"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
                helperText="What staff will call this iPad."
                fullWidth
                required
              />
              <TextField
                select
                label="Location"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                helperText="Pin the register to one store, or leave it open to any."
                fullWidth
              >
                <MenuItem value="">Any location</MenuItem>
                {activeLocations.map((l: Location) => (
                  <MenuItem key={l.id} value={l.id}>
                    {l.name}
                  </MenuItem>
                ))}
              </TextField>
              {dialogError && <Alert severity="error">{dialogError}</Alert>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={closeAll} disabled={working} sx={{ textTransform: 'none' }}>
            {codeOpen ? 'Done' : 'Cancel'}
          </Button>
          {!codeOpen && (
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={working || !name.trim()}
              startIcon={working ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
              sx={{ textTransform: 'none' }}
            >
              {working ? 'Working...' : 'Add iPad'}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={renameTarget !== null} onClose={working ? undefined : () => setRenameTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Rename register</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField
              autoFocus
              label="Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              slotProps={{ htmlInput: { maxLength: NAME_MAX_LENGTH } }}
              fullWidth
              required
            />
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRenameTarget(null)} disabled={working} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRename} disabled={working || !name.trim()} sx={{ textTransform: 'none' }}>
            {working ? 'Working...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={relocateTarget !== null} onClose={working ? undefined : () => setRelocateTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Change location</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Location" value={locationId} onChange={(e) => setLocationId(e.target.value)} fullWidth>
              <MenuItem value="">Any location</MenuItem>
              {activeLocations.map((l: Location) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.name}
                </MenuItem>
              ))}
            </TextField>
            {dialogError && <Alert severity="error">{dialogError}</Alert>}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setRelocateTarget(null)} disabled={working} sx={{ textTransform: 'none' }}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleRelocate} disabled={working} sx={{ textTransform: 'none' }}>
            {working ? 'Working...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      <ConfirmActionDialog
        open={rePairTarget !== null}
        title="Re-pair this register?"
        message={rePairTarget ? rePairWarning(rePairTarget.name) : ''}
        confirmLabel="Get a new code"
        working={working}
        onClose={() => setRePairTarget(null)}
        onConfirm={() => rePairTarget && handleIssueCode(rePairTarget)}
      />

      <ConfirmActionDialog
        open={revokeTarget !== null}
        title="Revoke this register?"
        message={
          revokeTarget ? `${revokeTarget.name} will be signed out and cannot be paired again. You can add a new iPad at any time.` : ''
        }
        confirmLabel="Revoke"
        destructive
        working={working}
        onClose={() => setRevokeTarget(null)}
        onConfirm={handleRevoke}
      />
    </SettingsSectionCard>
  );
}
