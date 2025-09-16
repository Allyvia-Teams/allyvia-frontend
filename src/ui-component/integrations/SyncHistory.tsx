import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Pagination,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert
} from '@mui/material';
import { SquareWebhookEvent } from 'types/entities';

interface SyncHistoryProps {
  provider: 'square' | 'quickbooks';
  events: SquareWebhookEvent[];
  meta: {
    total: number;
    limit: number;
    offset: number;
  };
  loading: boolean;
  onRefresh: () => void;
}

const SyncHistory: React.FC<SyncHistoryProps> = ({
  provider,
  events,
  meta,
  loading,
  onRefresh
}) => {
  const [statusFilter, setStatusFilter] = useState<string>('');

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'processed':
        return 'success';
      case 'processing':
        return 'info';
      case 'error':
        return 'error';
      case 'deadletter':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getEventTypeIcon = (eventType: string) => {
    if (eventType.includes('payment')) return '💳';
    if (eventType.includes('refund')) return '↩️';
    if (eventType.includes('inventory')) return '📦';
    if (eventType.includes('catalog')) return '📋';
    return '📄';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    // In a real implementation, you'd trigger a new API call with the filter
  };

  const handlePageChange = (event: any, page: number) => {
    // In a real implementation, you'd trigger a new API call with the new page
    console.log('Page changed to:', page);
  };

  const totalPages = Math.ceil(meta.total / meta.limit);

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h6">
          Sync History - {provider === 'square' ? 'Square' : 'QuickBooks'}
        </Typography>
        <Box display="flex" gap={2}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={statusFilter}
              onChange={handleStatusFilterChange}
              label="Status"
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="processed">Processed</MenuItem>
              <MenuItem value="processing">Processing</MenuItem>
              <MenuItem value="error">Error</MenuItem>
              <MenuItem value="deadletter">Dead Letter</MenuItem>
            </Select>
          </FormControl>
          <Button 
            variant="outlined" 
            onClick={onRefresh}
            disabled={loading}
          >
            {loading ? <CircularProgress size={20} /> : 'Refresh'}
          </Button>
        </Box>
      </Box>

      {loading && events.length === 0 ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={4}>
          <CircularProgress />
          <Typography variant="body1" sx={{ ml: 2 }}>
            Loading sync history...
          </Typography>
        </Box>
      ) : events.length === 0 ? (
        <Alert severity="info">
          No sync events found. Events will appear here once your {provider} integration starts syncing data.
        </Alert>
      ) : (
        <>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Event</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Retries</TableCell>
                  <TableCell>Date</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <span>{getEventTypeIcon(event.event_type)}</span>
                        <Typography variant="body2">
                          {event.event_type}
                        </Typography>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {event.operation || 'N/A'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={event.status} 
                        size="small" 
                        color={getStatusColor(event.status) as any}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {event.retry_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {formatDate(event.created_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {totalPages > 1 && (
            <Box display="flex" justifyContent="center" mt={3}>
              <Pagination
                count={totalPages}
                page={Math.floor(meta.offset / meta.limit) + 1}
                onChange={handlePageChange}
                color="primary"
              />
            </Box>
          )}

          <Box mt={2}>
            <Typography variant="body2" color="textSecondary">
              Showing {events.length} of {meta.total} events
            </Typography>
          </Box>
        </>
      )}

      <Box mt={3}>
        <Typography variant="body2" color="textSecondary">
          <strong>Note:</strong> Sync events show the status of data synchronization between 
          {provider === 'square' ? ' Square' : ' QuickBooks'} and Allyvia. 
          Processed events indicate successful data sync, while errors may require attention.
        </Typography>
      </Box>
    </Box>
  );
};

export default SyncHistory;
