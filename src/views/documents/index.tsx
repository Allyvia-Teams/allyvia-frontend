import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

// material-ui
import { Box, Button, Stack, Typography, Alert, CircularProgress } from '@mui/material';

// project imports
import MainCard from 'ui-component/cards/MainCard';
import GoogleDriveConnection from 'ui-component/GoogleDriveConnection';
import DocumentsManager from 'ui-component/DocumentsManager';
import { googleDriveAPI } from 'api/googleDrive.api';
import { GoogleDriveConnectionStatus } from 'types/documents';

// assets
import { IconBrandGoogleDrive, IconX } from '@tabler/icons-react';

// ==============================|| DOCUMENTS PAGE ||============================== //

export default function DocumentsPage() {
  const [searchParams] = useSearchParams();
  const [connectionStatus, setConnectionStatus] = useState<GoogleDriveConnectionStatus>({ connected: false });
  const [showConnectionDialog, setShowConnectionDialog] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkGoogleDriveStatus();

    // Handle URL parameters for connection status
    const connected = searchParams.get('connected');
    const error = searchParams.get('error');

    if (connected === 'true') {
      // Connection successful - refresh status
      setTimeout(() => {
        checkGoogleDriveStatus();
      }, 1000);
    } else if (error) {
      // Connection failed - show error
      console.error('Google Drive connection error:', error);
    }
  }, [searchParams]);

  const checkGoogleDriveStatus = async () => {
    try {
      setLoading(true);
      const status = await googleDriveAPI.getGoogleDriveStatus();
      setConnectionStatus(status);
    } catch (error) {
      console.error('Failed to check Google Drive status:', error);
      setConnectionStatus({ connected: false });
    } finally {
      setLoading(false);
    }
  };

  const handleConnectionChange = (status: GoogleDriveConnectionStatus) => {
    setConnectionStatus(status);
    setShowConnectionDialog(false);
  };

  if (loading) {
    return (
      <MainCard title="Documents">
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography variant="body2" sx={{ ml: 2 }}>
            Checking Google Drive connection...
          </Typography>
        </Box>
      </MainCard>
    );
  }

  return (
    <MainCard
      title="Documents"
      secondary={
        <Stack direction="row" spacing={1}>
          <Button
            variant={connectionStatus.connected ? 'outlined' : 'contained'}
            startIcon={connectionStatus.connected ? <IconX size={20} /> : <IconBrandGoogleDrive size={20} />}
            onClick={() => setShowConnectionDialog(true)}
            sx={{ textTransform: 'none' }}
          >
            {connectionStatus.connected ? 'Disconnect Google Drive' : 'Connect to Google Drive'}
          </Button>
        </Stack>
      }
    >
      {connectionStatus.connected ? (
        <DocumentsManager connectionStatus={connectionStatus} />
      ) : (
        <Box>
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Connect to Google Drive to manage your documents
            </Typography>
            <Typography variant="body2">
              Connect your Google Drive account to access, upload, and share files directly from Allyvia. You'll be able to organize files
              in folders, share documents with unique links, and collaborate seamlessly.
            </Typography>
          </Alert>

          <Box sx={{ textAlign: 'center', py: 4 }}>
            <IconBrandGoogleDrive size={64} style={{ color: '#666', marginBottom: 16 }} />
            <Typography variant="h6" gutterBottom>
              Google Drive Integration Required
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 3 }}>
              Connect your Google Drive account to start managing your documents
            </Typography>
            <Button
              variant="contained"
              size="large"
              startIcon={<IconBrandGoogleDrive size={20} />}
              onClick={() => setShowConnectionDialog(true)}
              sx={{ textTransform: 'none' }}
            >
              Connect to Google Drive
            </Button>
          </Box>
        </Box>
      )}

      <GoogleDriveConnection
        open={showConnectionDialog}
        onClose={() => setShowConnectionDialog(false)}
        onConnected={handleConnectionChange}
      />
    </MainCard>
  );
}
