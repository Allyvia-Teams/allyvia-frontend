import React, { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Box,
  Typography,
  Alert,
  IconButton,
  InputAdornment
} from '@mui/material';
import { IconX, IconEye, IconEyeOff } from '@tabler/icons-react';
import AnimateButton from 'ui-component/extended/AnimateButton';
import { setEmployeePin } from 'api/kiosk.api';
import { useDispatch, useSelector } from 'store';
import { fetchEmployees, updateEmployeeInState } from 'store/slices/employee';

interface EmployeeSetPinModalProps {
  open: boolean;
  onClose: () => void;
  employeeId: string | null;
  employeeName?: string;
}

export const EmployeeSetPinModal: React.FC<EmployeeSetPinModalProps> = ({ open, onClose, employeeId, employeeName }) => {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const employees = useSelector((state) => state.employee.allEmployees);
  const [pin, setPin] = useState('');
  const [confirm, setConfirm] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPin('');
      setConfirm('');
      setError(null);
      setSuccess(null);
      setShow(false);
    }
  }, [open]);

  const isValid = useMemo(() => {
    if (!pin) return false;
    if (!/^\d{4,6}$/.test(pin)) return false;
    if (pin !== confirm) return false;
    return true;
  }, [pin, confirm]);

  const handleSave = async () => {
    if (!employeeId || !isValid) return;
    try {
      setLoading(true);
      setError(null);
      await setEmployeePin(employeeId, pin, currentRole?.id);
      setSuccess('PIN saved successfully.');
      // Optimistic local update so the list reflects immediately
      const target = employees.find((e: any) => e.id === employeeId);
      if (target) {
        dispatch(updateEmployeeInState({ ...target, has_kiosk_pin: true } as any));
      }
      // Refresh from server so other views see the updated PIN flag
      await dispatch(fetchEmployees() as any)
        .unwrap()
        .catch(() => null);
    } catch (e: any) {
      setError(e?.response?.data?.detail || e?.message || 'Failed to set PIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h4" component="span">
          Set Kiosk PIN
        </Typography>
        <IconButton onClick={onClose} size="small">
          <IconX size={20} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        {employeeName && (
          <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
            Employee: <strong>{employeeName}</strong>
          </Typography>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {success && (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              {success}
            </Alert>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Typography variant="body2">Saved PIN:</Typography>
              <Typography variant="body1" fontFamily="monospace">
                {pin}
              </Typography>
              <Button size="small" onClick={() => navigator.clipboard.writeText(pin)}>
                Copy
              </Button>
            </Box>
          </>
        )}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="PIN (4-6 digits)"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
            type={show ? 'text' : 'password'}
            inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 6 }}
            fullWidth
            autoFocus
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={() => setShow((s) => !s)}>
                    {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
                  </IconButton>
                </InputAdornment>
              )
            }}
            helperText={!/^\d{4,6}$/.test(pin) && pin ? 'PIN must be 4-6 digits' : ' '}
            error={!!pin && !/^\d{4,6}$/.test(pin)}
          />
          <TextField
            label="Confirm PIN"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value.replace(/\D/g, '').slice(0, 6))}
            type={show ? 'text' : 'password'}
            inputProps={{ inputMode: 'numeric', pattern: '\\d*', maxLength: 6 }}
            fullWidth
            helperText={confirm && confirm !== pin ? 'PINs do not match' : ' '}
            error={!!confirm && confirm !== pin}
          />
        </Box>
        <Typography variant="caption" color="textSecondary">
          Only admins can set or reset an employee's kiosk PIN. PINs are stored securely.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        <AnimateButton>
          <Button variant="contained" onClick={handleSave} disabled={!isValid || loading}>
            Save PIN
          </Button>
        </AnimateButton>
      </DialogActions>
    </Dialog>
  );
};
