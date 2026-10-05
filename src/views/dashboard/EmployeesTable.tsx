import * as React from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Avatar from 'ui-component/extended/Avatar';
import { useTheme } from '@mui/material';
import Chip from '@mui/material/Chip';

import { employeeInitials, formatHours } from './employeeDisplay';
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
  employees: EmployeeListItem[];
  isLoading?: boolean;
  /** Per-employee clock status from useClockStatuses; missing = still loading. */
  statuses: Record<string, ClockStatus>;
}

export default function EmployeesTable({ children, employees, isLoading = false, statuses }: EmployeesTableProps) {
  const theme = useTheme();
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
      <TableContainer>
        <Table size="small" aria-label="Active employees" sx={{ '& th': { whiteSpace: 'nowrap' } }}>
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <TableCell
                  key={column.id}
                  sx={{
                    minWidth: column.minWidth,
                    display: column.id === 'email' || column.id === 'phone' ? { xs: 'none', lg: 'table-cell' } : undefined
                  }}
                  align={column.align || 'left'}
                >
                  {column.label}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length}>No active employees.</TableCell>
              </TableRow>
            )}
            {employees.map((row) => {
              const status = getEmployeeStatus(row);

              return (
                <TableRow hover key={row.id}>
                  <TableCell size="small">
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Avatar alt={`${row.first_name} ${row.last_name}`}>
                        {employeeInitials(row.first_name || '', row.last_name || '')}
                      </Avatar>
                      <Stack>
                        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                          <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: 'text.dark' }}>
                            {row.first_name} {row.last_name}
                          </Typography>
                        </Stack>
                        <Typography noWrap sx={{ fontSize: '0.8125rem', color: 'text.secondary' }}>
                          {row.title || '—'}
                        </Typography>
                        <Typography sx={{ display: { xs: 'block', lg: 'none' }, fontSize: '0.75rem', overflowWrap: 'anywhere' }}>
                          {row.email || '—'} · {row.phone ? formatPhoneNo(row.phone) : '—'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ overflowWrap: 'anywhere', display: { xs: 'none', lg: 'table-cell' } }}>{row.email || '—'}</TableCell>
                  <TableCell sx={{ display: { xs: 'none', lg: 'table-cell' } }}>{row.phone ? formatPhoneNo(row.phone) : '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.rate === 0 ? 'Not set' : row.rate == null ? '—' : dollarFormat.format(row.rate)}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    {row.total_hours !== undefined ? formatHours(row.total_hours * 3600) : '—'}
                  </TableCell>
                  <TableCell align="right">{row.total_spend !== undefined ? dollarFormat.format(row.total_spend) : '—'}</TableCell>
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
    </Box>
  );
}
