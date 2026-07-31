import { useState } from 'react';
import QRCode from 'react-qr-code';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { enableTwoFactor, verifyTwoFactorSetup } from 'api/twofa';
import { dispatch } from 'store';
import { openSnackbar } from 'store/slices/snackbar';

interface TwoFactorSetupWizardProps {
  open: boolean;
  onClose: () => void;
  onCompleted: () => void;
}

const STEPS = ['Confirm password', 'Scan QR code', 'Save backup codes'];

export default function TwoFactorSetupWizard({ open, onClose, onCompleted }: TwoFactorSetupWizardProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [password, setPassword] = useState('');
  const [secret, setSecret] = useState('');
  const [qrUri, setQrUri] = useState('');
  const [code, setCode] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [ackText, setAckText] = useState('');
  const backupAcknowledged = ackText.trim().toUpperCase() === 'SAVED';
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetAll = () => {
    setActiveStep(0);
    setPassword('');
    setSecret('');
    setQrUri('');
    setCode('');
    setBackupCodes([]);
    setAckText('');
    setError(null);
  };

  const handleClose = (_: unknown, reason?: 'backdropClick' | 'escapeKeyDown') => {
    // On step 3 (backup codes shown), force explicit acknowledgement —
    // these codes are only shown once and can never be retrieved again.
    if (activeStep === 2 && !backupAcknowledged) return;
    if (working) return;
    if (reason === 'backdropClick' && activeStep === 2) return;
    resetAll();
    onClose();
  };

  const handleEnable = async () => {
    if (!password) {
      setError('Password is required.');
      return;
    }
    setError(null);
    setWorking(true);
    try {
      const data = await enableTwoFactor(password);
      setSecret(data.secret);
      setQrUri(data.qr_uri);
      setActiveStep(1);
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.detail || d?.error || 'Failed to start 2FA setup. Check your password and try again.');
    } finally {
      setWorking(false);
    }
  };

  const handleVerifySetup = async () => {
    if (!code || code.length !== 6 || !/^\d+$/.test(code)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setError(null);
    setWorking(true);
    try {
      const data = await verifyTwoFactorSetup(code);
      setBackupCodes(data.backup_codes || []);
      setActiveStep(2);
    } catch (e: any) {
      const d = e?.response?.data;
      setError(d?.detail || d?.error || 'Invalid code. Double-check the one in your authenticator app and try again.');
    } finally {
      setWorking(false);
    }
  };

  const handleFinish = () => {
    dispatch(
      openSnackbar({
        open: true,
        message: 'Two-factor authentication enabled.',
        variant: 'alert',
        alert: { color: 'success' },
        anchorOrigin: { vertical: 'top', horizontal: 'right' },
        close: true
      })
    );
    onCompleted();
    resetAll();
    onClose();
  };

  const handleCopyCodes = async () => {
    try {
      await navigator.clipboard.writeText(backupCodes.join('\n'));
      dispatch(
        openSnackbar({
          open: true,
          message: 'Backup codes copied to clipboard.',
          variant: 'alert',
          alert: { color: 'success' },
          anchorOrigin: { vertical: 'top', horizontal: 'right' },
          close: true
        })
      );
    } catch {
      // clipboard may be blocked; ignore silently
    }
  };

  const handleDownloadCodes = () => {
    const blob = new Blob([backupCodes.join('\n') + '\n'], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'allyvia-2fa-backup-codes.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth disableEscapeKeyDown={activeStep === 2}>
      <DialogTitle>Enable two-factor authentication</DialogTitle>
      <DialogContent>
        <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 3 }}>
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {activeStep === 0 && (
          <Stack spacing={2}>
            <Typography variant="body2" color="text.secondary">
              Confirm your current password to start setup.
            </Typography>
            <TextField
              label="Current password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
              size="small"
              autoFocus
            />
          </Stack>
        )}

        {activeStep === 1 && (
          <Stack spacing={2} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'flex-start' }}>
              Scan this QR code with your authenticator app (Google Authenticator, Authy, 1Password, etc.), then enter the 6-digit code it
              shows.
            </Typography>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
              {qrUri ? <QRCode value={qrUri} size={180} /> : null}
            </Paper>
            <Box sx={{ width: '100%' }}>
              <Typography variant="caption" color="text.secondary">
                If you can't scan, enter this key manually:
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  mt: 0.5,
                  fontFamily: 'monospace',
                  p: 1,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  wordBreak: 'break-all'
                }}
              >
                {secret}
              </Typography>
            </Box>
            <TextField
              label="6-digit code"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
              fullWidth
              size="small"
              inputProps={{ inputMode: 'numeric', autoComplete: 'one-time-code', maxLength: 6 }}
            />
          </Stack>
        )}

        {activeStep === 2 && (
          <Stack spacing={2}>
            <Alert severity="warning">
              Save these backup codes somewhere safe. They are shown <strong>only once</strong> and can be used to sign in if you lose your
              authenticator app. Each code works only one time.
            </Alert>
            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'background.paper' }}>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 1,
                  fontFamily: 'monospace',
                  fontSize: '0.95rem'
                }}
              >
                {backupCodes.map((c) => (
                  <Box key={c}>{c}</Box>
                ))}
              </Box>
            </Paper>
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" size="small" onClick={handleCopyCodes}>
                Copy all
              </Button>
              <Button variant="outlined" size="small" onClick={handleDownloadCodes}>
                Download .txt
              </Button>
            </Stack>
            <TextField
              label={'I have saved these codes — type "SAVED" to continue'}
              value={ackText}
              onChange={(e) => setAckText(e.target.value)}
              fullWidth
              size="small"
            />
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        {activeStep === 0 && (
          <>
            <Button onClick={handleClose as any} disabled={working}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleEnable}
              disabled={working}
              startIcon={working ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
            >
              Continue
            </Button>
          </>
        )}
        {activeStep === 1 && (
          <>
            <Button onClick={handleClose as any} disabled={working}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleVerifySetup}
              disabled={working}
              startIcon={working ? <CircularProgress size={16} sx={{ color: 'inherit' }} /> : undefined}
            >
              Verify
            </Button>
          </>
        )}
        {activeStep === 2 && (
          <Button variant="contained" onClick={handleFinish} disabled={!backupAcknowledged}>
            Finish
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
