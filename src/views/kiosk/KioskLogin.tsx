import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { setKioskError, setKioskSession, setKioskStatus } from 'store/kioskSlice';
import { kioskLogin } from 'api/kiosk.api';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import { logoutAsync } from 'store/slices/auth';
import Alert from '@mui/material/Alert';

// Removed custom keypad for a cleaner, themed form

export default function KioskLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const kioskStatus = useSelector((s) => s.kiosk.status);
  const isLoading = kioskStatus === 'loading';

  const canSubmit = useMemo(() => !isLoading && identifier.trim().length > 0 && /^\d{4,6}$/.test(pin), [identifier, pin, isLoading]);

  useEffect(() => {
    const preset = search.get('identifier');
    if (preset) {
      setIdentifier(preset);
    }
  }, [search]);

  // Do not auto-fill from logged-in email to keep kiosk login independent

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dispatch(setKioskStatus('loading'));
    setError(null);
    try {
      const res = await kioskLogin({ employee_code_or_email: identifier.trim(), pin });
      dispatch(
        setKioskSession({
          token: res.token,
          role: res.role,
          employeeId: res.employee_id,
          displayName: res.display_name,
          email: identifier.trim()
        })
      );
      // After successful PIN unlock, take the employee straight to their clock page
      navigate('/kiosk/clock');
    } catch (e: any) {
      const status = e?.response?.status;
      const detail = e?.response?.data?.detail || 'Unable to login. Please try again.';
      if (status === 429) {
        setError(detail);
      } else if (status === 401) {
        setError('Wrong PIN or email.');
      } else {
        setError(detail);
      }
      dispatch(setKioskError(detail));
      dispatch(setKioskStatus('failed'));
    }
  };

  // No keypad handlers needed with text fields

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: 'background.default', p: 2 }}>
      <Paper elevation={2} sx={{ width: '100%', maxWidth: 440, p: 4, borderRadius: 3 }}>
        <Typography variant="h3" textAlign="center" sx={{ mb: 1 }}>
          Store Kiosk
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" sx={{ mb: 3 }}>
          Enter your email and PIN to continue
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <TextField
            label="Employee Email"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. user@store.com"
            fullWidth
            autoComplete="email"
            sx={{ mb: 2 }}
          />

          <TextField
            label="PIN"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            type="password"
            inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 6 }}
            helperText={!/^\d{4,6}$/.test(pin) && pin ? 'PIN must be 4-6 digits' : ' '}
            error={!!pin && !/^\d{4,6}$/.test(pin)}
            fullWidth
            sx={{ mb: 1 }}
          />

          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
            <Button type="submit" variant="contained" color="primary" fullWidth disabled={!canSubmit} sx={{ py: 1.2 }}>
              {isLoading ? 'Unlocking…' : 'Unlock'}
            </Button>
            <Button variant="outlined" color="inherit" onClick={() => dispatch(logoutAsync() as any)} sx={{ whiteSpace: 'nowrap' }}>
              Logout
            </Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
