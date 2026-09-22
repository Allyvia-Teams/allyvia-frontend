import { useState } from 'react';
import useSWR from 'swr';

import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { IconHistory } from '@tabler/icons-react';

import SettingsSectionCard from './SettingsSectionCard';
import { getAuditLog } from 'api/settings';
import { AuditLogFilters } from 'types/settings';

const ACTION_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '', label: 'All actions' },
  { value: 'password.changed', label: 'Password changed' },
  { value: 'role.updated', label: 'Role updated' },
  { value: 'role.deleted', label: 'Role deleted' },
  { value: 'company.updated', label: 'Company updated' },
  { value: 'invitation.sent', label: 'Invitation sent' },
  { value: 'invitation.accepted', label: 'Invitation accepted' },
  { value: '2fa.enabled', label: '2FA enabled' },
  { value: '2fa.disabled', label: '2FA disabled' }
];

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
};

const summarizeChanges = (changes: Record<string, unknown>): string => {
  if (!changes || typeof changes !== 'object') return '—';
  const keys = Object.keys(changes);
  if (keys.length === 0) return '—';
  return keys.slice(0, 3).join(', ') + (keys.length > 3 ? `, +${keys.length - 3} more` : '');
};

export default function AuditLog() {
  const [filters, setFilters] = useState<AuditLogFilters>({ page: 1, page_size: 25 });
  const [error, setError] = useState<string | null>(null);

  const key = ['audit-log', filters.action, filters.start_date, filters.end_date, filters.page, filters.page_size].join('|');
  const { data, isLoading } = useSWR(key, async () => {
    try {
      setError(null);
      return await getAuditLog(filters);
    } catch (e: any) {
      const msg = e?.response?.data?.detail || e?.response?.data?.error || 'Failed to load audit log.';
      setError(msg);
      throw e;
    }
  });

  const handleAction = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, action: e.target.value || undefined, page: 1 }));
  };

  const handleDateChange = (field: 'start_date' | 'end_date') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, [field]: e.target.value || undefined, page: 1 }));
  };

  const handlePageChange = (_: unknown, newPage: number) => {
    setFilters((prev) => ({ ...prev, page: newPage + 1 }));
  };

  const handlePageSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters((prev) => ({ ...prev, page_size: parseInt(e.target.value, 10), page: 1 }));
  };

  const items = data?.items || [];
  const pagination = data?.pagination;

  return (
    <SettingsSectionCard
      title="Audit Log"
      description="A record of settings and team changes across your company"
      icon={<IconHistory size={24} stroke={1.5} />}
    >
      <Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
          <TextField select label="Action" value={filters.action || ''} onChange={handleAction} size="small" sx={{ minWidth: 200 }}>
            {ACTION_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="From"
            type="date"
            value={filters.start_date || ''}
            onChange={handleDateChange('start_date')}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            value={filters.end_date || ''}
            onChange={handleDateChange('end_date')}
            size="small"
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        {isLoading ? (
          <Box>
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} sx={{ mb: 1 }} />
            <Skeleton variant="rounded" height={44} />
          </Box>
        ) : items.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No entries match your filters.
          </Typography>
        ) : (
          <TableContainer sx={{ border: (t) => `1px solid ${t.palette.divider}`, borderRadius: 1 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>User</TableCell>
                  <TableCell>Action</TableCell>
                  <TableCell>Target</TableCell>
                  <TableCell>Changes</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>{formatDateTime(entry.created_at)}</TableCell>
                    <TableCell>{entry.user_email}</TableCell>
                    <TableCell>{entry.action}</TableCell>
                    <TableCell>{entry.target_type}</TableCell>
                    <TableCell>{summarizeChanges(entry.changes as Record<string, unknown>)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {pagination && pagination.total_items > 0 && (
          <TablePagination
            component="div"
            count={pagination.total_items}
            page={pagination.current_page - 1}
            onPageChange={handlePageChange}
            rowsPerPage={pagination.page_size}
            onRowsPerPageChange={handlePageSizeChange}
            rowsPerPageOptions={[10, 25, 50, 100]}
          />
        )}
      </Box>
    </SettingsSectionCard>
  );
}
