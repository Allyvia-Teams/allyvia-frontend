import * as React from 'react';
import { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from 'ui-component/extended/Avatar';
import { useTheme } from '@mui/material';
import Chip from '@mui/material/Chip';

import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { EmployeeListItem } from 'types/employee';
import type { ClockStatus } from './useClockStatuses';

const dollarFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatPhoneNo = (value: string) => {
  if (!value || value.length < 10) return value;
  const formatted = value.slice(0, 3) + '-' + value.slice(3, 6) + '-' + value.slice(6, 10);
  return formatted;
};

interface Column {
  id: 'name' | 'email' | 'phone' | 'rate' | 'total_hours' | 'total_spend' | 'status';
  label: string;
  minWidth?: number;
  align?: 'right' | 'left' | 'center';
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
    label: 'Hourly rate',
    align: 'right'
  },
  {
    id: 'total_hours',
    label: 'Hours',
    align: 'right'
  },
  {
    id: 'total_spend',
    label: 'Labor cost',
    align: 'right'
  },
  { id: 'status', label: 'Status' }
];

interface EmployeesTableProps {
  children?: React.ReactElement;
  maxHeight?: number | string;
  employees: EmployeeListItem[];
  isLoading?: boolean;
  /** Per-employee clock status from useClockStatuses; missing = still loading. */
  statuses: Record<string, ClockStatus>;
}

export default function EmployeesTable({ children, maxHeight, employees, isLoading = false, statuses }: EmployeesTableProps) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const getEmployeeStatus = (employee: EmployeeListItem) => {
    const status = statuses[employee.id];
    if (employee.status === 'inactive' || status === 'inactive') return { label: 'Inactive', color: 'default' as const };
    if (status === 'working') return { label: 'Working now', color: 'success' as const };
    if (status === 'off') return { label: 'Clocked out', color: 'default' as const };
    return { label: '…', color: 'default' as const };
  };

  if (isLoading) {
    return <LoadingSkeleton height={240} />;
  }

  return (
    <Box sx={{ width: '100%', overflow: 'hidden', borderTop: '1px solid', borderColor: theme.palette.grey[100] }}>
      {children && children}
      <TableContainer sx={{ maxHeight: !maxHeight ? 400 : maxHeight }}>
        <Table stickyHeader aria-label="sticky table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell key={column.id} style={{ minWidth: column.minWidth }} align={column.align || 'left'}>
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
              const status = getEmployeeStatus(row);

              return (
                <TableRow hover key={row.id}>
                  <TableCell size="small">
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Avatar alt={row.last_name?.[0] || row.first_name?.[0]} src={getImageUrl(`${row.first_name}`, ImagePath.USERS)} />
                      <Stack>
                        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark' }}>
                            {row.first_name} {row.last_name}
                          </Typography>
                        </Stack>
                        <Typography noWrap sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {row.title || 'N/A'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone ? formatPhoneNo(row.phone) : 'N/A'}</TableCell>
                  <TableCell align="right">{row.rate ? dollarFormat.format(row.rate) : 'N/A'}</TableCell>
                  <TableCell align="right">{row.total_hours !== undefined ? `${row.total_hours.toFixed(2)} hrs` : 'N/A'}</TableCell>
                  <TableCell align="right">{row.total_spend !== undefined ? dollarFormat.format(row.total_spend) : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip
                      label={status.label}
                      size="small"
                      color={status.color}
                      variant={status.color === 'success' ? 'light' : 'outlined'}
                      sx={{ height: 22, fontSize: '0.75rem', fontWeight: 600 }}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        rowsPerPageOptions={[10, 25, 100]}
        component="div"
        count={employees.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={handleChangePage}
        onRowsPerPageChange={handleChangeRowsPerPage}
      />
    </Box>
  );
}
