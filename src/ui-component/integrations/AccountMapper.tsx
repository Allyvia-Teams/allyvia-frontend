import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
  Alert,
  CircularProgress,
  Grid
} from '@mui/material';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from 'store';
import { SquareAccountMapping, SquareCatalogItem } from 'types/entities';

interface AccountMapperProps {
  provider: 'square' | 'quickbooks';
  catalog: SquareCatalogItem[];
  locations: any[];
  mappings: SquareAccountMapping[];
  loading: boolean;
  onSave: (mappings: SquareAccountMapping[]) => void;
}

const AccountMapper: React.FC<AccountMapperProps> = ({
  provider,
  catalog,
  locations,
  mappings,
  loading,
  onSave
}) => {
  const [localMappings, setLocalMappings] = useState<SquareAccountMapping[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setLocalMappings([...mappings]);
  }, [mappings]);

  const handleMappingChange = (index: number, field: keyof SquareAccountMapping, value: string) => {
    const newMappings = [...localMappings];
    newMappings[index] = {
      ...newMappings[index],
      [field]: value
    };
    setLocalMappings(newMappings);
    setHasChanges(true);
  };

  const handleAddMapping = () => {
    const newMapping: SquareAccountMapping = {
      id: `temp-${Date.now()}`,
      external_account_id: '',
      external_account_name: '',
      external_type: 'CATEGORY',
      internal_category: ''
    };
    setLocalMappings([...localMappings, newMapping]);
    setHasChanges(true);
  };

  const handleRemoveMapping = (index: number) => {
    const newMappings = localMappings.filter((_, i) => i !== index);
    setLocalMappings(newMappings);
    setHasChanges(true);
  };

  const handleSave = () => {
    // Filter out empty mappings
    const validMappings = localMappings.filter(
      mapping => mapping.external_account_id && mapping.internal_category
    );
    onSave(validMappings);
    setHasChanges(false);
  };

  const internalCategories = [
    'Revenue',
    'Cost of Goods Sold',
    'Operating Expenses',
    'Marketing',
    'Administrative',
    'Research & Development',
    'Other Income',
    'Other Expenses'
  ];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" py={4}>
        <CircularProgress />
        <Typography variant="body1" sx={{ ml: 2 }}>
          Loading {provider} catalog...
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Account Mappings - {provider === 'square' ? 'Square' : 'QuickBooks'}
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            onClick={handleAddMapping}
            sx={{ mr: 1 }}
          >
            Add Mapping
          </Button>
          <Button 
            variant="contained" 
            onClick={handleSave}
            disabled={!hasChanges}
          >
            Save Mappings
          </Button>
        </Box>
      </Box>

      {catalog.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>
          No catalog items found. Please ensure your {provider} integration is properly connected and has catalog data.
        </Alert>
      )}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>External Account</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Internal Category</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {localMappings.map((mapping, index) => (
              <TableRow key={mapping.id}>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={mapping.external_account_id}
                      onChange={(e) => {
                        const selectedItem = catalog.find(item => item.id === e.target.value);
                        handleMappingChange(index, 'external_account_id', e.target.value);
                        if (selectedItem) {
                          handleMappingChange(index, 'external_account_name', selectedItem.name);
                          handleMappingChange(index, 'external_type', selectedItem.type);
                        }
                      }}
                    >
                      {catalog.map((item) => (
                        <MenuItem key={item.id} value={item.id}>
                          {item.name} ({item.type})
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell>
                  <Chip 
                    label={mapping.external_type} 
                    size="small" 
                    color={mapping.external_type === 'CATEGORY' ? 'primary' : 'secondary'}
                  />
                </TableCell>
                <TableCell>
                  <FormControl fullWidth size="small">
                    <Select
                      value={mapping.internal_category}
                      onChange={(e) => handleMappingChange(index, 'internal_category', e.target.value)}
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
                  <Button 
                    size="small" 
                    color="error"
                    onClick={() => handleRemoveMapping(index)}
                  >
                    Remove
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {localMappings.length === 0 && (
        <Box textAlign="center" py={4}>
          <Typography variant="body1" color="textSecondary">
            No mappings configured yet. Click "Add Mapping" to create your first mapping.
          </Typography>
        </Box>
      )}

      <Box mt={2}>
        <Typography variant="body2" color="textSecondary">
          <strong>Tip:</strong> Map your {provider} categories and items to Allyvia's internal categories 
          to ensure proper data classification and reporting.
        </Typography>
      </Box>
    </Box>
  );
};

export default AccountMapper;
