import { Box, Typography, Chip } from '@mui/material';
import { IconAlertCircle } from '@tabler/icons-react';
import { CriticalAlert } from 'types/analytics';
import AlertBadge from '../AlertBadge';

interface AlertsPanelProps {
  alerts: CriticalAlert[];
  onAlertClick: (alert: CriticalAlert) => void;
}

export default function AlertsPanel({ alerts, onAlertClick }: AlertsPanelProps) {
  // Count alerts by type
  const urgentCount = alerts?.filter((alert) => alert.urgency === 'URGENT').length || 0;
  const warningCount = alerts?.filter((alert) => alert.urgency === 'WARNING').length || 0;
  const infoCount = alerts?.filter((alert) => alert.urgency === 'INFO').length || 0;

  return (
    <Box
      sx={{
        p: 2.5,
        bgcolor: 'background.paper',
        borderRadius: 1,
        border: 1,
        borderColor: 'divider',
        height: '100%',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Box sx={{ mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 36,
                height: 36,
                borderRadius: 1.5,
                bgcolor: 'white',
                color: alerts && alerts.length > 0 ? 'error.main' : 'grey.500',
                border: 1,
                borderColor: alerts && alerts.length > 0 ? 'error.main' : 'grey.300'
              }}
            >
              <IconAlertCircle size={20} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
              Alerts
            </Typography>
          </Box>
          {alerts && alerts.length > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {urgentCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'error.main'
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                    {urgentCount} Urgent
                  </Typography>
                </Box>
              )}
              {warningCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'warning.main'
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                    {warningCount} Warning
                  </Typography>
                </Box>
              )}
              {infoCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: 'info.main'
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                    {infoCount} Info
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
      {alerts && alerts.length > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {alerts.map((alert, index) => (
            <Box
              key={index}
              onClick={() => onAlertClick(alert)}
              sx={{
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                '&:hover': {
                  transform: 'translateX(2px)'
                }
              }}
            >
              <AlertBadge alert={alert} />
            </Box>
          ))}
        </Box>
      ) : (
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1
          }}
        >
          <Typography variant="body2" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
            No critical alerts
          </Typography>
        </Box>
      )}
    </Box>
  );
}
