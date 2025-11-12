import { useEffect, useState } from 'react';
import { Drawer, Box, Typography, IconButton, Grid, Card, CardContent, Chip, Divider, CircularProgress, Alert } from '@mui/material';
import { IconX, IconChevronLeft, IconChevronRight, IconCheck, IconX as IconClose } from '@tabler/icons-react';
import { useTheme } from '@mui/material/styles';
import qbApi from 'api/qb';
import { QBItem, QBItemDetail } from 'types/qb';

interface ItemDetailDrawerProps {
  open: boolean;
  itemId: string | null;
  items: QBItem[];
  currentIndex: number;
  companyId: string;
  onClose: () => void;
  onNavigate: (itemId: string) => void;
}

const ItemDetailDrawer = ({ open, itemId, items, currentIndex, companyId, onClose, onNavigate }: ItemDetailDrawerProps) => {
  const theme = useTheme();
  const [item, setItem] = useState<QBItemDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && itemId) {
      fetchItemDetails();
    }
  }, [open, itemId]);

  const fetchItemDetails = async () => {
    if (!itemId) return;

    setLoading(true);
    setError(null);
    try {
      const data = await qbApi.fetchItemDetail(companyId, itemId);
      setItem(data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to fetch item details');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: string | null) => {
    if (!price) return '-';
    return `$${parseFloat(price).toFixed(2)}`;
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleString();
  };

  return (
    <Drawer
      anchor="top"
      open={open}
      onClose={onClose}
      sx={{
        '& .MuiDrawer-paper': {
          top: 0,
          height: '100vh',
          overflowY: 'auto',
          backgroundColor: theme.palette.background.default
        }
      }}
    >
      <Box sx={{ p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <IconButton onClick={onClose} sx={{ color: theme.palette.text.secondary }}>
            <IconX />
          </IconButton>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <IconButton
              onClick={() => {
                if (currentIndex > 0) {
                  onNavigate(items[currentIndex - 1].qb_id);
                }
              }}
              disabled={currentIndex <= 0 || items.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronLeft />
            </IconButton>
            <IconButton
              onClick={() => {
                if (currentIndex < items.length - 1) {
                  onNavigate(items[currentIndex + 1].qb_id);
                }
              }}
              disabled={currentIndex >= items.length - 1 || items.length === 0}
              sx={{ color: theme.palette.text.secondary }}
            >
              <IconChevronRight />
            </IconButton>
          </Box>
        </Box>

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
            <CircularProgress />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {item && !loading && (
          <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
            {/* Item Name and Status */}
            <Box sx={{ mb: 3 }}>
              <Typography variant="h3" sx={{ mb: 1, fontWeight: 500 }}>
                {item.name}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                {item.sku && (
                  <>
                    <Typography variant="body2" color="textSecondary">
                      SKU: {item.sku}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      •
                    </Typography>
                  </>
                )}
                <Typography variant="body2" color="textSecondary">
                  {item.type} Item
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  •
                </Typography>
                <Chip
                  label={item.active ? 'Active' : 'Inactive'}
                  size="small"
                  color={item.active ? 'success' : 'default'}
                  icon={item.active ? <IconCheck size={16} /> : <IconClose size={16} />}
                />
              </Box>
            </Box>

            {/* Pricing Cards */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatPrice(item.unit_price)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Selling Price
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatPrice(item.purchase_cost)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Purchase Cost
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {item.margin_percentage ? `${item.margin_percentage.toFixed(1)}%` : '-'}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Margin
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" sx={{ fontWeight: 500 }}>
                      {formatPrice(item.total_inventory_value)}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Total Inventory Value
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Two Column Layout */}
            <Grid container spacing={3} sx={{ mb: 3 }}>
              {/* Inventory Section */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      INVENTORY
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Current Stock
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {item.qty_on_hand ? `${item.qty_on_hand} units` : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Reorder When Below
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {item.reorder_point ? `${item.reorder_point} units` : '-'}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography variant="body2" color="textSecondary">
                          Status
                        </Typography>
                        <Chip
                          label={item.stock_status}
                          size="small"
                          color={
                            item.stock_status === 'Well Stocked'
                              ? 'success'
                              : item.stock_status === 'Low Stock'
                                ? 'warning'
                                : item.stock_status === 'Out of Stock'
                                  ? 'error'
                                  : 'default'
                          }
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Tax & Tracking Section */}
              <Grid size={{ xs: 12, md: 6 }}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                      TAX & TRACKING
                    </Typography>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Sales Tax
                        </Typography>
                        <Chip
                          label={item.taxable ? 'Taxable' : 'Non-Taxable'}
                          size="small"
                          color={item.taxable ? 'primary' : 'default'}
                          icon={item.taxable ? <IconCheck size={16} /> : undefined}
                        />
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Purchase Tax
                        </Typography>
                        <Typography variant="body1">{item.purchase_tax_included ? 'Included' : 'Not Included'}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                        <Typography variant="body2" color="textSecondary">
                          Inventory Tracking
                        </Typography>
                        <Chip
                          label={item.track_qty_on_hand ? 'Enabled' : 'Disabled'}
                          size="small"
                          color={item.track_qty_on_hand ? 'success' : 'default'}
                          icon={item.track_qty_on_hand ? <IconCheck size={16} /> : undefined}
                        />
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Description Section */}
            {(item.description || item.purchase_description) && (
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                    DESCRIPTION
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  {item.description && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        Customer sees:
                      </Typography>
                      <Typography variant="body1">{item.description}</Typography>
                    </Box>
                  )}
                  {item.purchase_description && (
                    <Box>
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        When purchasing:
                      </Typography>
                      <Typography variant="body1">{item.purchase_description}</Typography>
                    </Box>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Accounting Section */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  ACCOUNTING
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {item.income_account_ref_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Income Account:
                      </Typography>
                      <Typography variant="body1">{item.income_account_ref_name}</Typography>
                    </Box>
                  )}
                  {item.expense_account_ref_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Expense Account:
                      </Typography>
                      <Typography variant="body1">{item.expense_account_ref_name}</Typography>
                    </Box>
                  )}
                  {item.asset_account_ref_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Asset Account:
                      </Typography>
                      <Typography variant="body1">{item.asset_account_ref_name}</Typography>
                    </Box>
                  )}
                  {item.parent_ref_name && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2" color="textSecondary">
                        Category:
                      </Typography>
                      <Typography variant="body1">{item.parent_ref_name}</Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>

            {/* Footer */}
            <Typography variant="body2" color="textSecondary" sx={{ textAlign: 'center' }}>
              Last updated in QuickBooks: {formatDate(item.qb_last_updated_time)}
            </Typography>
          </Box>
        )}
      </Box>
    </Drawer>
  );
};

export default ItemDetailDrawer;
