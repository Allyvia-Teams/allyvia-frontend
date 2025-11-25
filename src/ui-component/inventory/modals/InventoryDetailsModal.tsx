import React from 'react';
import { Dialog, DialogContent, DialogActions, Button, Box, Typography, Grid, IconButton, useTheme } from '@mui/material';
import { IconX, IconPackage, IconBox, IconRuler } from '@tabler/icons-react';
import { InventoryItem } from 'types/inventory';
import Barcode from 'react-barcode';
import { detectBarcodeFormat } from 'utils/inventoryUtils';
import ReactApexChart from 'react-apexcharts';
import { InventoryApi } from 'api/inventory.api';
import { AllyviaDateRangePicker, type RangeValue } from 'ui-component/third-party/DateRangePicker';
import { useDispatch, useSelector } from 'store';
import { fetchInventoryItemDetails } from 'store/slices/inventory';

interface InventoryDetailsModalProps {
  open: boolean;
  onClose: () => void;
  item: InventoryItem | null;
}

const InventoryDetailsModal: React.FC<InventoryDetailsModalProps> = ({ open, onClose, item }) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { itemDetails } = useSelector((state) => state.inventory);
  const [barcodeFailed, setBarcodeFailed] = React.useState(false);
  const [customRange, setCustomRange] = React.useState<{ start: string; end: string }>({ start: '', end: '' });
  const [trendSeries, setTrendSeries] = React.useState<{ date: string; quantity: number }[]>([]);
  const [isLocalTrend, setIsLocalTrend] = React.useState<boolean>(false);

  // Use detailed item data if available, otherwise fall back to passed item
  const displayItem = itemDetails || item;

  React.useEffect(() => {
    // Reset fallback state when the item/barcode changes
    setBarcodeFailed(false);
  }, [item?.barcode]);

  // Fetch detailed item data when modal opens
  React.useEffect(() => {
    if (open && item?.id) {
      dispatch(fetchInventoryItemDetails(item.id) as any);
    }
  }, [open, item?.id, dispatch]);

  React.useEffect(() => {
    const load = async () => {
      if (!open || !displayItem?.id) return;
      // If custom range selected, use it; otherwise default to last 7 days
      if (customRange.start && customRange.end) {
        try {
          const res = await InventoryApi.getItemTrend({
            item_id: displayItem.id,
            start_date: customRange.start,
            end_date: customRange.end
          });
          setTrendSeries(res.series || []);
          setIsLocalTrend(Boolean(res.isLocal));
          return;
        } catch (e) {
          console.error('Failed to load custom trend', e);
          return;
        }
      }

      const end = new Date();
      const start = new Date();
      start.setDate(end.getDate() - 6); // default last 7 days
      const fmt = (d: Date) => d.toISOString().slice(0, 10);
      try {
        const res = await InventoryApi.getItemTrend({
          item_id: displayItem.id,
          start_date: fmt(start),
          end_date: fmt(end)
        });
        setTrendSeries(res.series || []);
        setIsLocalTrend(Boolean(res.isLocal));
      } catch (e) {
        console.error('Failed to load trend', e);
      }
    };
    load();
  }, [open, displayItem?.id, customRange.start, customRange.end]);

  if (!displayItem) return null;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  // Using utils/detectBarcodeFormat for EAN/UPC detection

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogContent sx={{ p: 3 }}>
        {/* Header row: Leading type icon + title, subtitle shows item type; close on right */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {displayItem.item_type === 'Inventory' && <IconBox size={44} color={theme.palette.primary.main} />}
            {displayItem.item_type === 'NonInventory' && <IconPackage size={44} color={theme.palette.primary.main} />}
            {displayItem.item_type === 'Service' && <IconRuler size={44} color={theme.palette.primary.main} />}
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
                {displayItem.name || 'Item'}
              </Typography>
              <Typography variant="subtitle1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                {displayItem.item_type || '—'}
              </Typography>
            </Box>
          </Box>
          <IconButton onClick={onClose} size="small">
            <IconX size={20} />
          </IconButton>
        </Box>

        <Grid container spacing={3}>
          {/* Basic Information Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Basic Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  SKU
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {displayItem.sku || '—'}
                </Typography>
              </Grid>

              <Grid size={6}>
                <Box sx={{ textAlign: 'right' }}>
                  {displayItem.barcode && !barcodeFailed ? (
                    <Barcode
                      value={displayItem.barcode}
                      width={1.5}
                      height={48}
                      format={
                        (detectBarcodeFormat(displayItem.barcode) ?? 'CODE128') as
                          | 'CODE128'
                          | 'EAN13'
                          | 'EAN8'
                          | 'EAN5'
                          | 'EAN2'
                          | 'UPC'
                          | 'UPCE'
                      }
                      displayValue
                      font="monospace"
                      fontSize={12}
                      margin={0}
                      background="transparent"
                    />
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {displayItem.barcode ? 'Barcode render failed' : 'No barcode'}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Category
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {displayItem.category || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Type
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {displayItem.item_type || '—'}
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Status
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {displayItem.status || '—'}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
              <Grid size={12}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1">{displayItem.description || '—'}</Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Pricing Section - Shows for all item types */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Pricing Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Unit Price
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {displayItem.unit_price ? formatCurrency(displayItem.unit_price) : '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Cost Price
                </Typography>
                <Typography variant="h5" fontWeight="bold">
                  {displayItem.cost_price ? formatCurrency(displayItem.cost_price) : '—'}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Inventory Information Section */}
          {displayItem.item_type === 'Inventory' && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Inventory Information
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Quantity on Hand
                  </Typography>
                  <Typography variant="h5" fontWeight="bold" color="info.main">
                    {formatNumber(displayItem.quantity_on_hand || 0)}
                  </Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Reorder Point
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {displayItem.reorder_point ? formatNumber(displayItem.reorder_point) : '—'}
                  </Typography>
                </Grid>
                <Grid size={4}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Max Stock Level
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {displayItem.max_stock_level ? formatNumber(displayItem.max_stock_level) : '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Physical Properties Section */}
          {(displayItem.item_type === 'Inventory' || displayItem.item_type === 'NonInventory') && (
            <Grid size={12}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
                Physical Properties
              </Typography>
              <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
              <Grid container spacing={2}>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Weight
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {displayItem.weight ? `${displayItem.weight} lbs` : '—'}
                  </Typography>
                </Grid>
                <Grid size={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Dimensions
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {displayItem.dimensions_length && displayItem.dimensions_width && displayItem.dimensions_height
                      ? `${displayItem.dimensions_length}" × ${displayItem.dimensions_width}" × ${displayItem.dimensions_height}"`
                      : '—'}
                  </Typography>
                </Grid>
              </Grid>
            </Grid>
          )}

          {/* Location Information Section */}
          <Grid size={12}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: 'primary.main' }}>
              Location Information
            </Typography>
            <Box sx={{ borderTop: '1px solid', borderColor: 'divider', mb: 2 }} />
            <Grid container spacing={2}>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Location
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {displayItem.location || '—'}
                </Typography>
              </Grid>
              <Grid size={6}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Bin Location
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {displayItem.bin_location || '—'}
                </Typography>
              </Grid>
            </Grid>
          </Grid>

          {/* Barcode section removed; barcode shown in header top-right */}
        </Grid>
        {!isLocalTrend && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 600, color: 'primary.main' }}>
              Item Trend
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1.5, mb: 2, flexWrap: 'wrap' }}>
              <AllyviaDateRangePicker
                onChange={(v: RangeValue | null) => {
                  if (v?.start && v?.end) {
                    setCustomRange({ start: v.start.toString(), end: v.end.toString() });
                  }
                }}
              />
            </Box>

            <Box sx={{ width: '100%', overflowX: 'auto' }}>
              <ReactApexChart
                type="line"
                height={260}
                series={[
                  {
                    name: 'Quantity',
                    data: trendSeries.map((p) => p.quantity)
                  }
                ]}
                options={{
                  chart: { id: 'item-trend', toolbar: { show: false } },
                  xaxis: { categories: trendSeries.map((p) => p.date), labels: { rotate: -45 } },
                  yaxis: { labels: { formatter: (val: number) => `${Math.round(val)}` } },
                  stroke: { curve: 'smooth', width: 2 },
                  markers: { size: 4 },
                  grid: { strokeDashArray: 4 },
                  tooltip: { x: { format: 'yyyy-MM-dd' } }
                }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 3 }}>
        <Button onClick={onClose} variant="contained" size="large">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default InventoryDetailsModal;
