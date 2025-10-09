import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  IconButton,
  Alert,
  CircularProgress,
  Grid,
  Chip
} from '@mui/material';
import { IconX, IconScan, IconKeyboard } from '@tabler/icons-react';
import { useDispatch, useSelector } from 'store';
import { getItemByBarcode } from 'store/slices/inventory';
import InventoryModal from './InventoryModal';

interface BarcodeScannerModalProps {
  open: boolean;
  onClose: () => void;
  onBarcodeScanned?: (barcode: string) => void;
}

const BarcodeScannerModal: React.FC<BarcodeScannerModalProps> = ({ open, onClose, onBarcodeScanned }) => {
  const dispatch = useDispatch();
  const { loading, error } = useSelector((state) => state.inventory);
  const [scannedBarcode, setScannedBarcode] = useState('');
  const [prefilledBarcode, setPrefilledBarcode] = useState('');
  const [isScanning, setIsScanning] = useState(false);
  const [foundItem, setFoundItem] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showItemPanel, setShowItemPanel] = useState(false);
  const [scannerVisible, setScannerVisible] = useState(true);
  const [showEditModal, setShowEditModal] = useState(false);
  const [updateData, setUpdateData] = useState({
    quantity_on_hand: 0,
    unit_price: 0,
    cost_price: 0
  });

  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Lookup item by barcode using Redux thunk
  const lookupItemByBarcode = async (barcode: string) => {
    try {
      const result = await dispatch(getItemByBarcode(barcode) as any);
      const payload = result?.payload || {};
      const candidate = payload.item ?? (Array.isArray(payload.items) ? payload.items[0] : null);
      if (!candidate) return null;
      // Minimal shape normalization to match InventoryItem fields used by edit modal
      const normalized = {
        id: candidate.id,
        name: candidate.name,
        sku: candidate.sku,
        barcode: candidate.barcode,
        description: candidate.description,
        category: candidate.category,
        quantity_on_hand: candidate.quantity_on_hand ?? candidate.qty_on_hand ?? 0,
        unit_price: candidate.unit_price ?? candidate.price ?? 0,
        cost_price: candidate.cost_price ?? 0,
        reorder_point: candidate.reorder_point ?? 0,
        max_stock_level: candidate.max_stock_level ?? 0,
        item_type: candidate.item_type ?? 'Inventory',
        status: candidate.status ?? 'active',
        is_taxable: candidate.is_taxable ?? false,
        weight: candidate.weight ?? 0,
        dimensions_length: candidate.dimensions_length ?? 0,
        dimensions_width: candidate.dimensions_width ?? 0,
        dimensions_height: candidate.dimensions_height ?? 0,
        location: candidate.location ?? '',
        bin_location: candidate.bin_location ?? ''
      };
      return normalized;
    } catch (error) {
      console.error('Error looking up item:', error);
      return null;
    }
  };

  // Handle barcode input (USB scanner simulation)
  const handleBarcodeInput = async (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && scannedBarcode.trim()) {
      setIsScanning(true);
      try {
        // If onBarcodeScanned callback is provided, use it instead of the default behavior
        if (onBarcodeScanned) {
          onBarcodeScanned(scannedBarcode.trim());
          setScannedBarcode('');
          setIsScanning(false);
          return;
        }

        const item = await lookupItemByBarcode(scannedBarcode.trim());
        if (item) {
          setFoundItem(item);
          // Open edit modal for the found item and close scanner
          setShowEditModal(true);
          setScannerVisible(false);
        } else {
          // Item not found - show add modal with prefilled barcode
          setPrefilledBarcode(scannedBarcode.trim());
          setShowAddModal(true);
          setScannerVisible(false);
        }
      } catch (error) {
        console.error('Error looking up item:', error);
      } finally {
        setIsScanning(false);
        setScannedBarcode('');
      }
    }
  };

  // Handle item update
  const handleUpdateItem = async () => {
    // For now, just close the panel
    setShowItemPanel(false);
    setFoundItem(null);
  };

  // Handle new item creation
  const handleCreateItem = (itemData: any) => {
    // The barcode will be prefilled in the add modal
    setShowAddModal(false);
    setScannedBarcode('');
  };

  // Cleanup on close
  const handleClose = () => {
    setScannedBarcode('');
    setFoundItem(null);
    setShowItemPanel(false);
    setShowAddModal(false);
    setShowEditModal(false);
    onClose();
  };

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setScannerVisible(true);
      // Ensure focus is placed and remains on the input
      const focusInput = () => barcodeInputRef.current?.focus();
      // Initial focus
      focusInput();
      // Refocus shortly after mount to avoid races
      const t = setTimeout(focusInput, 0);
      return () => clearTimeout(t);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open && scannerVisible} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ p: 3, pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <IconScan size={24} color="#1976d2" />
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  USB Barcode Scanner
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleClose} size="small">
              <IconX size={20} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ p: 3 }}>
          {/* USB Scanner Input */}
          <Box>
            <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
              USB Scanner Input
            </Typography>
            <TextField
              inputRef={barcodeInputRef}
              fullWidth
              label="Scan or Enter Barcode"
              value={scannedBarcode}
              onChange={(e) => setScannedBarcode(e.target.value)}
              onKeyDown={handleBarcodeInput}
              autoFocus
              onBlur={() => {
                // Keep focus locked on the input while the scanner is visible
                if (scannerVisible) {
                  barcodeInputRef.current?.focus();
                }
              }}
              placeholder="Scan barcode with USB scanner or type manually..."
              disabled={isScanning}
              InputProps={{
                startAdornment: (
                  <Box sx={{ mr: 1, display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                    <IconKeyboard size={20} />
                  </Box>
                ),
                endAdornment: isScanning ? <CircularProgress size={20} /> : null
              }}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              Connect your USB barcode scanner and scan a barcode, or type manually and press Enter
            </Typography>
          </Box>

          {/* Current Scan Status */}
          {scannedBarcode && (
            <Box sx={{ mt: 3 }}>
              <Alert severity="info">
                <Typography variant="body2">
                  <strong>Scanned Barcode:</strong> {scannedBarcode}
                </Typography>
              </Alert>
            </Box>
          )}

          {error && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {error}
            </Alert>
          )}
        </DialogContent>

        <DialogActions sx={{ p: 3, pt: 1 }}>
          <Button onClick={handleClose} variant="outlined">
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Item Found Panel */}
      {showItemPanel && foundItem && (
        <Dialog
          open={showItemPanel}
          onClose={() => {
            setShowItemPanel(false);
            handleClose();
          }}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle sx={{ p: 3, pb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                  Item Found
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  Update inventory details
                </Typography>
              </Box>
              <IconButton onClick={() => setShowItemPanel(false)} size="small">
                <IconX size={20} />
              </IconButton>
            </Box>
          </DialogTitle>

          <DialogContent sx={{ p: 3 }}>
            <Grid container spacing={3}>
              <Grid size={6}>
                <Box>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                    Item Details
                  </Typography>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {foundItem.name}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      SKU
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {foundItem.sku}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Barcode
                    </Typography>
                    <Typography variant="body1" fontWeight="500">
                      {foundItem.barcode}
                    </Typography>
                  </Box>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Category
                    </Typography>
                    <Chip label={foundItem.category} size="small" />
                  </Box>
                </Box>
              </Grid>

              <Grid size={6}>
                <Box>
                  <Typography variant="h6" color="primary" gutterBottom sx={{ mb: 2, fontWeight: 600 }}>
                    Update Inventory
                  </Typography>
                  <TextField
                    fullWidth
                    label="Quantity on Hand"
                    type="number"
                    value={updateData.quantity_on_hand}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, quantity_on_hand: parseInt(e.target.value) || 0 }))}
                    size="small"
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="Unit Price"
                    type="number"
                    value={updateData.unit_price}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, unit_price: parseFloat(e.target.value) || 0 }))}
                    size="small"
                    sx={{ mb: 2 }}
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                  />
                  <TextField
                    fullWidth
                    label="Cost Price"
                    type="number"
                    value={updateData.cost_price}
                    onChange={(e) => setUpdateData((prev) => ({ ...prev, cost_price: parseFloat(e.target.value) || 0 }))}
                    size="small"
                    InputProps={{
                      startAdornment: <Typography sx={{ mr: 1 }}>$</Typography>
                    }}
                  />
                </Box>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={() => setShowItemPanel(false)} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleUpdateItem} variant="contained" disabled={loading}>
              {loading ? 'Updating...' : 'Update Item'}
            </Button>
          </DialogActions>
        </Dialog>
      )}

      {/* Add New Item Modal */}
      {showAddModal && (
        <InventoryModal
          open={showAddModal}
          onClose={() => {
            setShowAddModal(false);
            handleClose();
          }}
          mode="add"
          prefilledBarcode={prefilledBarcode}
        />
      )}

      {showEditModal && foundItem && (
        <InventoryModal
          open={showEditModal}
          onClose={() => {
            setShowEditModal(false);
            handleClose();
          }}
          mode="edit"
          item={foundItem}
        />
      )}
    </>
  );
};

export default BarcodeScannerModal;
