import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'store';
import { employeeAPI } from 'api/employee.api';
import { setKioskError, setKioskSession, setKioskStatus } from 'store/kioskSlice';
import { kioskLogin } from 'api/kiosk.api';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';

// Removed custom keypad for a cleaner, themed form

export default function KioskLogin() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const authEmail = useSelector((s) => s.auth.user?.email) as string | undefined;
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [identifierLocked, setIdentifierLocked] = useState(false);
  const currentRole = useSelector((s) => s.auth.currentRole);

  const canSubmit = useMemo(() => identifier.trim().length > 0 && /^\d{4,6}$/.test(pin), [identifier, pin]);

  useEffect(() => {
    const preset = search.get('identifier');
    if (preset) {
      setIdentifier(preset);
      setIdentifierLocked(true);
    }
  }, [search]);

  // If user is logged in, default to their email (still editable)
  useEffect(() => {
    if (!identifier && authEmail) {
      setIdentifier(authEmail);
    }
  }, [authEmail, identifier]);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    dispatch(setKioskStatus('loading'));
    setError(null);
    try {
      console.log('[KIOSK] Attempt login', { identifier: identifier.trim(), pin, pinLength: pin.length });
      // Debug: check if employee exists and has a saved kiosk PIN
      try {
        const identifierTrimmed = identifier.trim();
        const companyId = currentRole?.company_id as string | undefined;
        if (companyId) {
          const list = await employeeAPI.getEmployees(companyId, identifierTrimmed);
          const exact = list.find((e) => e.email?.toLowerCase() === identifierTrimmed.toLowerCase());
          console.log('[KIOSK] Debug lookup', {
            identifier: identifierTrimmed,
            matchesReturned: list.length,
            exactMatch: !!exact,
            employeeId: exact?.id,
            has_kiosk_pin: exact?.has_kiosk_pin
          });
        } else {
          console.warn('[KIOSK] No company_id available to verify employee before login');
        }
      } catch (lookupErr) {
        console.warn('[KIOSK] Employee lookup failed', lookupErr);
      }

      const res = await kioskLogin({ employee_code_or_email: identifier.trim(), pin });
      dispatch(
        setKioskSession({
          token: res.token,
          role: res.role,
          employeeId: res.employee_id,
          displayName: res.display_name
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
        setError(identifierLocked ? 'Wrong PIN.' : 'Wrong PIN or identifier.');
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

        <Button variant="contained" color="primary" fullWidth onClick={handleSubmit} disabled={!canSubmit} sx={{ py: 1.2 }}>
          Unlock
        </Button>
      </Paper>
    </Box>
  );
}
