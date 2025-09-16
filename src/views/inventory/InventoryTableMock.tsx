import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Avatar from '../../ui-component/extended/Avatar';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid';
import { Button, useTheme, Box, Chip } from '@mui/material';
import { useDispatch, useSelector } from 'store';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import {
  gridSpacingSm,
  xLargeWidgetHeight,
  tableMaxHeight,
  tableSearchWidthMd,
  tableSearchWidthLg,
  buttonHeightLg,
  buttonMinWidth
} from 'store/constant';
import { fetchItemsFromInventory } from 'store/slices/Inventory';
import { getCompanyId } from 'utils/authStorage';
import SearchSection from 'layout/MainLayout/Header/SearchSection';
import { IconPlus, IconFileArrowRight, IconFileTypeCsv } from '@tabler/icons-react';
import { COLORS } from '../../styles/colors';

interface InventoryItem {
  id: string;
  image: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  reorder: number;
  vendor: string;
}

export const inventoryItems: InventoryItem[] = [
  {
    id: '0',
    image: 'wireless-mouse.jpg',
    name: 'Wireless Mouse',
    sku: 'TWMEKVJ3346',
    category: 'Electronics',
    quantity: 73,
    reorder: 25,
    vendor: 'TechSource'
  },
  {
    id: '1',
    image: 'clipboard.png',
    name: 'Clipboard',
    sku: 'RHVK33985',
    category: 'Office Supplies',
    quantity: 20,
    reorder: 5,
    vendor: 'ULINE'
  },
  {
    id: '2',
    image: 'office-chair-prem.webp',
    name: 'Office Chair (Premium)',
    sku: 'GWKGJ2452',
    category: 'Office Furniture',
    quantity: 12,
    reorder: 6,
    vendor: 'Sylvan Designs'
  },
  {
    id: '3',
    image: 'office-chair-std.jpg',
    name: 'Office Chair (Standard)',
    sku: 'BKWEK34534',
    category: 'Office Furniture',
    quantity: 32,
    reorder: 15,
    vendor: 'Miller Furnishings'
  },
  {
    id: '4',
    image: 'paper-shredder.png',
    name: 'Paper Shredder (Large)',
    sku: 'YMSK23452',
    category: 'Office Supplies',
    quantity: 31,
    reorder: 20,
    vendor: 'ULINE'
  },
  {
    id: '5',
    image: 'printer-ink-3pk.webp',
    name: 'Printer Ink (3 pack)',
    sku: 'TGEH23524',
    category: 'Office Supplies',
    quantity: 125,
    reorder: 80,
    vendor: 'InkStar LLC'
  },
  {
    id: '6',
    image: 'printer-ink-black.webp',
    name: 'Printer Ink (Black)',
    sku: 'TGEH25634',
    category: 'Office Supplies',
    quantity: 223,
    reorder: 100,
    vendor: 'InkStar LLC'
  },
  {
    id: '7',
    image: 'tape-dispenser.png',
    name: 'Tape Dispenser (Matte Black)',
    sku: 'UISG24356',
    category: 'Office Supplies',
    quantity: 45,
    reorder: 24,
    vendor: 'ULINE'
  },
  {
    id: '8',
    image: 'label-maker.jpg',
    name: 'Label Maker',
    sku: 'TWKJ55534',
    category: 'Office Supplies',
    quantity: 26,
    reorder: 10,
    vendor: 'Brady'
  }
];

interface Column {
  id: 'name' | 'sku' | 'category' | 'quantity_on_hand' | 'unit_price' | 'status' | 'item_type' | 'sync_status';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
}

const columns: readonly Column[] = [
  { id: 'name', label: 'Item Name', minWidth: 200 },
  { id: 'sku', label: 'SKU', minWidth: 120 },
  { id: 'category', label: 'Category', minWidth: 120 },
  { id: 'item_type', label: 'Type', minWidth: 100 },
  { id: 'quantity_on_hand', label: 'Quantity', minWidth: 80, align: 'center' },
  { id: 'unit_price', label: 'Unit Price', minWidth: 100, align: 'right' },
  { id: 'status', label: 'Status', minWidth: 100, align: 'center' },
  { id: 'sync_status', label: 'Sync Status', minWidth: 120, align: 'center' }
];

