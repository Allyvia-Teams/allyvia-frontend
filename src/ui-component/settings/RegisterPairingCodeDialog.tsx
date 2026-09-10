import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

import { IconCopy } from '@tabler/icons-react';

import { ttlCountdown } from './registerHelpers';
import useNow from 'hooks/useNow';
import type { RegisterDeviceWithCode } from 'api/register.api';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface RegisterPairingCodeDialogProps {
  device: RegisterDeviceWithCode | null;
  /** When the response that minted this code arrived, by this browser's clock. */
  issuedAt: Date | null;
  onClose: () => void;
}

/**
 * The one-time pairing code, shown once.
 *
 * The server stores only an HMAC of this code, so it exists nowhere else the
 * moment this dialog closes -- there is no "show it again", only "issue a new
 * one". That is why it gets a dialog of its own rather than a snackbar, and why
 * the copy says so out loud.
 *
 * Modelled on settings/security/TwoFactorSetupWizard's backup-codes step, which
 * is the same shape of problem (a secret shown once) and already solved the
 * clipboard question correctly.
 */
export default function RegisterPairingCodeDialog({ device, issuedAt, onClose }: RegisterPairingCodeDialogProps) {
  // Stop ticking once the dialog is closed; nothing is on screen to update.
  const now = useNow(device ? 1000 : 0);
  // Counted from the server's TTL rather than its absolute expiry, so a wrong
  // browser clock cannot brand a valid code expired. See ttlCountdown.
  const countdown = device && issuedAt ? ttlCountdown(issuedAt, device.pairing_code_ttl_seconds, now) : null;

  const handleCopy = async () => {
    if (!device) return;
    try {
      await navigator.clipboard.writeText(device.pairing_code);
      dispatch(
        openSnackbar({
          open: true,
          message: 'Pairing code copied to clipboard.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch {
      // navigator.clipboard is unavailable on a non-HTTPS origin and can be
      // blocked by policy. The code is on screen either way, so failing
      // silently is right -- an error here would suggest the code was lost.
    }
  };

  return (
    <Dialog open={!!device} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Pairing code for {device?.name}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Enter this on the iPad&apos;s pairing screen. It is shown once — we only keep a hash of it, so if it is lost you will need to
          issue a new one.
        </Typography>

        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            textAlign: 'center',
            backgroundColor: 'background.default',
            fontFamily: 'monospace',
            fontSize: '1.75rem',
            letterSpacing: '0.35em',
            // The code has no look-alike characters in it by design (see
            // register/models.py), so it does not need spelling out.
            fontWeight: 600
          }}
        >
          {device?.pairing_code}
        </Paper>

        {countdown && (
          <Alert severity={countdown.expired ? 'error' : 'info'} sx={{ mb: 1 }}>
            {countdown.expired
              ? 'This code has expired. Close this and issue a new one.'
              : `Expires in ${countdown.label} — pair the iPad now.`}
          </Alert>
        )}

        <Box>
          <Typography variant="caption" color="text.secondary">
            The iPad stays paired after this; the code is only for the first handshake.
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ width: '100%' }} justifyContent="space-between">
          <Button startIcon={<IconCopy size={18} />} onClick={handleCopy} disabled={!device}>
            Copy code
          </Button>
          <Button variant="contained" onClick={onClose}>
            Done
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}
