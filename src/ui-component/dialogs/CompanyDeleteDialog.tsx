import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, CircularProgress } from '@mui/material';
import { IconAlertCircle } from '@tabler/icons-react';
import AnimateButton from 'ui-component/extended/AnimateButton';

interface CompanyDeleteDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => Promise<void>;
  companyName: string;
  isDeleting?: boolean;
}

export default function CompanyDeleteDialog({ open, onClose, onConfirm, companyName, isDeleting = false }: CompanyDeleteDialogProps) {
  const handleConfirm = async () => {
    await onConfirm();
    if (!isDeleting) {
      onClose();
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth sx={{ '& .MuiDialog-paper': { maxWidth: '750px' } }}>
      <DialogTitle>Delete Company</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, color: 'error.main' }}>
          <IconAlertCircle size={20} />
          <Typography variant="body1" color="error">
            This action cannot be undone!
          </Typography>
        </Box>
        <Typography variant="body1" gutterBottom>
          Are you sure you want to delete <strong>{companyName}</strong>?
        </Typography>
        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
          This will permanently delete:
        </Typography>
        <Box component="ul" sx={{ m: 0, pl: 3, listStyleType: 'disc' }}>
          <li>All company data</li>
          <li>QuickBooks connections</li>
          <li>Team member access</li>
          <li>Associated financial records</li>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isDeleting}>
          Cancel
        </Button>
        <AnimateButton>
          <Button
            onClick={handleConfirm}
            variant="contained"
            color="error"
            disabled={isDeleting}
            startIcon={isDeleting ? <CircularProgress size={16} color="inherit" /> : null}
          >
            {isDeleting ? 'Deleting...' : 'Delete Company'}
          </Button>
        </AnimateButton>
      </DialogActions>
    </Dialog>
  );
}
