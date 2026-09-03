import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
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

import { IconCreditCard } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { formatLastSeen, readerLabel, readerLocationName, readerStatusChip } from './registers';
import useNow from 'hooks/useNow';
import { listLocations } from 'api/inventoryStock.api';
import stripeApi from 'api/stripe.api';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface RegisterReadersCardProps {
  companyId: string;
}

const messageFrom = (e: any, fallback: string): string => {
  const d = e?.response?.data;
  if (d) {
    if (typeof d === 'string') return d;
    if (d.detail) return d.detail;
    if (d.error) return d.error;
    // The Stripe views answer field errors as {field: ["..."]}.
    const first = Object.values(d).find((v) => Array.isArray(v) && v.length);
    if (Array.isArray(first)) return String(first[0]);
  }
  return fallback;
};

/**
 * The card readers this company has claimed, from the server's own mirror.
 *
 * Distinct from the picker in the POS checkout modal, which lists readers the
 * browser DISCOVERS over the local network via the Terminal SDK. A reader can
 * be in one list and not the other -- claimed but powered off, or on the
 * network but registered to another account -- so this is the surface that
 * answers "did the reader we bought get set up".
 */
export default function RegisterReadersCard({ companyId }: RegisterReadersCardProps) {
  const {
    data: readers,
    isLoading,
    error: loadError,
    mutate
  } = useSWR(companyId ? `stripe-readers-${companyId}` : null, () => stripeApi.listReaders(companyId), {
    shouldRetryOnError: false
  });

  // Readers name their store through this: reader.location_id is a STRIPE
  // location id, joined via Location.stripe_terminal_location_id. Without the
  // list the column falls back to the raw id, which reads as corrupt data
  // rather than as a failed lookup -- so the failure is said out loud.
  const { data: locations, error: locationsError } = useSWR(companyId ? `register-locations-${companyId}` : null, () => listLocations(), {
    shouldRetryOnError: false
  });

  const [code, setCode] = useState('');
  const [label, setLabel] = useState('');
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = useNow(30_000);

  const handleRegister = async () => {
    const registrationCode = code.trim();
    if (!registrationCode) return;
    setWorking(true);
    setError(null);
    try {
      await stripeApi.registerReader(companyId, { registration_code: registrationCode, label: label.trim() || undefined });
      setCode('');
      setLabel('');
    } catch (e: any) {
      setError(messageFrom(e, 'Stripe would not accept that registration code.'));
      return;
    } finally {
      setWorking(false);
    }
    // OUTSIDE the try. A registration code is single-use: telling an admin the
    // reader failed to register when only the list refresh failed sends them to
    // re-enter a code Stripe will now reject, and they conclude the hardware is
    // faulty.
    dispatch(
      openSnackbar({
        open: true,
        message: 'Reader registered.',
        variant: 'alert',
        alert: { color: 'success' },
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        close: true
      })
    );
    mutate().catch(() => setError('The reader was registered, but the list could not be refreshed. Reload to see it.'));
  };

  return (
    <SettingsSectionCard
      title="Card readers"
      description="Terminal readers registered to this company"
      icon={<IconCreditCard size={24} stroke={1.5} />}
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {locationsError && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Could not load this company&apos;s stores, so the Store column below shows Stripe&apos;s own identifiers.
          </Alert>
        )}

        {!companyId ? (
          <Alert severity="info">Pick a company to see its card readers.</Alert>
        ) : loadError ? (
          <Alert
            severity="error"
            sx={{ mb: 2 }}
            action={
              <Button color="inherit" size="small" onClick={() => mutate()}>
                Retry
              </Button>
            }
          >
            {messageFrom(loadError, 'Could not load readers from Stripe.')}
          </Alert>
        ) : isLoading || !readers ? (
          <Box sx={{ mb: 2 }}>
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} />
          </Box>
        ) : readers.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No readers registered yet. A register can still take cash without one.
          </Typography>
        ) : (
          <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1, mb: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Reader</TableCell>
                  <TableCell>Model</TableCell>
                  <TableCell>Store</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Last seen</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {readers.map((reader) => {
                  const chip = readerStatusChip(reader);
                  return (
                    <TableRow key={reader.id} hover>
                      <TableCell>
                        <Typography variant="body2">{readerLabel(reader)}</Typography>
                        {reader.serial_number && (
                          <Typography variant="caption" color="text.secondary">
                            {reader.serial_number}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>{reader.device_type || '—'}</TableCell>
                      <TableCell>{readerLocationName(reader, locations || [])}</TableCell>
                      <TableCell>
                        <Chip label={chip.label} size="small" variant="outlined" color={chip.color} />
                      </TableCell>
                      <TableCell>{formatLastSeen(reader.last_seen_at, now)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
          Register a reader
        </Typography>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="flex-start">
          <TextField
            size="small"
            label="Registration code"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            helperText="From the reader: Settings → Generate pairing code. In test mode, use simulated-wpe."
            sx={{ minWidth: 260 }}
          />
          <TextField
            size="small"
            label="Label (optional)"
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            helperText="How it appears at checkout."
            sx={{ minWidth: 200 }}
          />
          <Button variant="contained" onClick={handleRegister} disabled={working || !code.trim()} sx={{ mt: 0.25 }}>
            {working ? 'Registering…' : 'Register'}
          </Button>
        </Stack>
      </Box>
    </SettingsSectionCard>
  );
}
