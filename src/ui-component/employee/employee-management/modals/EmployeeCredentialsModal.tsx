import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField
} from '@mui/material';
import { employeeAPI } from 'api/employee.api';
import { useEmployeePermissions } from 'hooks/usePermission';
import { useSelector } from 'store';
import type { EmployeeListItem } from 'types/employee';

interface EmployeeCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  onUpdated: () => void;
}

/** Individual account setup uses the same server-gated lifecycle as employee details. */
export function EmployeeCredentialsModal({ open, onClose, onUpdated }: EmployeeCredentialsModalProps) {
  const { manage } = useEmployeePermissions();
  const companyId = useSelector((state) => state.auth.currentRole?.company_id);
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setEmployees([]);
    setEmployeeId('');
    setError(null);
    setMessage(null);
    if (!open || !manage || !companyId) return;
    let cancelled = false;
    setLoading(true);
    employeeAPI
      .getEmployees(companyId)
      .then((rows) => {
        if (!cancelled) setEmployees(rows);
      })
      .catch(() => {
        if (!cancelled) setError('Could not load employee accounts.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, manage, companyId]);

  const sendWelcome = async () => {
    if (!manage || !employeeId || sending) return;
    setSending(true);
    setError(null);
    setMessage(null);
    try {
      const result = await employeeAPI.resendWelcomeEmail(employeeId);
      setMessage(result.message || 'Welcome email sent.');
      onUpdated();
    } catch {
      setError('Could not send the welcome email. Check your access and try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open && manage} onClose={sending ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Employee account access</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Alert severity="info">Send an employee a welcome email to set up their individual account.</Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {message && <Alert severity="success">{message}</Alert>}
          {loading ? (
            <CircularProgress size={24} />
          ) : (
            <TextField
              select
              label="Employee"
              value={employeeId}
              onChange={(event) => setEmployeeId(event.target.value)}
              disabled={sending}
              fullWidth
            >
              {employees.map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.full_name} — {employee.email}
                </MenuItem>
              ))}
            </TextField>
          )}
          {!loading && employees.length === 0 && !error && <Alert severity="info">Add an employee to manage their account access.</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={sending}>
          Close
        </Button>
        <Button variant="contained" onClick={sendWelcome} disabled={!employeeId || loading || sending}>
          {sending ? 'Sending…' : 'Send welcome email'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
