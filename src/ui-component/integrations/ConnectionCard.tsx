import { Card, CardContent, Grid, Typography, Box, Chip } from '@mui/material';
import { IconCircleCheck, IconCircleX, IconClock, IconRefresh } from '@tabler/icons-react';
import { useSelector } from 'store';
import { useTheme } from '@mui/material/styles';
import QuickBooksIcon from 'assets/images/icons/quickbooks_logo.png';

export default function ConnectionCard() {
  const theme = useTheme();
  const { quickbooks } = useSelector((state) => state.integrations);
  const { connection } = quickbooks;

  const getStatusIcon = () => {
    switch (connection.status) {
      case 'connected':
        return <IconCircleCheck size={24} color={theme.palette.success.main} />;
      case 'expired':
        return <IconClock size={24} color={theme.palette.warning.main} />;
      case 'refreshing':
        return <IconRefresh size={24} color={theme.palette.info.main} />;
      default:
        return <IconCircleX size={24} color={theme.palette.error.main} />;
    }
  };

  const getStatusColor = () => {
    switch (connection.status) {
      case 'connected':
        return theme.palette.success.main;
      case 'expired':
        return theme.palette.warning.main;
      case 'refreshing':
        return theme.palette.info.main;
      default:
        return theme.palette.error.main;
    }
  };

  const getStatusText = () => {
    switch (connection.status) {
      case 'connected':
        return 'Connected';
      case 'expired':
        return 'Token Expired';
      case 'refreshing':
        return 'Refreshing...';
      default:
        return 'Not Connected';
    }
  };

  const formatLastSync = (lastAuth: string | null) => {
    if (!lastAuth) return 'Never';
    const date = new Date(lastAuth);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    if (isToday) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <Card>
      <CardContent>
        <Grid container spacing={3}>
          <Grid size={12}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <img src={QuickBooksIcon} alt="QuickBooks" style={{ height: 40 }} />
              <Box>
                <Typography variant="h4">QuickBooks Online</Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                  {getStatusIcon()}
                  <Chip
                    label={getStatusText()}
                    size="small"
                    sx={{
                      bgcolor: `${getStatusColor()}15`,
                      color: getStatusColor(),
                      fontWeight: 'medium'
                    }}
                  />
                </Box>
              </Box>
            </Box>
          </Grid>

          {connection.status === 'connected' && (
            <Grid size={12}>
              <Box
                sx={{
                  bgcolor: theme.palette.mode === 'dark' ? 'grey.800' : 'grey.50',
                  borderRadius: 1,
                  p: 2
                }}
              >
                <Typography variant="body2" color="textSecondary">
                  Last synced: <strong>{formatLastSync(connection.lastAuth)}</strong>
                </Typography>
              </Box>
            </Grid>
          )}
        </Grid>
      </CardContent>
    </Card>
  );
}
