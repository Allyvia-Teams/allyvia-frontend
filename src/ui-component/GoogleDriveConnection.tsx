import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Alert,
  CircularProgress,
  Avatar,
  Stack,
  Chip
} from '@mui/material';

// project imports
import { googleDriveAPI } from 'api/googleDrive.api';
import { GoogleDriveConnectionStatus } from 'types/documents';

// assets
import { IconBrandGoogleDrive, IconCheck, IconX } from '@tabler/icons-react';

interface GoogleDriveConnectionProps {
  open: boolean;
  onClose: () => void;
  onConnected: (status: GoogleDriveConnectionStatus) => void;
}

export default function GoogleDriveConnection({ open, onClose, onConnected }: GoogleDriveConnectionProps) {
  const [status, setStatus] = useState<GoogleDriveConnectionStatus>({ connected: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      checkConnectionStatus();
    }
  }, [open]);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      setError(null);
      const connectionStatus = await googleDriveAPI.getGoogleDriveStatus();
      setStatus(connectionStatus);
    } catch (err: any) {
      setError(err.message || 'Failed to check Google Drive connection status');
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await googleDriveAPI.connectGoogleDrive();

      // Check if response contains auth_url
      if (!('auth_url' in response)) {
        throw new Error('Invalid response from Google Drive API');
      }

      // Open Google Drive authentication in a new window
      const authWindow = window.open(response.auth_url, 'google-drive-auth', 'width=600,height=700,scrollbars=yes,resizable=yes');

      // Listen for messages from the popup
      const handleMessage = (event: MessageEvent) => {
        if (event.origin !== window.location.origin) return;

        if (event.data.type === 'GOOGLE_DRIVE_AUTH_SUCCESS') {
          setLoading(false);
          checkConnectionStatus();
          onConnected({ connected: true });
        } else if (event.data.type === 'GOOGLE_DRIVE_AUTH_ERROR') {
          setLoading(false);
          setError(`Authentication failed: ${event.data.error}`);
        }
      };

      window.addEventListener('message', handleMessage);

      // Poll for authentication completion (fallback)
      const pollAuth = setInterval(async () => {
        if (authWindow?.closed) {
          clearInterval(pollAuth);
          window.removeEventListener('message', handleMessage);
          setLoading(false);
          // Check connection status after auth window closes
          await checkConnectionStatus();
        }
      }, 1000);
    } catch (err: any) {
      setError(err.message || 'Failed to initiate Google Drive connection');
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      setLoading(true);
      setError(null);
      await googleDriveAPI.disconnectGoogleDrive();
      setStatus({ connected: false });
      onConnected({ connected: false });
    } catch (err: any) {
      setError(err.message || 'Failed to disconnect Google Drive');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    onConnected(status);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={2} alignItems="center">
          <IconBrandGoogleDrive size={24} />
          <Typography variant="h6">Google Drive Integration</Typography>
        </Stack>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {error && (
            <Alert severity="error" onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {loading && (
            <Box display="flex" justifyContent="center" alignItems="center" py={3}>
              <CircularProgress />
              <Typography variant="body2" sx={{ ml: 2 }}>
                {status.connected ? 'Disconnecting...' : 'Connecting...'}
              </Typography>
            </Box>
          )}

          {!loading && (
            <>
              {status.connected ? (
                <Box>
                  <Alert severity="success" sx={{ mb: 2 }}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <IconCheck size={20} />
                      <Typography variant="body2">Google Drive is connected</Typography>
                    </Stack>
                  </Alert>

                  {status.user_info && (
                    <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Avatar src={status.user_info.profile_photo} sx={{ width: 48, height: 48 }}>
                          {status.user_info.display_name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle1" fontWeight="bold">
                            {status.user_info.display_name}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            {status.user_info.email}
                          </Typography>
                        </Box>
                      </Stack>
                    </Box>
                  )}

                  <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
                    You can now access your Google Drive files, upload documents, and share files directly from Allyvia.
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Alert severity="info" sx={{ mb: 2 }}>
                    Connect your Google Drive account to access and manage your files directly from Allyvia.
                  </Alert>

                  <Box sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      What you can do with Google Drive integration:
                    </Typography>
                    <Stack spacing={1}>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCheck size={16} color="green" />
                        View and manage your Google Drive files
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCheck size={16} color="green" />
                        Upload files directly to Google Drive
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCheck size={16} color="green" />
                        Share files with unique links
                      </Typography>
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <IconCheck size={16} color="green" />
                        Organize files in folders
                      </Typography>
                    </Stack>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={loading}>
          {status.connected ? 'Close' : 'Cancel'}
        </Button>

        {status.connected ? (
          <Button onClick={handleDisconnect} disabled={loading} color="error" startIcon={<IconX size={20} />}>
            Disconnect
          </Button>
        ) : (
          <Button onClick={handleConnect} disabled={loading} variant="contained" startIcon={<IconBrandGoogleDrive size={20} />}>
            Connect Google Drive
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
