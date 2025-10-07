import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Alert,
  CircularProgress,
  IconButton,
  Paper
} from '@mui/material';
import { IconCopy, IconX } from '@tabler/icons-react';
import AnimateButton from 'ui-component/extended/AnimateButton';
import axiosServices from 'utils/axios';
import { useSelector } from 'store';

interface EmployeeCredentialsModalProps {
  open: boolean;
  onClose: () => void;
  onCopySuccess: () => void;
}

interface ViewerCredentials {
  email: string;
  password: string;
  note?: string;
}

export const EmployeeCredentialsModal: React.FC<EmployeeCredentialsModalProps> = ({ open, onClose, onCopySuccess }) => {
  const [credentials, setCredentials] = useState<ViewerCredentials | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { currentRole } = useSelector((state) => state.auth);

  useEffect(() => {
    if (open && currentRole?.company_id) {
      fetchCredentials();
    }
  }, [open, currentRole?.company_id]);

  const fetchCredentials = async () => {
    // First check sessionStorage for credentials (available right after registration)
    const storedCredentials = sessionStorage.getItem('viewer_credentials');
    if (storedCredentials) {
      try {
        const parsed = JSON.parse(storedCredentials);
        setCredentials(parsed);
        setError(null);
        return;
      } catch (e) {
        // Invalid JSON, fetch from backend
      }
    }

    // Fetch from backend
    if (!currentRole?.company_id) {
      setError('No company selected');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const response = await axiosServices.get(`/company/${currentRole.company_id}/viewer-credentials/`);
      setCredentials(response.data);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch credentials');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyCredentials = async () => {
    if (!credentials) return;

    const textToCopy = `Email: ${credentials.email}\nPassword: ${credentials.password}`;

    try {
      await navigator.clipboard.writeText(textToCopy);
      onCopySuccess();
      // Close modal after short delay to show success
      setTimeout(() => {
        onClose();
      }, 1000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Intentionally no kiosk launcher here to prevent employees from discovering kiosk flow from admin modal

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2
        }
      }}
    >
      <DialogTitle sx={{ pb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="h4">Employee Portal Credentials</Typography>
          <IconButton onClick={onClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
          Share these credentials with your employees for read-only access to the system.
        </Typography>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress size={40} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {credentials && !loading && (
          <Paper
            variant="outlined"
            sx={{
              p: 2,
              backgroundColor: 'background.default',
              fontFamily: 'monospace'
            }}
          >
            <Box sx={{ mb: 1 }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Email: {credentials.email}
              </Typography>
            </Box>
            <Box>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Password: {credentials.password}
              </Typography>
            </Box>
          </Paper>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button onClick={onClose} color="inherit">
          Close
        </Button>
        {credentials && (
          <AnimateButton>
            <Button variant="contained" startIcon={<IconCopy size={18} />} onClick={handleCopyCredentials} disabled={loading}>
              Copy Credentials
            </Button>
          </AnimateButton>
        )}
      </DialogActions>
    </Dialog>
  );
};
