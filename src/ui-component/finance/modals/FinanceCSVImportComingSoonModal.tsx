import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import type { FinanceImportType } from './FinanceCSVImportPickerModal';

type Props = {
  open: boolean;
  importType: FinanceImportType | null;
  onClose: () => void;
};

const labels: Record<FinanceImportType, string> = {
  invoices: 'Invoices',
  expenses: 'Expenses',
  payments: 'Payments'
};

export const FinanceCSVImportComingSoonModal: React.FC<Props> = ({ open, importType, onClose }) => {
  const label = importType ? labels[importType] : 'This entity';

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        Import {label}
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body1" color="text.secondary">
          CSV import for {label.toLowerCase()} is not available yet. Expense import is ready; invoice and payment import
          will be added in a future update.
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">
          OK
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinanceCSVImportComingSoonModal;
