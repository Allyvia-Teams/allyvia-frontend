import React from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography, Box, IconButton, useTheme } from '@mui/material';
import { IconX, IconTrash } from '@tabler/icons-react';

interface ConfirmDeleteProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  itemName?: string;
  loading?: boolean;
  confirmText?: string;
  cancelText?: string;
  severity?: 'warning' | 'error';
}

const ConfirmDelete: React.FC<ConfirmDeleteProps> = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Delete',
  message = 'Are you sure you want to delete this item?',
  itemName,
  loading = false,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  severity = 'warning'
}) => {
  const theme = useTheme();

  const handleConfirm = () => {
    onConfirm();
  };

  const getSeverityColor = () => {
    switch (severity) {
      case 'error':
        return theme.palette.error.main;
      case 'warning':
      default:
        return theme.palette.warning.main;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          boxShadow: theme.shadows[8]
        }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: `${getSeverityColor()}15`,
                color: getSeverityColor()
              }}
            >
              <IconTrash size={20} />
            </Box>
            <Typography variant="h5" fontWeight="600">
              {title}
            </Typography>
          </Box>
          <IconButton
            onClick={onClose}
            size="small"
            sx={{
              color: 'text.secondary',
              '&:hover': {
                backgroundColor: 'action.hover'
              }
            }}
          >
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2, pb: 3 }}>
        <Typography variant="body1" color="text.secondary" sx={{ mb: itemName ? 1 : 0 }}>
          {message}
        </Typography>
        {itemName && (
          <Box
            sx={{
              p: 2,
              borderRadius: 1,
              backgroundColor: 'grey.50',
              border: '1px solid',
              borderColor: 'grey.200',
              mt: 2
            }}
          >
            <Typography variant="body2" fontWeight="500" color="text.primary">
              {itemName}
            </Typography>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3, gap: 1 }}>
        <Button
          onClick={onClose}
          variant="outlined"
          disabled={loading}
          sx={{
            minWidth: 100,
            borderColor: 'grey.300',
            color: 'text.secondary',
            '&:hover': {
              borderColor: 'grey.400',
              backgroundColor: 'grey.50'
            }
          }}
        >
          {cancelText}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            minWidth: 100,
            backgroundColor: getSeverityColor(),
            color: 'white',
            '&:hover': {
              backgroundColor: getSeverityColor(),
              opacity: 0.9
            },
            '&:disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500'
            }
          }}
        >
          {loading ? 'Deleting...' : confirmText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDelete;
