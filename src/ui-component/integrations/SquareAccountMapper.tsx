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
  FormControl,
  InputLabel,
  TextField,
  Autocomplete
} from '@mui/material';
import { IconDeviceFloppy, IconRestore, IconPlus, IconTrash, IconCheck, IconRefresh } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { saveSquareMappings } from 'store/slices/integrations';
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

interface SquareAccountMapperProps {
  catalog?: any[];
  locations?: any[];
  mappings?: any[];
  loading?: boolean;
  onSave?: (mappings: any[]) => void;
  onRefresh?: () => void;
}

export default function SquareAccountMapper({
  catalog = [],
  locations = [],
  mappings = [],
  loading = false,
  onSave,
  onRefresh
}: SquareAccountMapperProps) {
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state: any) => state.auth);
  const companyId = currentRole?.company_id;
  const [localMappings, setLocalMappings] = useState<any[]>([]);
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (mappings && mappings.length > 0) {
      setLocalMappings([...mappings]);
    } else if (catalog && catalog.length > 0) {
      // Initialize mappings for catalog items (limit to first 50 for performance)
      const limitedCatalog = catalog.slice(0, 50);
      const initialMappings = limitedCatalog.map((item) => ({
        id: item.id,
        external_account_id: item.id,
        external_account_name: item.name,
        internal_category: 'Not Mapped',
        account_type: 'Expense',
        is_mapped: false
      }));
      setLocalMappings(initialMappings);
    }
  }, [mappings, catalog]);

  const handleMappingChange = (itemId: string, field: string, value: string) => {
    setLocalMappings((prev) =>
      prev.map((mapping) =>
        mapping.id === itemId || mapping.external_account_id === itemId
          ? {
              ...mapping,
              [field]: value,
              is_mapped: field === 'internal_category' ? value !== 'Not Mapped' : mapping.is_mapped
            }
          : mapping
      )
    );
    setHasChanges(true);
  };

  // Update mapping status when internal_category changes
  const updateMappingStatus = (mapping: any) => {
    return {
      ...mapping,
      is_mapped: mapping.internal_category && mapping.internal_category !== 'Not Mapped'
    };
  };

  // Get available catalog items (excluding already mapped ones) - optimized for performance
  const getAvailableCatalogItems = (currentMappingId: string) => {
    const mappedItemIds = localMappings
      .filter((mapping) => mapping.id !== currentMappingId && mapping.external_account_id)
      .map((mapping) => mapping.external_account_id);

    // Limit catalog to first 100 items for better performance
    const limitedCatalog = catalog.slice(0, 100);
    return limitedCatalog.filter((item) => !mappedItemIds.includes(item.id));
  };

  const handleAddNewMapping = () => {
    const newMapping = {
      id: `new_${Date.now()}`,
      external_account_id: '',
      external_account_name: '',
      internal_category: 'Not Mapped',
      account_type: 'Expense',
      is_mapped: false,
      is_new: true
    };
    setLocalMappings((prev) => [...prev, newMapping]);
    setHasChanges(true);
  };

  const handleDeleteMapping = (itemId: string) => {
    setLocalMappings((prev) => prev.filter((mapping) => mapping.id !== itemId && mapping.external_account_id !== itemId));
    setHasChanges(true);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setSaveSuccess(false);

      // Filter out empty mappings and validate data
      const validMappings = localMappings.filter(
        (mapping) =>
          mapping.external_account_name &&
          mapping.external_account_name.trim() !== '' &&
          mapping.internal_category &&
          mapping.internal_category !== 'Not Mapped'
      );

      console.log('Saving mappings:', validMappings);
      console.log('Company ID:', companyId);
      console.log('Total mappings:', localMappings.length);
      console.log('Valid mappings:', validMappings.length);

      if (validMappings.length === 0) {
        console.warn('No valid mappings to save');
        return;
      }

      if (onSave) {
        await onSave(validMappings);
      } else {
        if (!companyId) {
          console.error('No company ID found');
          return;
        }

        console.log('Dispatching saveSquareMappings with:', { companyId, mappings: validMappings });
        const result = await dispatch(saveSquareMappings({ companyId, mappings: validMappings }) as any);
        console.log('Save result:', result);

        // Check if the save was successful
        if (result.type?.includes('rejected')) {
          throw new Error('Save failed: ' + result.payload);
        }
      }

      setHasChanges(false);
      setSaveSuccess(true);
      console.log('Save completed successfully');

      // Hide success message after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (error) {
      console.error('Error saving mappings:', error);
      // You could add an error state here to show user feedback
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    if (mappings && mappings.length > 0) {
      setLocalMappings([...mappings]);
    } else {
      const initialMappings = catalog.map((item) => ({
        id: item.id,
        external_account_id: item.id,
        external_account_name: item.name,
        internal_category: 'Not Mapped',
        account_type: 'Expense',
        is_mapped: false
      }));
      setLocalMappings(initialMappings);
    }
    setHasChanges(false);
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <Typography>Loading account mappings...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Alert severity="info" sx={{ mb: 3 }}>
        Map your Square catalog items to internal accounting categories. This helps organize your financial data for reporting and analysis.
      </Alert>

      {saveSuccess && (
        <Alert severity="success" sx={{ mb: 3 }} icon={<IconCheck />}>
          Mappings saved successfully!
        </Alert>
      )}

      <TableContainer component={Paper} sx={{ mb: 3 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Square Item</TableCell>
              <TableCell>Account Type</TableCell>
              <TableCell>Internal Category</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localMappings.map((mapping) => (
              <TableRow key={mapping.id || mapping.external_account_id}>
                <TableCell>
                  <Box>
                    {mapping.is_new ? (
                      <Autocomplete
                        freeSolo
                        options={getAvailableCatalogItems(mapping.id).map((item) => ({
                          id: item.id,
                          name: item.name,
                          label: `${item.name} (${item.id})`
                        }))}
                        value={
                          mapping.external_account_name
                            ? {
                                id: mapping.external_account_id || '',
                                name: mapping.external_account_name,
                                label: mapping.external_account_name
                              }
                            : null
                        }
                        onInputChange={(event, newValue) => {
                          if (typeof newValue === 'string') {
                            handleMappingChange(mapping.id, 'external_account_name', newValue);
                            handleMappingChange(mapping.id, 'external_account_id', '');
                          }
                        }}
                        onChange={(event, newValue) => {
                          if (newValue && typeof newValue === 'object') {
                            handleMappingChange(mapping.id, 'external_account_name', newValue.name);
                            handleMappingChange(mapping.id, 'external_account_id', newValue.id);
                          } else if (typeof newValue === 'string') {
                            handleMappingChange(mapping.id, 'external_account_name', newValue);
                            handleMappingChange(mapping.id, 'external_account_id', '');
                          }
                        }}
                        renderInput={(params) => (
                          <TextField {...params} size="small" placeholder="Search or enter item name" sx={{ minWidth: 250 }} />
                        )}
                        renderOption={(props, option) => (
                          <Box component="li" {...props}>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {option.name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ID: {option.id}
                              </Typography>
                            </Box>
                          </Box>
                        )}
                        noOptionsText="No Square items found"
                        clearOnEscape
                        selectOnFocus
                        handleHomeEndKeys
                      />
                    ) : (
                      <>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {mapping.external_account_name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          ID: {mapping.external_account_id}
                        </Typography>
                      </>
                    )}
                  </Box>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Account Type</InputLabel>
                    <Select
                      value={mapping.account_type || 'Expense'}
                      onChange={(e) => handleMappingChange(mapping.id || mapping.external_account_id, 'account_type', e.target.value)}
                      label="Account Type"
                    >
                      {Object.keys(accountTypeColors).map((type) => (
                        <MenuItem key={type} value={type}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Box
                              sx={{
                                width: 12,
                                height: 12,
                                borderRadius: '50%',
                                backgroundColor: accountTypeColors[type]
                              }}
                            />
                            {type}
                          </Box>
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      value={mapping.internal_category || 'Not Mapped'}
                      onChange={(e) => handleMappingChange(mapping.id || mapping.external_account_id, 'internal_category', e.target.value)}
                      label="Category"
                    >
                      {internalCategories.map((category) => (
                        <MenuItem key={category} value={category}>
                          {category}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip
                    label={updateMappingStatus(mapping).is_mapped ? 'Mapped' : 'Not Mapped'}
                    color={updateMappingStatus(mapping).is_mapped ? 'success' : 'default'}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Button
                    size="small"
                    color="error"
                    startIcon={<IconTrash />}
                    onClick={() => handleDeleteMapping(mapping.id || mapping.external_account_id)}
                    disabled={!mapping.is_new && !mapping.external_account_id}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}>
        <AnimateButton>
          <Button variant="outlined" startIcon={<IconPlus />} onClick={handleAddNewMapping} color="primary">
            Add New Mapping
          </Button>
        </AnimateButton>

        <Box sx={{ display: 'flex', gap: 2 }}>
          {onRefresh && (
            <AnimateButton>
              <Button variant="outlined" startIcon={<IconRefresh />} onClick={onRefresh} disabled={isSaving}>
                Refresh Items
              </Button>
            </AnimateButton>
          )}
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
      </Box>
    </Box>
  );
}
