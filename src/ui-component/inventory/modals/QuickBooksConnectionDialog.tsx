// src/ui-component/inventory/QuickBooksConnectionDialog.tsx
// Dialog to prompt users to connect to QuickBooks when needed

import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, Alert, Stack } from '@mui/material';
import { IconExternalLink, IconSettings } from '@tabler/icons-react';
import { useNavigate } from 'react-router-dom';

interface QuickBooksConnectionDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
}

export const QuickBooksConnectionDialog: React.FC<QuickBooksConnectionDialogProps> = ({
  open,
  onClose,
  title = 'QuickBooks Connection Required',
  message = 'To access time-based inventory data and trends, you need to connect your QuickBooks account.'
}) => {
  const navigate = useNavigate();

  // Single CTA: open Integrations page where user can connect
  const handleOpenIntegrationsAndConnect = () => {
    navigate('/integrations');
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconSettings size={24} />
          <Typography variant="h6">{title}</Typography>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Stack spacing={2}>
          <Alert severity="info" sx={{ mb: 2 }}>
            {message}
          </Alert>

          <Typography variant="body2" color="text.secondary">
            QuickBooks integration provides:
          </Typography>

          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" color="text.secondary">
              Real-time inventory data
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Historical trends and analytics
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Automatic data synchronization
            </Typography>
            <Typography component="li" variant="body2" color="text.secondary">
              Date range filtering
            </Typography>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>

        <Button onClick={handleOpenIntegrationsAndConnect} variant="contained" startIcon={<IconExternalLink size={16} />}>
          Open Integrations & Connect
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default QuickBooksConnectionDialog;
