import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Alert,
  Autocomplete
} from '@mui/material';
import { IconX, IconPackage, IconAlertTriangle } from '@tabler/icons-react';
import { InventoryItem, InventoryFormData } from '../../../types/inventory';
import { useDispatch, useSelector } from '../../../store';
import { createInventoryItem, updateInventoryItem, clearError } from '../../../store/slices/inventory';
import { getCategoriesByItemType } from '../../../utils/inventoryUtils';

interface InventoryModalProps {
  open: boolean;
  onClose: () => void;
  mode: 'add' | 'edit';
  item?: InventoryItem | null; // Required for edit mode
  prefilledBarcode?: string; // Optional for add mode
}

const InventoryModal: React.FC<InventoryModalProps> = ({ open, onClose, mode, item, prefilledBarcode }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.inventory);

  const [formData, setFormData] = useState<InventoryFormData>({
    name: '',
    sku: '',
    description: '',
    quantity_on_hand: 0,
    unit_price: 0,
    cost_price: 0,
    category: '',
    reorder_point: 0,
    barcode: '',
    max_stock_level: 0,
    item_type: 'Inventory',
    status: 'active',
    is_taxable: false,
    weight: 0,
    dimensions_length: 0,
    dimensions_width: 0,
    dimensions_height: 0,
    location: '',
    bin_location: ''
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Get categories based on current item type
  const categories = getCategoriesByItemType(formData.item_type || 'Inventory');

  // Helper functions to determine field visibility based on item type and mode
  const isInventory = formData.item_type === 'Inventory';
  const isNonInventory = formData.item_type === 'NonInventory';

  // Inventory fields visibility
  const showInventoryFields = isInventory;
  const showQuantityOnHand = isInventory; // Show for both create and edit modes

  // Physical fields visibility (Inventory and NonInventory only)
  const showPhysicalFields = isInventory || isNonInventory;

  // Initialize form data based on mode
  useEffect(() => {
    if (open) {
      // Clear any previous errors and reset form when modal opens
      dispatch(clearError());
      setValidationErrors({});

      if (mode === 'edit' && item) {
        // Edit mode: populate form with existing item data
        setFormData({
          name: item.name || '',
          sku: item.sku || '',
          description: item.description || '',
          quantity_on_hand: item.quantity_on_hand || 0,
          unit_price: item.unit_price || 0,
          cost_price: item.cost_price || 0,
          category: item.category || '',
          reorder_point: item.reorder_point || 0,
          barcode: item.barcode || '',
          max_stock_level: (item as any).max_stock_level || 0,
          item_type: (item as any).item_type || 'Inventory',
          status: (item as any).status || 'active',
          is_taxable: (item as any).is_taxable ?? false,
          weight: (item as any).weight || 0,
          dimensions_length: (item as any).dimensions_length || 0,
          dimensions_width: (item as any).dimensions_width || 0,
          dimensions_height: (item as any).dimensions_height || 0,
          location: (item as any).location || '',
          bin_location: (item as any).bin_location || ''
        });
      } else {
        // Add mode: reset to default values
        setFormData({
          name: '',
          sku: '',
          description: '',
          quantity_on_hand: 0,
          unit_price: 0,
          cost_price: 0,
          category: '',
          reorder_point: 0,
          barcode: prefilledBarcode || '',
          max_stock_level: 0,
          item_type: 'Inventory',
          status: 'active',
          is_taxable: false,
          weight: 0,
          dimensions_length: 0,
          dimensions_width: 0,
          dimensions_height: 0,
          location: '',
          bin_location: ''
        });
      }
    }
  }, [open, mode, item, prefilledBarcode, dispatch]);

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Always required fields
    if (!formData.name.trim()) {
      errors.name = 'Product name is required';
    }

    if (!formData.item_type) {
      errors.item_type = 'Item type is required';
    }

    // Conditional validation based on item type
    if (showQuantityOnHand) {
      if (formData.quantity_on_hand < 0) {
        errors.quantity_on_hand = 'Quantity cannot be negative';
      }
    }

    if (showInventoryFields) {
      if ((formData.reorder_point || 0) < 0) {
        errors.reorder_point = 'Reorder point cannot be negative';
      }

      if ((formData.max_stock_level || 0) < 0) {
        errors.max_stock_level = 'Max stock level cannot be negative';
      }

      // Reorder point should be less than max stock level
      if ((formData.reorder_point || 0) >= (formData.max_stock_level || 0) && (formData.max_stock_level || 0) > 0) {
        errors.reorder_point = 'Reorder point must be less than max stock level';
      }
    }

    // General validation (always applies)
    if (formData.unit_price < 0) {
      errors.unit_price = 'Unit price cannot be negative';
    }

    if (formData.cost_price && formData.cost_price < 0) {
      errors.cost_price = 'Cost price cannot be negative';
    }

    if (showPhysicalFields && (formData.weight || 0) < 0) {
      errors.weight = 'Weight cannot be negative';
    }

    // Dimensions validation: all three dimensions are necessary or none
    if (showPhysicalFields) {
      const hasLength = (formData.dimensions_length || 0) > 0;
      const hasWidth = (formData.dimensions_width || 0) > 0;
      const hasHeight = (formData.dimensions_height || 0) > 0;

      const dimensionCount = [hasLength, hasWidth, hasHeight].filter(Boolean).length;

      if (dimensionCount > 0 && dimensionCount < 3) {
        errors.dimensions_length = 'All three dimensions (Length, Width, Height) are required together';
        errors.dimensions_width = 'All three dimensions (Length, Width, Height) are required together';
        errors.dimensions_height = 'All three dimensions (Length, Width, Height) are required together';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleInputChange = (field: keyof InventoryFormData, value: any) => {
    setFormData((prev) => {
      const newData = { ...prev, [field]: value };

      // Auto-reset fields based on item type selection
      if (field === 'item_type') {
        switch (value) {
          case 'NonInventory':
            // Clear inventory-specific fields
            newData.quantity_on_hand = 0;
            newData.reorder_point = 0;
            newData.max_stock_level = 0;
            newData.bin_location = '';
            break;
          case 'Service':
            // Clear inventory and physical fields
            newData.quantity_on_hand = 0;
            newData.reorder_point = 0;
            newData.max_stock_level = 0;
            newData.weight = 0;
            newData.dimensions_length = 0;
            newData.dimensions_width = 0;
            newData.dimensions_height = 0;
            newData.bin_location = '';
            break;
          case 'Inventory':
            // Keep all fields as they are
            break;
        }
      }

      return newData;
    });

    // Clear validation error when user starts typing
    if (validationErrors[field]) {
      setValidationErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      if (mode === 'add') {
        await dispatch(createInventoryItem(formData) as any);
      } else if (mode === 'edit' && item) {
        // Include all form data for updates
        await dispatch(
          updateInventoryItem({
            itemId: item.id,
            itemData: formData
          }) as any
        );
      }

      onClose();
    } catch (err) {
      console.error(`Failed to ${mode} item:`, err);
    }
  };

  const handleClose = () => {
    // Clear errors and reset form state when closing
    dispatch(clearError());
    setValidationErrors({});
    setFormData({
      name: '',
      sku: '',
      description: '',
      quantity_on_hand: 0,
      unit_price: 0,
      cost_price: 0,
      category: '',
      reorder_point: 0,
      barcode: '',
      max_stock_level: 0,
      item_type: 'Inventory',
      status: 'active',
      is_taxable: false,
      weight: 0,
      dimensions_length: 0,
      dimensions_width: 0,
      dimensions_height: 0,
      location: '',
      bin_location: ''
    });
    onClose();
  };

  // Check stock status (only for edit mode and Inventory items)
  const isLowStock =
    mode === 'edit' && isInventory && formData.quantity_on_hand <= (formData.reorder_point ?? 0) && formData.quantity_on_hand > 0;
  const isOutOfStock = mode === 'edit' && isInventory && formData.quantity_on_hand === 0;

  // Modal configuration based on mode
  const modalConfig = {
    title: mode === 'add' ? 'Add Inventory Item' : 'Edit Inventory Item',
    icon: IconPackage,
    iconColor: '#1976d2',
    buttonText: mode === 'add' ? 'Add Item' : 'Update Item',
    buttonLoadingText: mode === 'add' ? 'Adding Item...' : 'Updating Item...',
    subtitle:
      mode === 'add'
        ? 'Create a new inventory item with all necessary details'
        : `${item?.name || 'Unknown Product'} • ${item?.sku || 'No SKU'} • ${item?.category || 'No Category'}`
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ p: 3, pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <modalConfig.icon size={24} color={modalConfig.iconColor} />
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                {modalConfig.title}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {modalConfig.subtitle}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={handleClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: 3 }}>
        {/* Stock Status Alert - Only show for edit mode and Inventory items */}
        {mode === 'edit' && isInventory && (isLowStock || isOutOfStock) && (
          <Alert severity={isOutOfStock ? 'error' : 'warning'} sx={{ mb: 3 }} icon={<IconAlertTriangle size={20} />}>
            <Typography variant="body1" fontWeight="600">
              {isOutOfStock ? 'Out of Stock' : 'Low Stock Alert'}
            </Typography>
            <Typography variant="body2">
              {isOutOfStock
                ? 'This item is currently out of stock. Consider restocking soon.'
                : `Stock level (${formData.quantity_on_hand}) is at or below reorder point (${formData.reorder_point}).`}
            </Typography>
          </Alert>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* Item Configuration Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Item Configuration
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <FormControl fullWidth size="small" error={!!validationErrors.item_type}>
                  <InputLabel>Item Type *</InputLabel>
                  <Select value={formData.item_type} onChange={(e) => handleInputChange('item_type', e.target.value)} label="Item Type *">
                    <MenuItem value="Inventory">Inventory</MenuItem>
                    <MenuItem value="NonInventory">Non-Inventory</MenuItem>
                    <MenuItem value="Service">Service</MenuItem>
                  </Select>
                  {validationErrors.item_type && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                      {validationErrors.item_type}
                    </Typography>
                  )}
                </FormControl>
              </Grid>

              <Grid size={6}>
                <Autocomplete
                  options={categories}
                  value={formData.category || ''}
                  onChange={(event, newValue) => {
                    handleInputChange('category', newValue || '');
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Category"
                      size="small"
                      error={!!validationErrors.category}
                      helperText={validationErrors.category}
                      placeholder="Search or select category..."
                    />
                  )}
                  freeSolo
                  disableClearable
                  fullWidth
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Basic Information Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Basic Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Product Name *"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  error={!!validationErrors.name}
                  helperText={validationErrors.name}
                  fullWidth
                  size="small"
                  placeholder="e.g., Wireless Bluetooth Headphones"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="SKU"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  error={!!validationErrors.sku}
                  helperText={validationErrors.sku}
                  fullWidth
                  size="small"
                  placeholder="e.g., WH-001-BLK"
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Barcode"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Optional barcode or product code"
                />
              </Grid>

              <Grid size={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select value={formData.status} onChange={(e) => handleInputChange('status', e.target.value)} label="Status">
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                    <MenuItem value="discontinued">Discontinued</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              <Grid size={12}>
                <TextField
                  label="Description"
                  multiline
                  rows={3}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="Describe the product features and specifications..."
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Pricing Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Pricing
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Unit Price"
                  type="number"
                  value={formData.unit_price}
                  onChange={(e) => handleInputChange('unit_price', parseFloat(e.target.value) || 0)}
                  error={!!validationErrors.unit_price}
                  helperText={validationErrors.unit_price}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                  }}
                />
              </Grid>

              <Grid size={6}>
                <TextField
                  label="Cost Price"
                  type="number"
                  value={formData.cost_price}
                  onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value) || 0)}
                  error={!!validationErrors.cost_price}
                  helperText={validationErrors.cost_price}
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                  }}
                />
              </Grid>
            </Grid>
          </Grid>

          {/* Inventory Management Section - Only show for Inventory items */}
          {showInventoryFields && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Inventory Management
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                {showQuantityOnHand && (
                  <Grid size={6}>
                    <TextField
                      label="Quantity on Hand"
                      type="number"
                      value={formData.quantity_on_hand}
                      onChange={(e) => handleInputChange('quantity_on_hand', parseInt(e.target.value) || 0)}
                      error={!!validationErrors.quantity_on_hand}
                      helperText={validationErrors.quantity_on_hand}
                      fullWidth
                      size="small"
                    />
                  </Grid>
                )}

                <Grid size={6}>
                  <TextField
                    label="Reorder Point"
                    type="number"
                    value={formData.reorder_point}
                    onChange={(e) => handleInputChange('reorder_point', parseInt(e.target.value) || 0)}
                    error={!!validationErrors.reorder_point}
                    helperText={validationErrors.reorder_point}
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={6}>
                  <TextField
                    label="Max Stock Level"
                    type="number"
                    value={formData.max_stock_level}
                    onChange={(e) => handleInputChange('max_stock_level', parseInt(e.target.value) || 0)}
                    error={!!validationErrors.max_stock_level}
                    helperText={validationErrors.max_stock_level}
                    fullWidth
                    size="small"
                  />
                </Grid>

                <Grid size={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Tax Status</InputLabel>
                    <Select
                      value={formData.is_taxable ? 'taxable' : 'non-taxable'}
                      onChange={(e) => handleInputChange('is_taxable', e.target.value === 'taxable')}
                      label="Tax Status"
                    >
                      <MenuItem value="taxable">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'success.main' }} />
                          <Typography>Taxable Item</Typography>
                        </Box>
                      </MenuItem>
                      <MenuItem value="non-taxable">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: 'grey.400' }} />
                          <Typography>Non-Taxable Item</Typography>
                        </Box>
                      </MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Physical Properties Section - Only show for Inventory and NonInventory items */}
          {showPhysicalFields && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Physical Properties
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <TextField
                    label="Weight (lbs)"
                    type="number"
                    value={formData.weight}
                    onChange={(e) => handleInputChange('weight', parseFloat(e.target.value) || 0)}
                    error={!!validationErrors.weight}
                    helperText={validationErrors.weight}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>lbs</Typography>
                    }}
                  />
                </Grid>

                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
                    Dimensions (Length × Width × Height)
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                    All three dimensions must be provided together or left empty
                  </Typography>
                </Grid>

                <Grid size={4}>
                  <TextField
                    label="Length (in)"
                    type="number"
                    value={formData.dimensions_length}
                    onChange={(e) => handleInputChange('dimensions_length', parseFloat(e.target.value) || 0)}
                    error={!!validationErrors.dimensions_length}
                    helperText={validationErrors.dimensions_length || 'Length in inches'}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                    }}
                  />
                </Grid>

                <Grid size={4}>
                  <TextField
                    label="Width (in)"
                    type="number"
                    value={formData.dimensions_width}
                    onChange={(e) => handleInputChange('dimensions_width', parseFloat(e.target.value) || 0)}
                    error={!!validationErrors.dimensions_width}
                    helperText={validationErrors.dimensions_width || 'Width in inches'}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                    }}
                  />
                </Grid>

                <Grid size={4}>
                  <TextField
                    label="Height (in)"
                    type="number"
                    value={formData.dimensions_height}
                    onChange={(e) => handleInputChange('dimensions_height', parseFloat(e.target.value) || 0)}
                    error={!!validationErrors.dimensions_height}
                    helperText={validationErrors.dimensions_height || 'Height in inches'}
                    fullWidth
                    size="small"
                    InputProps={{
                      endAdornment: <Typography sx={{ ml: 1 }}>in</Typography>
                    }}
                  />
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Location & Organization Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Location & Organization
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <TextField
                  label="Location"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  fullWidth
                  size="small"
                  placeholder="e.g., Warehouse A, Store Front"
                />
              </Grid>

              {isInventory && (
                <Grid size={6}>
                  <TextField
                    label="Bin Location"
                    value={formData.bin_location}
                    onChange={(e) => handleInputChange('bin_location', e.target.value)}
                    fullWidth
                    size="small"
                    placeholder="e.g., A1-5, B2-10"
                  />
                </Grid>
              )}
            </Grid>
          </Grid>
        </Grid>
      </DialogContent>

      <DialogActions sx={{ p: 3, pt: 1 }}>
        <Button onClick={handleClose} variant="outlined">
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={loading}>
          {loading ? modalConfig.buttonLoadingText : modalConfig.buttonText}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryModal;
