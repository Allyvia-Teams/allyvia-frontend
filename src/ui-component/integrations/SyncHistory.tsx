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
import { fetchQBSyncHistory, fetchWebhookEvents, fetchSquareSyncHistory, retryWebhookEvent } from 'store/slices/integrations';

interface SyncHistoryProps {
  source: 'square' | 'quickbooks';
  companyId: string;
}

export default function SyncHistory({ source, companyId }: SyncHistoryProps) {
  const theme = useTheme();
  const dispatch = useDispatch();
  const quickbooks = useSelector((state) => state.integrations.quickbooks);
  const square = useSelector((state) => state.integrations.square);

  const isQuickBooks = source === 'quickbooks';
  const records = isQuickBooks ? quickbooks.qbSync.records : square.syncHistory;
  const webhooks = quickbooks.webhooks;
  const syncLoading = isQuickBooks ? quickbooks.qbSync.isLoading : false;
  const webhooksLoading = isQuickBooks ? quickbooks.webhooks.isLoading : false;

  const hasInitialLoadCompleted = useRef(false);

  useEffect(() => {
    if (!companyId) return;

    if (source === 'quickbooks') {
      Promise.all([dispatch(fetchQBSyncHistory({ companyId, params: {} })), dispatch(fetchWebhookEvents({ companyId, params: {} }))]).then(
        () => {
          hasInitialLoadCompleted.current = true;
        }
      );

      const interval = setInterval(() => {
        dispatch(fetchWebhookEvents({ companyId, params: {} }));
      }, 10000);

      return () => clearInterval(interval);
    }

    dispatch(fetchSquareSyncHistory(companyId)).then(() => {
      hasInitialLoadCompleted.current = true;
    });
  }, [dispatch, companyId, source]);

  const handleRetryWebhook = (eventId: string) => {
    dispatch(retryWebhookEvent(eventId));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
      case 'processed':
      case 'completed':
        return <IconCircleCheck size={16} />;
      case 'failed':
      case 'error':
      case 'deadletter':
        return <IconCircleX size={16} />;
      case 'pending':
      case 'processing':
      case 'received':
      case 'in_progress':
        return <IconClock size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
      case 'processed':
      case 'completed':
        return theme.palette.success.main;
      case 'failed':
      case 'error':
      case 'deadletter':
        return theme.palette.error.main;
      case 'pending':
      case 'processing':
      case 'received':
      case 'in_progress':
        return theme.palette.warning.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    return date.toLocaleDateString();
  };

  if (!companyId) {
    return <Alert severity="warning">Please select a company to view sync history.</Alert>;
  }

  const hasWebhookEvents = isQuickBooks && webhooks.events && webhooks.events.length > 0;
  const hasSyncRecords = records && records.length > 0;

  if (!hasInitialLoadCompleted.current && (syncLoading || webhooksLoading)) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!hasWebhookEvents && !hasSyncRecords && !syncLoading && !webhooksLoading) {
    return (
      <Box>
        <Alert severity="info">
          No sync history available. Sync activities will appear here once{' '}
          {isQuickBooks ? 'QuickBooks starts sending webhook events' : 'Square runs its first sync'}.
        </Alert>
      </Box>
    );
  }

  return (
    <Box>
      {isQuickBooks && webhooks.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {webhooks.error}
        </Alert>
      )}

      {hasWebhookEvents && (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Webhook Events
          </Typography>
          <TableContainer component={Paper} sx={{ mb: 3, maxHeight: 600, overflow: 'auto' }}>
            <Table stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Event Type</TableCell>
                  <TableCell>Operation</TableCell>
                  <TableCell>Retries</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {webhooks.events.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(event.status) || undefined}
                        label={event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(event.status)}15`,
                          color: getStatusColor(event.status),
                          '& .MuiChip-icon': {
                            color: getStatusColor(event.status)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.event_type || 'Unknown'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={event.operation || 'N/A'}
                        size="small"
                        variant="outlined"
                        sx={{
                          borderColor:
                            event.operation === 'Delete'
                              ? theme.palette.error.main
                              : event.operation === 'Create'
                                ? theme.palette.success.main
                                : event.operation === 'Update'
                                  ? theme.palette.info.main
                                  : event.operation === 'Emailed'
                                    ? theme.palette.warning.main
                                    : event.operation === 'Void'
                                      ? theme.palette.secondary.main
                                      : theme.palette.grey[400],
                          color:
                            event.operation === 'Delete'
                              ? theme.palette.error.main
                              : event.operation === 'Create'
                                ? theme.palette.success.main
                                : event.operation === 'Update'
                                  ? theme.palette.info.main
                                  : event.operation === 'Emailed'
                                    ? theme.palette.warning.main
                                    : event.operation === 'Void'
                                      ? theme.palette.secondary.main
                                      : theme.palette.grey[600]
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{event.retry_count}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {formatTimestamp(event.created_at)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      {(event.status === 'error' || event.status === 'deadletter') && (
                        <Button
                          size="small"
                          startIcon={<IconRefresh size={14} />}
                          onClick={() => handleRetryWebhook(event.id)}
                          sx={{ textTransform: 'none' }}
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
        </>
      )}

      {hasSyncRecords && (
        <>
          <Typography variant="h5" sx={{ mb: 2 }}>
            Sync History
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Status</TableCell>
                  <TableCell>Entity Type</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Updated</TableCell>
                  <TableCell>Errors</TableCell>
                  <TableCell>Started</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {records.map((sync) => (
                  <TableRow key={sync.id}>
                    <TableCell>
                      <Chip
                        icon={getStatusIcon(sync.status) || undefined}
                        label={sync.status.charAt(0).toUpperCase() + sync.status.slice(1)}
                        size="small"
                        sx={{
                          bgcolor: `${getStatusColor(sync.status)}15`,
                          color: getStatusColor(sync.status),
                          '& .MuiChip-icon': {
                            color: getStatusColor(sync.status)
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{sync.entity_type}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{sync.created_count}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{sync.updated_count}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color={sync.error_count > 0 ? 'error' : 'textSecondary'}>
                        {sync.error_count}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="textSecondary">
                        {formatTimestamp(sync.started_at)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          {source === 'quickbooks'
            ? 'Auto-refreshing every 10 seconds. Showing recent webhook events and sync activities.'
            : 'Showing recent sync activities.'}
        </Typography>
      </Box>
    </Box>
  );
}
