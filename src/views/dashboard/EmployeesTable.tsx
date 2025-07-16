import * as React from 'react';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Avatar from '../../ui-component/extended/Avatar';
import { useTheme } from '@mui/material';
import Chip from '@mui/material/Chip';

import { chartData } from 'views/dashboard/chart-data';
import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { xLargeWidgetHeight } from 'store/constant';

const dollarFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatPhoneNo = (value: string) => {
  const formatted = value.substr(0, 3) + '-' + value.substr(3, 3) + '-' + value.substr(6, 4);
  return formatted;
};

interface Column {
  id: 'name' | 'email' | 'phone' | 'title' | 'rate' | 'status' | 'image';
  label: string;
  minWidth?: number;
}

const columns: readonly Column[] = [
  { id: 'name', label: 'Name', minWidth: 150 },
  {
    id: 'email',
    label: 'Email'
  },
  {
    id: 'phone',
    label: 'Phone'
  },
  {
    id: 'rate',
    label: 'Hourly Rate'
  },
  { id: 'status', label: 'Status' }
];

interface EmployeesList {
  id: string;
  image: string;
  firstName: string;
  lastName: string;
  title: string;
  rate: number;
  email: string;
  phone: string;
  status: 1 | 2 | 3 | 4;
}

const rows = chartData.EmployeeTable as EmployeesList[];

export default function EmployeesTable() {
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
    <Paper sx={{ width: '100%', overflow: 'hidden', border: 2, borderColor: theme.palette.divider }}>
      <TableContainer sx={{ maxHeight: 440 }}>
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
                {/* <TableCell sx={{ pl: 3 }}>{row.id}</TableCell> */}
                <TableCell>
                  <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                    <Avatar alt={row.lastName[0]} src={getImageUrl(`${row.firstName}`, ImagePath.USERS)} />
                    <Stack>
                      <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                        <Typography variant="subtitle1">
                          {row.firstName} {row.lastName}
                        </Typography>
                      </Stack>
                      <Typography variant="subtitle2" noWrap>
                        {row.title}
                      </Typography>
                    </Stack>
                  </Stack>
                </TableCell>
                <TableCell>{row.email}</TableCell>
                <TableCell>{formatPhoneNo(row.phone)}</TableCell>
                <TableCell>{dollarFormat.format(row.rate)}</TableCell>
                <TableCell>
                  {row.status === 1 && <Chip label="Clocked In" size="small" color="success" />}
                  {row.status === 3 && <Chip label="Clocked Out" size="small" color="primary" />}
                  {row.status === 2 && <Chip label="Absent" size="small" color="error" />}
                  {row.status === 4 && <Chip label="Unscheduled" size="small" color="warning" />}
                </TableCell>
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
