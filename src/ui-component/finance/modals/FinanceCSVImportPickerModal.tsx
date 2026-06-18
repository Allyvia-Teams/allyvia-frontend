import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Box,
  IconButton
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { IconFileInvoice, IconReceipt, IconCreditCard } from '@tabler/icons-react';

export type FinanceImportType = 'invoices' | 'expenses' | 'payments';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (type: FinanceImportType) => void;
};

const importOptions: { type: FinanceImportType; label: string; description: string; icon: React.ReactNode }[] = [
  {
    type: 'invoices',
    label: 'Invoices',
    description: 'Import customer invoices from CSV',
    icon: <IconFileInvoice size={24} />
  },
  {
    type: 'expenses',
    label: 'Expenses',
    description: 'Import vendor bills and expenses from CSV',
    icon: <IconReceipt size={24} />
  },
  {
    type: 'payments',
    label: 'Payments',
    description: 'Import customer payments from CSV',
    icon: <IconCreditCard size={24} />
  }
];

export const FinanceCSVImportPickerModal: React.FC<Props> = ({ open, onClose, onSelect }) => {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box>
          <Typography variant="h4">Import CSV</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            What would you like to import?
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" aria-label="Close">
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ pt: 1 }}>
        <List disablePadding>
          {importOptions.map((option) => (
            <ListItemButton
              key={option.type}
              onClick={() => onSelect(option.type)}
              sx={{
                borderRadius: 1,
                mb: 1,
                border: '1px solid',
                borderColor: 'divider',
                '&:hover': {
                  borderColor: 'primary.main',
                  bgcolor: 'action.hover'
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40, color: 'primary.main' }}>{option.icon}</ListItemIcon>
              <ListItemText primary={option.label} secondary={option.description} />
            </ListItemButton>
          ))}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
      </DialogActions>
    </Dialog>
  );
};

export default FinanceCSVImportPickerModal;
