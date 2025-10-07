import React, { useState } from 'react';
import { Button, CircularProgress, Snackbar, Alert, Tooltip } from '@mui/material';
import { IconRefresh } from '@tabler/icons-react';
import { googleDriveAPI } from 'api/googleDrive.api';

interface GoogleDriveSyncProps {
  onSyncComplete?: () => void;
}

const GoogleDriveSync: React.FC<GoogleDriveSyncProps> = ({ onSyncComplete }) => {
  const [syncing, setSyncing] = useState(false);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });

  const handleSync = async () => {
    setSyncing(true);
    try {
      const result = await googleDriveAPI.syncDocuments();

      setSnackbar({
        open: true,
        message: `Sync complete: ${result.synced_count} new, ${result.updated_count} updated, ${result.deleted_count} removed`,
        severity: 'success'
      });

      // Call parent callback to refresh document list
      if (onSyncComplete) {
        onSyncComplete();
      }
    } catch (error: any) {
      console.error('Sync failed:', error);
      setSnackbar({
        open: true,
        message: error.response?.data?.error || 'Failed to sync with Google Drive',
        severity: 'error'
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <>
      <Tooltip title="Sync with Google Drive">
        <Button
          variant="outlined"
          startIcon={syncing ? <CircularProgress size={16} /> : <IconRefresh size={20} />}
          onClick={handleSync}
          disabled={syncing}
          sx={{ textTransform: 'none' }}
        >
          {syncing ? 'Syncing...' : 'Sync'}
        </Button>
      </Tooltip>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default GoogleDriveSync;
