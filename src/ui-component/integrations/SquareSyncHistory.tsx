import { useEffect, useRef } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Box,
  Typography,
  Alert,
  Button,
  CircularProgress
} from '@mui/material';
import { IconCircleCheck, IconCircleX, IconClock, IconRefresh } from '@tabler/icons-react';
import { useSelector, useDispatch } from 'store';
import { useTheme } from '@mui/material/styles';
import { fetchSquareWebhookEvents } from 'store/slices/integrations';

interface SquareSyncHistoryProps {
  events?: any[];
  meta?: any;
  loading?: boolean;
  onRefresh?: () => void;
}

export default function SquareSyncHistory({ events = [], meta = {}, loading = false, onRefresh }: SquareSyncHistoryProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const { currentRole } = useSelector((state) => state.auth);
  const companyId = currentRole?.company_id;
  const hasInitialLoadCompleted = useRef(false);

  useEffect(() => {
    if (companyId && !hasInitialLoadCompleted.current) {
      dispatch(
        fetchSquareWebhookEvents({
          companyId,
          status: undefined,
          limit: 20,
          offset: 0
        }) as any
      );
      hasInitialLoadCompleted.current = true;
    }
  }, [dispatch, companyId]);

  const getStatusIcon = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return <IconCircleCheck size={20} color={theme.palette.success.main} />;
      case 'failed':
      case 'error':
        return <IconCircleX size={20} color={theme.palette.error.main} />;
      case 'pending':
      case 'processing':
        return <IconClock size={20} color={theme.palette.warning.main} />;
      default:
        return <IconClock size={20} color={theme.palette.grey[500]} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'success':
      case 'completed':
        return 'success';
      case 'failed':
      case 'error':
        return 'error';
      case 'pending':
      case 'processing':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const handleRefresh = () => {
    if (onRefresh) {
      onRefresh();
    } else if (companyId) {
      dispatch(
        fetchSquareWebhookEvents({
          companyId,
          status: undefined,
          limit: 20,
          offset: 0
        }) as any
      );
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading sync history...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Square Sync History
        </Typography>
        <Button variant="outlined" startIcon={<IconRefresh />} onClick={handleRefresh} disabled={loading}>
          Refresh
        </Button>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        View the history of Square data synchronization events. This shows when data was synced from Square to Allyvia.
      </Alert>

      {events && events.length > 0 ? (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Event Type</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Timestamp</TableCell>
                <TableCell>Details</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {events.map((event, index) => (
                <TableRow key={event.id || index}>
                  <TableCell>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {event.event_type || event.type || 'Unknown'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {getStatusIcon(event.status)}
                      <Chip label={event.status || 'Unknown'} color={getStatusColor(event.status) as any} size="small" />
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(event.created_at || event.timestamp)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {event.description || event.message || 'No details available'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    {event.status?.toLowerCase() === 'failed' && (
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<IconRefresh />}
                        onClick={() => {
                          // Handle retry logic here
                          console.log('Retry event:', event.id);
                        }}
                      >
                        Retry
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <IconClock size={48} color={theme.palette.grey[400]} />
          <Typography variant="h6" color="text.secondary" sx={{ mt: 2, mb: 1 }}>
            No sync history available
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Sync activities will appear here once Square starts sending webhook events.
          </Typography>
        </Box>
      )}

      {meta && (
        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
          <Typography variant="body2" color="text.secondary">
            Showing {events?.length || 0} of {meta.total || 0} events
          </Typography>
        </Box>
      )}
    </Box>
  );
}
