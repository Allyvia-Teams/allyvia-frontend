import { useState, useEffect } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  Button,
  Box,
  Typography,
  Chip,
  Alert,
  FormControl
} from '@mui/material';
import { IconDeviceFloppy, IconRestore, IconPlugConnected } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { saveAccountMappingsToBackend } from 'store/slices/integrations';
import AnimateButton from 'ui-component/extended/AnimateButton';

const internalCategories = [
  'Revenue',
  'Cost of Goods Sold',
  'Operating Expenses',
  'Other Income',
  'Other Expenses',
  'Assets',
  'Liabilities',
  'Equity',
  'Not Mapped'
];

const accountTypeColors: Record<string, string> = {
  Bank: '#1976d2',
  Income: '#4caf50',
  Expense: '#f44336',
  'Accounts Receivable': '#ff9800',
  Asset: '#9c27b0',
  Liability: '#e91e63',
  Equity: '#00bcd4'
};

interface AccountMapperProps {
  isConnected?: boolean;
}

export default function AccountMapper({ isConnected = false }: AccountMapperProps) {
  const dispatch = useDispatch();
  const { quickbooks } = useSelector((state) => state.integrations);
  const { currentRole } = useSelector((state) => state.auth);
  const { isAnySyncing } = useSelector((state) => state.syncProgress);

  const { accounts, mappedCategories } = quickbooks.mapping;
  const { isFetchingAccounts } = quickbooks.ui;

  const [localMappings, setLocalMappings] = useState<Record<string, string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const companyId = currentRole?.company_id;

  useEffect(() => {
    setLocalMappings(mappedCategories);
  }, [mappedCategories]);

  const handleMappingChange = (accountId: string, category: string) => {
    setLocalMappings((prev) => ({
      ...prev,
      [accountId]: category
    }));
    setHasChanges(true);
    setShowSuccess(false);
    setError(null);
  };

  const handleSave = async () => {
    if (!companyId) {
      setError('No company selected');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await dispatch(
        saveAccountMappingsToBackend({
          companyId,
          mappings: localMappings
        })
      ).unwrap();

      setHasChanges(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err: any) {
      setError(err || 'Failed to save mappings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setLocalMappings(mappedCategories);
    setHasChanges(false);
    setShowSuccess(false);
  };

  // PRIORITY 1: Check connection status
  if (!isConnected) {
    return (
      <Alert severity="info" icon={<IconPlugConnected />}>
        <Typography variant="body1" sx={{ fontWeight: 500 }}>
          Connect to QuickBooks to view your Chart of Accounts
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Go to the Connection tab and click "Connect to QuickBooks" to get started.
        </Typography>
      </Alert>
    );
  }

  // Case 1: Currently syncing accounts from QuickBooks
  if (isAnySyncing && accounts.length === 0) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">Fetching your accounts from QuickBooks...</Typography>
        <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
          This usually takes a few moments
        </Typography>
      </Box>
    );
  }

  // Case 2: Loading from DB
  if (isFetchingAccounts) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography variant="body1">Loading your accounts...</Typography>
      </Box>
    );
  }

  // Case 3: No accounts found (shouldn't happen after sync)
  if (accounts.length === 0) {
    return <Alert severity="info">No Chart of Accounts found. Please ensure QuickBooks is connected and synced.</Alert>;
  }

  // Case 4: Display table normally
  return (
    <Box>
      {showSuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Account mappings saved successfully!
        </Alert>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Account Name</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Sub Type</TableCell>
              <TableCell>Internal Category</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {accounts.map((account) => (
              <TableRow key={account.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2">{account.fullyQualifiedName}</Typography>
                    {!account.active && <Chip label="Inactive" size="small" color="default" />}
                  </Box>
                </TableCell>
                <TableCell>
                  <Chip
                    label={account.type}
                    size="small"
                    sx={{
                      bgcolor: `${accountTypeColors[account.type] || '#757575'}15`,
                      color: accountTypeColors[account.type] || '#757575'
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {account.subType}
                  </Typography>
                </TableCell>
                <TableCell>
                  <FormControl size="small" fullWidth>
                    <Select
                      value={localMappings[account.id] || 'Not Mapped'}
                      onChange={(e) => handleMappingChange(account.id, e.target.value)}
                      sx={{ minWidth: 150 }}
                    >
                      {internalCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <AnimateButton>
          <Button variant="outlined" startIcon={<IconRestore />} onClick={handleReset} disabled={!hasChanges}>
            Reset Changes
          </Button>
        </AnimateButton>
        <AnimateButton>
          <Button variant="contained" startIcon={<IconDeviceFloppy />} onClick={handleSave} disabled={!hasChanges || isSaving}>
            {isSaving ? 'Saving...' : 'Save Mappings'}
          </Button>
        </AnimateButton>
      </Box>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Note: Account mappings are automatically saved to the backend and will persist across sessions.
        </Typography>
      </Box>
    </Box>
  );
}
