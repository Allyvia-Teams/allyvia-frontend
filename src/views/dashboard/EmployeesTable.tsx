import * as React from 'react';
import { useEffect, useState } from 'react';
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

import { ImagePath, getImageUrl } from 'utils/getImageUrl';
import { LoadingSkeleton } from 'ui-component/UISkeleton';
import { xLargeWidgetHeight } from 'store/constant';
import { EmployeeListItem } from 'types/employee';
import { getCurrentUserClockStatus } from '../../api/employee.api';

const dollarFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatPhoneNo = (value: string) => {
  if (!value || value.length < 10) return value;
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

interface EmployeesTableProps {
  children?: React.ReactElement;
  maxHeight?: number | string;
  employees: EmployeeListItem[];
  isLoading?: boolean;
  // companyId: string;
  // Optional: pass schedule data if you need to determine Absent/Unscheduled
  scheduleData?: Record<string, boolean>; // employeeId -> isScheduled today
}

export default function EmployeesTable({ children, maxHeight, employees, isLoading = false }: EmployeesTableProps) {
  const theme = useTheme();
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [employeeStatuses, setEmployeeStatuses] = useState<Record<string, boolean>>({});

  // Fetch clock status for all employees
  useEffect(() => {
    const fetchStatuses = async () => {
      const statusMap: Record<string, boolean> = {};
      for (const employee of employees) {
        try {
          if (employee.status === 'inactive') continue;
          const response = await getCurrentUserClockStatus(employee.id);
          // If response.data is not empty string, employee is clocked in
          statusMap[employee.id] = response.data !== '';
        } catch (error) {
          console.error(`Error fetching status for employee ${employee.id}:`, error);
          statusMap[employee.id] = false;
        }
      }

      setEmployeeStatuses(statusMap);
    };

    if (employees.length > 0) {
      fetchStatuses();
    }
  }, [employees]);

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(+event.target.value);
    setPage(0);
  };

  const getEmployeeStatus = (employee: EmployeeListItem) => {
    const isClockedIn = employeeStatuses[employee.id];

    // Check if employee has a status field that maps to specific statuses
    // Assuming the API might return a status or you determine it from other fields
    if (employee.status === 'inactive') {
      return { label: 'Inactive', color: 'default' as const };
    }

    // If clocked in
    if (isClockedIn) {
      return { label: 'Clocked In', color: 'success' as const };
    }

    return { label: 'Clocked Out', color: 'primary' as const };
  };

  if (isLoading) {
    return <LoadingSkeleton height={xLargeWidgetHeight} />;
  }

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden', border: 2, borderColor: theme.palette.divider }}>
      {children && children}
      <TableContainer sx={{ maxHeight: !maxHeight ? 400 : maxHeight }}>
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
            {employees.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((row, index) => {
              const status = getEmployeeStatus(row);

              return (
                <TableRow hover key={row.id}>
                  <TableCell size="small">
                    <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                      <Avatar alt={row.last_name?.[0] || row.first_name?.[0]} src={getImageUrl(`${row.first_name}`, ImagePath.USERS)} />
                      <Stack>
                        <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
                          <Typography variant="subtitle1">
                            {row.first_name} {row.last_name}
                          </Typography>
                        </Stack>
                        <Typography variant="subtitle2" noWrap>
                          {row.title || 'N/A'}
                        </Typography>
                      </Stack>
                    </Stack>
                  </TableCell>
                  <TableCell>{row.email}</TableCell>
                  <TableCell>{row.phone ? formatPhoneNo(row.phone) : 'N/A'}</TableCell>
                  <TableCell>{row.rate ? dollarFormat.format(row.rate) : 'N/A'}</TableCell>
                  <TableCell>
                    <Chip label={status.label} size="small" color={status.color} />
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
    </Paper>
  );
}
