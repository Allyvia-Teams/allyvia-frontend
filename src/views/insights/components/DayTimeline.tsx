import { Box, Typography, Chip, Paper } from '@mui/material';
import { IconAlertCircle, IconAlertTriangle } from '@tabler/icons-react';
import { DailyInsight } from 'types/analytics';
import { formatDateOnly } from 'utils/dateUtils';
import { getWeatherIcon } from 'utils/weatherIcons';

interface DayTimelineProps {
  days: DailyInsight[];
  selectedDay: number;
  onSelectDay: (index: number) => void;
}

// Get high and low temperatures from forecast data
const getTemperatureRange = (day: DailyInsight): { high: string; low: string } => {
  if (day.weather_info?.temp_high !== undefined && day.weather_info?.temp_low !== undefined) {
    return {
      high: `${Math.round(day.weather_info.temp_high)}°F`,
      low: `${Math.round(day.weather_info.temp_low)}°F`
    };
  }

  return { high: '--°F', low: '--°F' };
};

export default function DayTimeline({ days, selectedDay, onSelectDay }: DayTimelineProps) {
  console.log(days, 'days');
  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 1.5,
        overflowY: 'auto',
        overflowX: 'visible',
        px: 1,
        py: 1,
        position: 'relative',
        '&::-webkit-scrollbar': {
          width: 6
        },
        '&::-webkit-scrollbar-track': {
          bgcolor: 'background.default'
        },
        '&::-webkit-scrollbar-thumb': {
          bgcolor: 'divider',
          borderRadius: 1
        }
      }}
    >
      {days.map((day, index) => {
        const isSelected = selectedDay === index;
        const alerts = day.critical_alerts || [];

        // Categorize alerts by urgency
        const urgentAlerts = alerts.filter((a) => a.urgency === 'URGENT');
        const warningAlerts = alerts.filter((a) => a.urgency === 'WARNING');
        const infoAlerts = alerts.filter((a) => a.urgency === 'INFO');

        const weatherIcon = getWeatherIcon(day.weather_info?.dominant_condition || day.day_summary);
        const temps = getTemperatureRange(day);

        return (
          <Box
            key={index}
            sx={{
              width: '100%',
              height: 70,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              px: 1,
              flexShrink: 0,
              overflow: 'visible'
            }}
          >
            <Paper
              elevation={isSelected ? 4 : 1}
              onClick={() => onSelectDay(index)}
              sx={{
                width: '100%',
                height: '100%',
                p: 1,
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
                border: 2,
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'action.selected' : 'background.paper',
                transition: 'all 0.2s ease-in-out',
                position: 'relative',
                zIndex: 1,
                transformOrigin: 'center center',
                overflow: 'visible',
                '&:hover': {
                  bgcolor: 'action.hover',
                  boxShadow: 4,
                  borderColor: isSelected ? 'primary.main' : 'primary.light',
                  zIndex: 10,
                  '& > *': {
                    transform: 'none'
                  }
                }
              }}
            >
              {/* Alert Badges - Top Right Corner */}
              {(urgentAlerts.length > 0 || warningAlerts.length > 0) && (
                <Box
                  sx={{
                    position: 'absolute',
                    top: -8,
                    right: -8,
                    display: 'flex',
                    alignItems: 'center',
                    gap: urgentAlerts.length > 0 && warningAlerts.length > 0 ? 0.75 : 1,
                    px: urgentAlerts.length > 0 && warningAlerts.length > 0 ? 0.75 : 1,
                    py: urgentAlerts.length > 0 && warningAlerts.length > 0 ? 0.4 : 0.5,
                    borderRadius: '12px',
                    bgcolor: 'background.paper',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
                    border: '1.5px solid',
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    zIndex: 2
                  }}
                >
                  {urgentAlerts.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.2
                      }}
                    >
                      <Box sx={{ color: 'error.main', display: 'flex', alignItems: 'center' }}>
                        <IconAlertCircle size={urgentAlerts.length > 0 && warningAlerts.length > 0 ? 12 : 14} stroke={2.5} />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: urgentAlerts.length > 0 && warningAlerts.length > 0 ? '0.65rem' : '0.7rem',
                          fontWeight: 700,
                          color: 'error.main',
                          lineHeight: 1
                        }}
                      >
                        {urgentAlerts.length}
                      </Typography>
                    </Box>
                  )}
                  {warningAlerts.length > 0 && (
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.2
                      }}
                    >
                      <Box sx={{ color: '#ed6c02', display: 'flex', alignItems: 'center' }}>
                        <IconAlertTriangle size={urgentAlerts.length > 0 && warningAlerts.length > 0 ? 12 : 14} stroke={2.5} />
                      </Box>
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: urgentAlerts.length > 0 && warningAlerts.length > 0 ? '0.65rem' : '0.7rem',
                          fontWeight: 700,
                          color: '#ed6c02',
                          lineHeight: 1
                        }}
                      >
                        {warningAlerts.length}
                      </Typography>
                    </Box>
                  )}
                </Box>
              )}

              {/* Left: Day and Date */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {formatDateOnly(day.date, 'weekDate').split(',')[0]}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary' }}>
                  {formatDateOnly(day.date, 'MMM dd')}
                </Typography>
              </Box>

              {/* Center: Weather Icon */}
              <Typography variant="h5" sx={{ fontSize: '1.5rem', lineHeight: 1 }}>
                {weatherIcon}
              </Typography>

              {/* Right: Temperature Range */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', flex: 1, minWidth: 0 }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary', lineHeight: 1 }}>
                  {temps.high}
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.secondary', lineHeight: 1 }}>
                  {temps.low}
                </Typography>
              </Box>
            </Paper>
          </Box>
        );
      })}
    </Box>
  );
}
