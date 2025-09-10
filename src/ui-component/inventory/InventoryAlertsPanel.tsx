import React from 'react';
import { Typography, Box, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, Tab } from '@mui/material';
import { useSelector } from 'store';

export const InventoryAlertsPanel: React.FC = () => {
  const items = useSelector((s) => s.inventory.items);

  // Debug logging
  console.log('InventoryAlertsPanel - Redux state:', {
    itemsCount: items?.length || 0,
    firstItem: items?.[0]
  });

  const lowStock = React.useMemo(
    () => items.filter((i: any) => (i.quantity_on_hand || 0) > 0 && (i.quantity_on_hand || 0) <= (i.reorder_point || 0)),
    [items]
  );
  const outOfStock = React.useMemo(() => items.filter((i: any) => (i.quantity_on_hand || 0) === 0), [items]);

  // Toggle via Tabs (0: Low, 1: Out)
  const [tab, setTab] = React.useState(0);
  // (styles for previous buttons removed)

  const rows = (tab === 0 ? lowStock : outOfStock).map((i: any) => ({
    id: i.id,
    name: i.name,
    sku: i.sku || 'N/A',
    quantity: i.quantity_on_hand,
    reorder: i.reorder_point || 0
  }));

  return (
    <Box sx={{ mb: 2 }}>
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="fullWidth" textColor="primary" indicatorColor="primary">
          <Tab label={`Low Stock (${lowStock.length})`} />
          <Tab label={`Out of Stock (${outOfStock.length})`} />
        </Tabs>
        <TableContainer sx={{ maxHeight: 400, overflowX: 'auto' }}>
          <Table stickyHeader size="small" sx={{ minWidth: 300 }}>
            <TableHead>
              <TableRow>
                <TableCell>Item</TableCell>
                {tab === 0 ? (
                  <>
                    <TableCell>Qty</TableCell>
                    <TableCell>ROL</TableCell>
                  </>
                ) : (
                  <TableCell>SKU</TableCell>
                )}
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id} hover>
                  <TableCell>{r.name}</TableCell>
                  {tab === 0 ? (
                    <>
                      <TableCell>{r.quantity}</TableCell>
                      <TableCell>{r.reorder}</TableCell>
                    </>
                  ) : (
                    <TableCell>{r.sku}</TableCell>
                  )}
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={tab === 0 ? 3 : 2}>
                    <Typography variant="caption" color="text.secondary">
                      No items
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </Box>
  );
};

export default InventoryAlertsPanel;
