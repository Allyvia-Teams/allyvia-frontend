// views/inventory/UpdateInventory.tsx
// Update Inventory Page with Barcode Scanning and Purchase Order functionality

import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Card, CardContent, Alert, Chip } from '@mui/material';
import MainCard from 'ui-component/cards/MainCard';
import { IconScan, IconPlus, IconMinus, IconShoppingCart } from '@tabler/icons-react';
import { BarcodeScannerModal } from 'ui-component/inventory';
import { useDispatch, useSelector } from 'store';
import { fetchInventoryItems } from 'store/slices/inventory';
import { updateItem } from 'api/inventory.api';

// Purchase Order Modal Component
interface PurchaseOrderModalProps {
  open: boolean;
  onClose: () => void;
  item: any;
  onUpdate: (itemId: string, quantityChange: number, notes?: string) => void;
}

const PurchaseOrderModal: React.FC<PurchaseOrderModalProps> = ({ open, onClose, item, onUpdate }) => {
  const [quantityChange, setQuantityChange] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');

  const handleSubmit = () => {
    if (quantityChange !== 0) {
      onUpdate(item.id, quantityChange, notes);
      setQuantityChange(0);
      setNotes('');
      onClose();
    }
  };

  if (!open || !item) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1300
      }}
    >
      <Card sx={{ width: 500, maxHeight: '80vh', overflow: 'auto' }}>
        <CardContent>
          <Typography variant="h5" gutterBottom>
            Update Inventory - {item.name}
          </Typography>

          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary">
              SKU: {item.sku}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Current Quantity: {item.quantity_on_hand || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Barcode: {item.barcode || 'N/A'}
            </Typography>
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Quantity Change
            </Typography>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" onClick={() => setQuantityChange(quantityChange - 1)} disabled={quantityChange <= -100}>
                <IconMinus size={16} />
              </Button>
              <Typography variant="h6" sx={{ minWidth: 60, textAlign: 'center' }}>
                {quantityChange}
              </Typography>
              <Button variant="outlined" onClick={() => setQuantityChange(quantityChange + 1)} disabled={quantityChange >= 100}>
                <IconPlus size={16} />
              </Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">
              Use +/- buttons or type directly. Positive numbers add inventory, negative numbers remove.
            </Typography>
          </Box>

          <Box sx={{ mb: 3 }}>
            <Typography variant="subtitle2" gutterBottom>
              Notes (Optional)
            </Typography>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter notes about this inventory update..."
              style={{
                width: '100%',
                minHeight: '80px',
                padding: '8px',
                border: '1px solid #ccc',
                borderRadius: '4px',
                resize: 'vertical'
              }}
            />
          </Box>

          <Stack direction="row" spacing={2} justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" onClick={handleSubmit} disabled={quantityChange === 0} startIcon={<IconShoppingCart size={16} />}>
              Update Inventory
            </Button>
          </Stack>
        </CardContent>
      </Card>
    </Box>
  );
};

const UpdateInventoryPage: React.FC = () => {
  const dispatch = useDispatch();
  const { items, loading } = useSelector((state) => state.inventory);
  const { currentRole } = useSelector((state) => state.auth);

  const [barcodeScannerOpen, setBarcodeScannerOpen] = useState(false);
  const [purchaseOrderOpen, setPurchaseOrderOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [scannedBarcode, setScannedBarcode] = useState<string>('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  React.useEffect(() => {
    dispatch(fetchInventoryItems() as any);
  }, [dispatch]);

  const handleBarcodeScanned = (barcode: string) => {
    setScannedBarcode(barcode);
    setBarcodeScannerOpen(false);

    // Find items with matching barcode
    const matchingItems = items.filter((item) => item.barcode && item.barcode.toLowerCase().includes(barcode.toLowerCase()));

    setSearchResults(matchingItems);

    if (matchingItems.length === 1) {
      // Auto-select if only one match
      setSelectedItem(matchingItems[0]);
      setPurchaseOrderOpen(true);
    }
  };

  const handleItemSelect = (item: any) => {
    setSelectedItem(item);
    setPurchaseOrderOpen(true);
  };

  const handleInventoryUpdate = async (itemId: string, quantityChange: number, notes?: string) => {
    try {
      // Get the current item to calculate new quantity
      const currentItem = items.find((item) => item.id === itemId);
      if (!currentItem) {
        alert('Item not found. Please try again.');
        return;
      }

      const newQuantity = (currentItem.quantity_on_hand || 0) + quantityChange;

      // Update the item with new quantity
      const companyId = currentRole?.company_id;
      if (!companyId) {
        alert('No company selected. Please select a company first.');
        return;
      }

      await updateItem(
        itemId,
        {
          quantity_on_hand: newQuantity
        },
        companyId
      );

      alert(`Inventory updated successfully! Changed quantity by ${quantityChange} (New total: ${newQuantity})`);

      // Refresh inventory data
      dispatch(fetchInventoryItems() as any);
    } catch (error) {
      console.error('Failed to update inventory:', error);
      alert('Failed to update inventory. Please try again.');
    }
  };

  return (
    <>
      <MainCard
        content={false}
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Typography variant="h3">Update Inventory</Typography>
          </Box>
        }
        secondary={
          <Stack direction="row" spacing={1} alignItems="center">
            <Button
              variant="contained"
              startIcon={<IconScan size={16} />}
              onClick={() => setBarcodeScannerOpen(true)}
              size="small"
              disabled={loading}
              sx={{ py: 0.5, px: 1.5, fontSize: '0.8125rem', color: 'white' }}
            >
              Scan Barcode
            </Button>
          </Stack>
        }
      >
        <Box sx={{ p: 3 }}>
          {scannedBarcode && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Scanned barcode: <strong>{scannedBarcode}</strong>
            </Alert>
          )}

          {searchResults.length > 0 && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Found {searchResults.length} matching item(s):
              </Typography>
              <Stack spacing={2}>
                {searchResults.map((item) => (
                  <Card key={item.id} sx={{ p: 2 }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {item.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          SKU: {item.sku} | Barcode: {item.barcode} | Current Qty: {item.quantity_on_hand || 0}
                        </Typography>
                        <Chip
                          label={item.item_type}
                          size="small"
                          color={item.item_type === 'Inventory' ? 'primary' : 'secondary'}
                          sx={{ mt: 1 }}
                        />
                      </Box>
                      <Button variant="contained" onClick={() => handleItemSelect(item)} startIcon={<IconShoppingCart size={16} />}>
                        Update
                      </Button>
                    </Stack>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}

          {scannedBarcode && searchResults.length === 0 && (
            <Alert severity="warning">
              No inventory items found with barcode "{scannedBarcode}". Please check the barcode and try again, or add this item to
              inventory first.
            </Alert>
          )}

          {!scannedBarcode && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Scan a barcode to update inventory
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click the "Scan Barcode" button to start scanning, or manually enter a barcode.
              </Typography>
            </Box>
          )}
        </Box>
      </MainCard>

      {/* Barcode Scanner Modal */}
      <BarcodeScannerModal open={barcodeScannerOpen} onClose={() => setBarcodeScannerOpen(false)} onBarcodeScanned={handleBarcodeScanned} />

      {/* Purchase Order Modal */}
      <PurchaseOrderModal
        open={purchaseOrderOpen}
        onClose={() => setPurchaseOrderOpen(false)}
        item={selectedItem}
        onUpdate={handleInventoryUpdate}
      />
    </>
  );
};

export default UpdateInventoryPage;
