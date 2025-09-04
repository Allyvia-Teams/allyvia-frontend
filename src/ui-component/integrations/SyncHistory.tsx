import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Chip, Box, Typography, Alert } from '@mui/material';
import { IconCircleCheck, IconCircleX, IconClock } from '@tabler/icons-react';
import { useSelector } from 'store';
import { useTheme } from '@mui/material/styles';

export default function SyncHistory() {
  const theme = useTheme();
  const { syncHistory } = useSelector((state) => state.integrations.quickbooks);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <IconCircleCheck size={16} />;
      case 'failed':
        return <IconCircleX size={16} />;
      case 'pending':
        return <IconClock size={16} />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return theme.palette.success.main;
      case 'failed':
        return theme.palette.error.main;
      case 'pending':
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

  if (syncHistory.length === 0) {
    return (
      <Box>
        <Alert severity="info">
          No sync history available. Sync activities will appear here once you start syncing data with QuickBooks.
        </Alert>
        <Box sx={{ mt: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: `1px solid ${theme.palette.divider}` }}>
          <Typography variant="h5" gutterBottom>
            Demo Sync Events
          </Typography>
          <Typography variant="body2" color="textSecondary" paragraph>
            In production, this section will display:
          </Typography>
          <Box component="ul" sx={{ m: 0, pl: 3 }}>
            <Typography component="li" variant="body2" color="textSecondary">
              Real-time sync status for invoices, payments, and expenses
            </Typography>
            <Typography component="li" variant="body2" color="textSecondary">
              Webhook events from QuickBooks
            </Typography>
            <Typography component="li" variant="body2" color="textSecondary">
              Detailed error messages and retry attempts
            </Typography>
            <Typography component="li" variant="body2" color="textSecondary">
              Data reconciliation reports
            </Typography>
          </Box>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Status</TableCell>
              <TableCell>Activity</TableCell>
              <TableCell>Records</TableCell>
              <TableCell>Timestamp</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {syncHistory.map((entry) => (
              <TableRow key={entry.id}>
                <TableCell>
                  <Chip
                    icon={getStatusIcon(entry.status)}
                    label={entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor(entry.status)}15`,
                      color: getStatusColor(entry.status),
                      '& .MuiChip-icon': {
                        color: getStatusColor(entry.status)
                      }
                    }}
                  />
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.message}</Typography>
                </TableCell>
                <TableCell>
                  {entry.recordsProcessed !== undefined ? (
                    <Typography variant="body2">{entry.recordsProcessed} records</Typography>
                  ) : (
                    <Typography variant="body2" color="textSecondary">
                      -
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="textSecondary">
                    {formatTimestamp(entry.timestamp)}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Box sx={{ mt: 2 }}>
        <Typography variant="caption" color="textSecondary">
          Showing last 10 sync activities. Older activities are automatically archived.
        </Typography>
      </Box>
    </Box>
  );
}
