import { Box, Typography, Chip } from '@mui/material';
import { IconAlertCircle } from '@tabler/icons-react';
import { CriticalAlert } from 'types/analytics';
import AlertBadge from '../AlertBadge';
import { COLORS } from 'styles/colors';

interface AlertsPanelProps {
  alerts: CriticalAlert[];
  onAlertClick: (alert: CriticalAlert) => void;
}

export default function AlertsPanel({ alerts, onAlertClick }: AlertsPanelProps) {
  // Display all alerts from backend (URGENT and WARNING) - backend filters based on actionable impact
  const alertList = alerts || [];
  const urgentCount = alertList.filter((a) => a.urgency === 'URGENT').length;
  const warningCount = alertList.filter((a) => a.urgency === 'WARNING').length;
  const alertCount = alertList.length;
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
                color: alertCount > 0 ? COLORS.badRed : 'grey.500',
                border: 1,
                borderColor: alertCount > 0 ? COLORS.badRed : 'grey.300'
              }}
            >
              <IconAlertCircle size={20} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 600, color: 'text.primary', m: 0 }}>
              Critical Alerts
            </Typography>
          </Box>
          {alertCount > 0 && (
            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
              {urgentCount > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box
                    sx={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      bgcolor: COLORS.badRed
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
                      bgcolor: COLORS.orange500
                    }}
                  />
                  <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 500, fontSize: '0.8rem' }}>
                    {warningCount} Warning
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </Box>
      </Box>
      {alertCount > 0 ? (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {alertList.map((alert, index) => (
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