export default function InventoryTable() {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { items, pagination, loading, error } = useSelector((state) => state.inventory);
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  React.useEffect(() => {
    const companyId = getCompanyId();
    if (companyId && items.length === 0 && !loading) {
      dispatch(fetchItemsFromInventory(companyId));
    }
  }, [dispatch, items.length, loading]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'success';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getSyncStatusColor = (syncStatus: string) => {
    switch (syncStatus.toLowerCase()) {
      case 'synced':
        return 'success';
      case 'pending':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getQuantityColor = (quantity: number) => {
    if (quantity === 0) return 'error';
    if (quantity <= 10) return 'warning';
    return 'default';
  };

  if (loading) {
    return <LoadingSkeleton height={xLargeWidgetHeight} />;
  }

  if (error) {
    return (
      <Paper sx={{ width: '100%', p: 2 }}>
        <Typography color="error">Error loading inventory: {error}</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Grid container sx={{ pt: 2, alignItems: 'center' }} spacing={gridSpacingSm}>
        <Grid size={{ sm: 2, md: 4 }}>
          <SearchSection autoCompleteGroups={['inventory']} mdWidth={tableSearchWidthMd} lgWidth={tableSearchWidthLg} />
        </Grid>
        <Grid size="grow" sx={{ minWidth: 0 }}>
          <Grid container spacing={gridSpacingSm} sx={{ justifyContent: { xs: 'flex-start', md: 'flex-end' }, pr: { sm: 2 } }}>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button
                sx={{
                  bgcolor: theme.palette.primary.dark,
                  height: buttonHeightLg,
                  minWidth: buttonMinWidth,
                  width: { xs: '100%', sm: 'auto' }
                }}
                color={'inherit'}
              >
                <IconPlus height={16} stroke={3} color={COLORS.white} />
                <Typography color={COLORS.white}>New Item</Typography>
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button
                sx={{
                  bgcolor: theme.palette.primary.dark,
                  height: buttonHeightLg,
                  minWidth: buttonMinWidth,
                  width: { xs: '100%', sm: 'auto' }
                }}
                color={'inherit'}
              >
                <IconFileTypeCsv height={16} stroke={2} color={COLORS.white} />
                <Typography color={COLORS.white}>Import CSV</Typography>
              </Button>
            </Grid>
            <Grid size={{ xs: 12, sm: 'auto' }}>
              <Button
                sx={{
                  bgcolor: theme.palette.primary.dark,
                  height: buttonHeightLg,
                  minWidth: buttonMinWidth,
                  width: { xs: '100%', sm: 'auto' }
                }}
                color={'inherit'}
              >
                <IconFileArrowRight height={16} stroke={2} color={COLORS.white} />
                <Typography color={COLORS.white}>Export Data</Typography>
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <TableContainer sx={{ maxHeight: tableMaxHeight }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} style={{ minWidth: column.minWidth }} align={column.align}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((item) => (
              <TableRow hover key={item.id}>
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar alt={item.name} src={getImageUrl('default-item.png', ImagePath.INVENTORY)} sx={{ width: 32, height: 32 }} />
                    <Box>
                      <Typography variant="body2" fontWeight="medium">
                        {item.name}
                      </Typography>
                      {item.description && (
                        <Typography variant="caption" color="text.secondary">
                          {item.description}
                        </Typography>
                      )}
                    </Box>
                  </Box>
                </TableCell>
                <TableCell>{item.sku || '-'}</TableCell>
                <TableCell>{item.category}</TableCell>
                <TableCell>{item.item_type}</TableCell>
                <TableCell align="center">
                  <Chip
                    label={item.quantity_on_hand}
                    color={getQuantityColor(item.quantity_on_hand)}
                    size="small"
                    variant={item.quantity_on_hand === 0 ? 'filled' : 'outlined'}
                  />
                </TableCell>
                <TableCell align="right">${parseFloat(item.unit_price).toFixed(2)}</TableCell>
                <TableCell align="center">
                  <Chip label={item.status} color={getStatusColor(item.status)} size="small" variant="outlined" />
                </TableCell>
                <TableCell align="center">
                  <Chip label={item.sync_status} color={getSyncStatusColor(item.sync_status)} size="small" variant="outlined" />
                </TableCell>
              </TableRow>
            ))}
            {/* Show empty rows if no data */}
            {items.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} align="center" sx={{ py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No inventory items found
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 50, 100]}
        component="div"
        count={pagination?.total_items || items.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
