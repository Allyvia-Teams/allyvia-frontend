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
// import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import { Button, useTheme } from '@mui/material';

import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { gridSpacingSm, xLargeWidgetHeight } from 'store/constant';
import SearchSection from 'layout/MainLayout/Header/SearchSection';
import { IconPlus, IconFileArrowRight, IconFileTypeCsv } from '@tabler/icons-react';

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
  id: 'name' | 'sku' | 'category' | 'quantity' | 'cost' | 'price' | 'vendor' | 'image' | 'reorder';
  label: string;
  minWidth?: number;
}

const columns: readonly Column[] = [
  { id: 'image', label: 'Image', minWidth: 50 },
  { id: 'name', label: 'ItemName', minWidth: 50 },
  { id: 'sku', label: 'SKU', minWidth: 50 },
  { id: 'category', label: 'Category' },
  { id: 'quantity', label: 'Quantity' },
  { id: 'reorder', label: 'Reorder Level' },
  { id: 'vendor', label: 'Vendor' }
];

const rows = inventoryItems;

export default function InventoryTable() {
  const theme = useTheme();
  const [page, setPage] = React.useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(10);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  let isLoading = false;
  if (isLoading) {
    return <LoadingSkeleton height={xLargeWidgetHeight} />;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      <Grid container sx={{ py: 2 }} spacing={gridSpacingSm}>
        <Grid size={{ sm: 2, md: 4 }}>
          <SearchSection autoCompleteGroups={['inventory']} mdWidth={300} lgWidth={250} />
        </Grid>
        <Grid size={{ sm: 10, md: 8 }}>
          <Grid container spacing={gridSpacingSm} sx={{ justifyContent: 'flex-end', pr: 2 }}>
            <Grid>
              <Button sx={{ bgcolor: theme.palette.primary.dark, height: 50, minWidth: 120 }} color={'inherit'}>
                <IconPlus height={16} stroke={3} color="#ffff" />
                <Typography color="#ffff">New Item</Typography>
              </Button>
            </Grid>
            <Grid>
              <Button sx={{ bgcolor: theme.palette.primary.dark, height: 50, minWidth: 120 }} color={'inherit'}>
                <IconFileTypeCsv height={16} stroke={2} color="#ffff" />
                <Typography color="#ffff">Import CSV</Typography>
              </Button>
            </Grid>
            <Grid>
              <Button sx={{ bgcolor: theme.palette.primary.dark, height: 50, minWidth: 120 }} color={'inherit'}>
                <IconFileArrowRight height={16} stroke={2} color="#ffff" />
                <Typography color="#ffff">Export Data</Typography>
              </Button>
            </Grid>
          </Grid>
        </Grid>
      </Grid>
      <TableContainer sx={{ maxHeight: 500 }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} style={{ minWidth: column.minWidth }}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => (
              <TableRow hover key={index}>
                <TableCell>
                  <Avatar alt={row.name} src={getImageUrl(`${row.image}`, ImagePath.INVENTORY)} />
                </TableCell>
                <TableCell>{row.name}</TableCell>
                <TableCell>{row.sku}</TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>{row.quantity}</TableCell>
                <TableCell>{row.reorder}</TableCell>
                <TableCell>{row.vendor}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={rows.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Paper>
  );
}
