import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton,
  useTheme
} from '@mui/material';
import { IconX, IconInfoCircle, IconAlertTriangle, IconAlertCircle } from '@tabler/icons-react';

export type ConfirmActionVariant = 'primary' | 'warning' | 'error';

export interface ConfirmActionDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel?: string;
  variant?: ConfirmActionVariant;
  loading?: boolean;
  loadingLabel?: string;
}

const ConfirmActionDialog: React.FC<ConfirmActionDialogProps> = ({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel = 'Cancel',
  variant = 'primary',
  loading = false,
  loadingLabel
}) => {
  const theme = useTheme();

  const handleConfirm = () => {
    onConfirm();
  };

  const getVariantColor = () => {
    switch (variant) {
      case 'error':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'primary':
      default:
        return theme.palette.primary.main;
    }
  };

  const getIcon = () => {
    switch (variant) {
      case 'error':
        return <IconAlertCircle size={20} />;
      case 'warning':
        return <IconAlertTriangle size={20} />;
      case 'primary':
      default:
        return <IconInfoCircle size={20} />;
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
                backgroundColor: `${getVariantColor()}15`,
                color: getVariantColor()
              }}
            >
              {getIcon()}
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
        <Typography variant="body1" color="text.secondary">
          {message}
        </Typography>
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
          {cancelLabel}
        </Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          disabled={loading}
          sx={{
            minWidth: 100,
            backgroundColor: getVariantColor(),
            color: 'white',
            '&:hover': {
              backgroundColor: getVariantColor(),
              opacity: 0.9
            },
            '&:disabled': {
              backgroundColor: 'grey.300',
              color: 'grey.500'
            }
          }}
        >
          {loading && loadingLabel ? loadingLabel : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmActionDialog;
